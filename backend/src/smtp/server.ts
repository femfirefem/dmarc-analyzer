import { SMTPServer } from "smtp-server";
import { logger } from "../utils/logger.ts";
import { DmarcReportService } from "../services/dmarc-report.ts";
import type { SMTPServerDataStream, SMTPServerOptions, SMTPServerSession } from "npm:@types/smtp-server@3.5.10";
import { getReportAttachments, extractXmlFromAttachment, Attachment } from "../mime/helpers.ts";
import { parseAndValidateDmarcReport } from "../dmarc/parser.ts";
import { simpleParser, type ParsedMail } from "mailparser";
import { authenticate } from "mailauth";
import { DmarcSMTPServerOptions } from "./types.ts";
import { DmarcEmailSubject, DmarcReportFilename, parseDmarcReportFilename, parseDmarcReportSubject } from "../dmarc/helpers.ts";
import { DmarcReport } from "../dmarc/types.ts";
import { KnownReporterService } from "../services/known-reporter.ts";
import { UnknownReporterPolicy } from "./types.ts";

class CustomSMTPError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CustomSMTPError';
  }
}

export class DmarcSMTPServer {
  private server: SMTPServer;
  private port: number;
  private host: string;
  private strictSubject: boolean;
  private strictFilename: boolean;
  private validateDmarc: boolean;
  private dmarcReject: boolean;
  private reportService: DmarcReportService;
  private reporterService: KnownReporterService;
  private unknownReporterPolicy: UnknownReporterPolicy;
  
  constructor(options: DmarcSMTPServerOptions) {
    const smtpServerOptions: SMTPServerOptions = {
      onData: this.onData.bind(this),
      authOptional: true,
      disabledCommands: ['AUTH'],
      closeTimeout: options.closeTimeout ?? 30000
    };
    if (!options.tls) {
      smtpServerOptions.disabledCommands?.push('STARTTLS');
    }
    this.server = new SMTPServer(smtpServerOptions);
    this.port = options.port ?? 25;
    this.host = options.host ?? "0.0.0.0";
    this.strictSubject = options.strictSubject ?? true;
    this.strictFilename = options.strictFilename ?? true;
    this.validateDmarc = options.validateDmarc ?? true;
    this.dmarcReject = options.dmarcReject ?? true;
    this.reportService = options.reportService ?? new DmarcReportService();
    this.reporterService = options.reporterService ?? new KnownReporterService();
    this.unknownReporterPolicy = options.unknownReporterPolicy ?? UnknownReporterPolicy.ALLOW;
  }

  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.server.listen(this.port, this.host, () => {
          logger.info(`SMTP Server listening on ${this.host}:${this.port}`);
          resolve();
        });
      } catch (error) {
        logger.error('Failed to start SMTP server:', error);
        reject(error);
      }
    });
  }

  stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.server.close(() => {
          logger.info(`SMTP Server on ${this.host}:${this.port} closed`);
          resolve();
        });
      } catch (error) {
        logger.error('Failed to stop SMTP server:', error);
        reject(error);
      }
    });
  }

  onData(
    stream: SMTPServerDataStream, 
    session: SMTPServerSession,
    callback: (error?: Error) => void
  ): void {
    const chunks: Uint8Array[] = [];
    let chunklen = 0;
  
    stream.on('data', (chunk: Uint8Array) => {
      chunks.push(chunk);
      chunklen += chunk.length;
      logger.debug(`Received chunk: ${chunk.length} bytes from ${session.remoteAddress}:${session.remotePort}`);
    });
  
    const mailFrom = session.envelope?.mailFrom;
    stream.on('end', async () => {
      logger.debug(`Completed message reception: ${chunklen} bytes`, {
        id: session.id,
        from: mailFrom !== false ? mailFrom.address : undefined,
        to: session.envelope?.rcptTo.map(r => r.address).join(", "),
        client: `${session.clientHostname} [${session.remoteAddress}]`,
        secure: session.secure
      });
      
      try {
        const fullEmail = new TextDecoder().decode(
          new Uint8Array(chunks.flatMap(chunk => Array.from(chunk)))
        );

        await this.onDataComplete(session, fullEmail);

        callback();
      } catch (error) {
        logger.error(`Error processing email: ${error instanceof Error ? error.message : error}`, {
          sessionId: session.id,
          clientHostname: session.clientHostname,
          transmissionType: session.transmissionType,
          error,
        });
        callback(error instanceof CustomSMTPError ? error : new Error('Failed to process email'));
      }
    });
  
    stream.on('error', (error: Error) => {
      logger.error('Stream error:', {
        sessionId: session.id,
        error,
        clientHostname: session.clientHostname
      });
      callback(error);
    });
  } 

  async onDataComplete(session: SMTPServerSession, data: string): Promise<void> {
    if (this.validateDmarc) {
      await this.authenticateMessage(session, data, this.dmarcReject);
    }

    try {
      const parsedEmail = await this.parseMessage(session, data);

      const subject = parseDmarcReportSubject(parsedEmail.subject);
      if (!subject) {
        if (this.strictSubject) throw new CustomSMTPError('Invalid DMARC report email subject');
        logger.warn('Invalid DMARC report email subject', {
          sessionId: session.id,
          messageId: parsedEmail.messageId,
        });
      }

      // Get report attachments
      const reportAttachments = getReportAttachments(parsedEmail);
      logger.debug(`Got ${reportAttachments.length} report attachments`, {
        sessionId: session.id
      });

      if (reportAttachments.length === 0) {
        logger.warn('No DMARC report attachments found in email', {
          sessionId: session.id,
          messageId: parsedEmail.messageId,
          remoteAddress: session.remoteAddress,
          hostname: session.clientHostname,
          from: session.envelope?.mailFrom,
        });
        return;
      }

      for (const attachment of reportAttachments) {
        await this.processReportAttachment(session, parsedEmail, attachment);
        // Continue processing other attachments
      }
    } catch (error) {
      logger.error(`Error parsing email: ${error instanceof Error ? error.message : error}`, {
        sessionId: session.id,
        clientHostname: session.clientHostname,
        transmissionType: session.transmissionType,
        error,
      });
      if (error instanceof CustomSMTPError) throw error;
      throw new CustomSMTPError('Failed to process email');
    }
  }

  private async authenticateMessage(session: SMTPServerSession, data: string, throwOnReject: boolean = false) {
    const messageOptions = {
      ip: session.remoteAddress,
      helo: session.clientHostname,
      sender: session.envelope?.mailFrom ? session.envelope.mailFrom.address : undefined,
    };

    try {
      const mailauthResult = await authenticate(data, messageOptions);

      // Handle DMARC sender validation
      const spfResult = mailauthResult.spf.status.result;
      const dkimResult = mailauthResult.dkim.results.map(
        (result: { status: { result: string } }) => result.status.result).join(', ');
      const dmarcResult = mailauthResult.dmarc.status.result;
      const dmarcPolicy = mailauthResult.dmarc.policy;

      if (dmarcResult === 'fail' && dmarcPolicy === 'reject') {
        logger.warn('DMARC sender validation failed, rejecting email', {
          sessionId: session.id,
          remoteAddress: session.remoteAddress,
          hostname: session.clientHostname,
          from: session.envelope?.mailFrom,
          authResultHeaders: mailauthResult.headers,
        });
        if (throwOnReject) throw new CustomSMTPError('Rejected by DMARC validation policy');
      }

      logger.debug(`DMARC sender validation (spf=${spfResult}, dkim=${dkimResult}, dmarc=${dmarcResult})`, {
        sessionId: session.id,
        ...messageOptions,
        result: mailauthResult,
      });

      return mailauthResult;
    } catch (error) {
      logger.error(`DMARC sender validation error: ${error instanceof Error ? error.message : error}`, {
        sessionId: session.id,
        ...messageOptions,
        error,
      });
      if (error instanceof CustomSMTPError) throw error;
      throw new CustomSMTPError('DMARC sender validation failed');
    }
  }

  private async validateReporter(session: SMTPServerSession, subject: DmarcEmailSubject | null, dmarcReport: DmarcReport) {
    const orgEmail = dmarcReport.reportMetadata.email;
    const isValidReporter = await this.reporterService.validateReporter(orgEmail);
    
    if (!isValidReporter) {
      // Handle unknown/untrusted reporter based on policy
      switch (this.unknownReporterPolicy) {
        case UnknownReporterPolicy.REJECT:
          logger.warn('Rejected email from untrusted DMARC reporter', {
            sessionId: session.id,
            orgEmail,
            submitter: subject?.submitter,
            remoteAddress: session.remoteAddress,
          });
          throw new CustomSMTPError('Untrusted DMARC reporter');

        case UnknownReporterPolicy.IGNORE:
          logger.warn('Ignoring email from unknown DMARC reporter', {
            sessionId: session.id,
            orgEmail,
            submitter: subject?.submitter,
            remoteAddress: session.remoteAddress,
          });
          break;

        case UnknownReporterPolicy.ALLOW:
          logger.info('Allowing email from unknown DMARC reporter', {
            sessionId: session.id,
            orgEmail,
            submitter: subject?.submitter,
            remoteAddress: session.remoteAddress,
          });
          // Create reporter record with UNTRUSTED status
          await this.reporterService.getOrCreateReporter(
            orgEmail,
            dmarcReport.reportMetadata.orgName,
            subject?.submitter  // Pass submitter only on creation
          );
          break;
      }
    }
  }

  async parseMessage(session: SMTPServerSession, message: string): Promise<ParsedMail> {
    try {
      const parsedEmail = await simpleParser(message) as ParsedMail;
      logger.debug('Parsed email:', {
        sessionId: session.id,
        messageId: parsedEmail.messageId,
        from: parsedEmail.from.text,
        to: parsedEmail.to.text,
        date: parsedEmail.date,
        subject: parsedEmail.subject,
        text: parsedEmail.text,
        html: parsedEmail.html,
        totalAttachmentCount: parsedEmail.attachments.length
      });
      return parsedEmail;
    } catch (error) {
      logger.error(`Error parsing email: ${error instanceof Error ? error.message : error}`, {
        sessionId: session.id,
        clientHostname: session.clientHostname,
        transmissionType: session.transmissionType,
        error,
      });
      throw new CustomSMTPError('Failed to parse email');
    }
  }

  async processReportAttachment(session: SMTPServerSession, parsedEmail: ParsedMail, attachment: Attachment): Promise<boolean> {
    try {
      const xml = await extractXmlFromAttachment(attachment);
      const report = parseAndValidateDmarcReport(xml);
      logger.info(`Successfully parsed DMARC report ${report.reportMetadata.reportId}`, {
        sessionId: session.id,
        messageId: parsedEmail.messageId,
        reportMetadata: {
          orgName: report.reportMetadata.orgName,
          reportId: report.reportMetadata.reportId,
          dateRange: {
            begin: report.reportMetadata.dateRange.begin,
            end: report.reportMetadata.dateRange.end,
          }
        },
        policyPublished: report.policyPublished,
        recordCount: report.records.length,
      });

      // Ensure session fromMail matches orgEmail
      const fromMail = session.envelope?.mailFrom ? session.envelope.mailFrom.address : undefined;
      if (fromMail !== report.reportMetadata.email) {
        throw new CustomSMTPError('Sender does not match DMARC report email');
      }

      const subject = parseDmarcReportSubject(parsedEmail.subject);

      if (this.reporterService) {
        await this.validateReporter(session, subject, report);
      }

      if (!subject) {
        logger.debug('DMARC report subject validation failed', {
          sessionId: session.id,
          messageId: parsedEmail.messageId,
          subject: parsedEmail.subject,
        });
      }
      if (this.strictSubject) {
        if (!subject) throw new CustomSMTPError('Invalid DMARC report email subject');
        this.validateSubject(subject, report);
      }

      const parsedFilename: DmarcReportFilename | null = parseDmarcReportFilename(attachment.filename ?? '');
      if (!parsedFilename) {
        logger.debug('DMARC report filename validation failed', {
          sessionId: session.id,
          messageId: parsedEmail.messageId,
          filename: attachment.filename,
        });
      }
      if (this.strictFilename) {
        if (!parsedFilename) throw new CustomSMTPError('Invalid DMARC report filename');
        this.validateFilename(parsedFilename, subject, report);
      }

      // Save report to database
      await this.reportService.processReport(report, parsedEmail.date || new Date());

      // TODO: Next steps
      // - Trigger analysis pipeline
      // - Send notifications if needed
      return true;
    } catch (error) {
      logger.error(`Failed to process DMARC report attachment: ${error instanceof Error ? error.message : 'Unknown error'}`, {
        sessionId: session.id,
        messageId: parsedEmail.messageId,
        attachmentIndex: parsedEmail.attachments.indexOf(attachment),
        error,
      });
      if (error instanceof CustomSMTPError) throw error;
      return false;
    }
  }

  validateSubject(subject: DmarcEmailSubject, report: DmarcReport): void {
    // Check subject domain against policyPublished.domain
    if (subject.domain !== report.policyPublished.domain) {
      throw new CustomSMTPError('DMARC report domain does not match email subject');
    }
    // Check reportId against report.reportMetadata.reportId
    if (subject.reportId !== report.reportMetadata.reportId) {
      throw new CustomSMTPError('DMARC report ID does not match email subject');
    }
  }

  validateFilename(filename: DmarcReportFilename, subject: DmarcEmailSubject | null, report: DmarcReport): void {
    // Check subject submitter against attachment first part of filename (if subject was passed)
    if (subject && subject.submitter !== filename.submitter) {
      throw new CustomSMTPError('DMARC report submitter does not match email subject');
    }

    // Check file name domain against report.policyPublished.domain
    if (filename.domain !== report.policyPublished.domain) {
      throw new CustomSMTPError('Report domain in attachment filename does not match email subject');
    }

    // Check file name date range against report date range
    const dateRange = report.reportMetadata.dateRange;
    if (filename.begin < dateRange.begin.getTime()/1000 || filename.end > dateRange.end.getTime()/1000) {
      throw new CustomSMTPError('Report date range does not match attachment filename');
    }
  }
}