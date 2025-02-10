import { SMTPServer } from "smtp-server";
import { logger } from "../utils/logger.ts";
import { DmarcReportService } from "../services/dmarc-report.ts";
import type { SMTPServerDataStream, SMTPServerSession } from "npm:@types/smtp-server@3.5.10";
import { parseEmail, getReportAttachments, extractXmlFromAttachment } from "../mime/helpers.ts";
import { parseAndValidateDmarcReport } from "../dmarc/parser.ts";

export class DmarcSMTPServer {
  private server: SMTPServer;
  private port: number;
  private host: string;
  private reportService: DmarcReportService;

  constructor(port: number = 25, host: string = "0.0.0.0", reportService: DmarcReportService | undefined = undefined) {
    this.server = new SMTPServer({
      onData: this.onData.bind(this),
      authOptional: true,
      disabledCommands: ['AUTH', 'STARTTLS'], // DMARC reports don't need authentication
    });
    this.port = port;
    this.host = host;
    this.reportService = reportService ?? new DmarcReportService();
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

        await this.onMailData(session, fullEmail);

        callback();
      } catch (error) {
        logger.error(`Error processing email: ${error instanceof Error ? error.message : error}`, {
          sessionId: session.id,
          clientHostname: session.clientHostname,
          transmissionType: session.transmissionType,
          error,
        });
        callback(new Error('Failed to process email'));
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

  async onMailData(session: SMTPServerSession, fullEmail: string): Promise<void> {
    try {
      // Parse the email content
      const parsedEmail = await parseEmail(fullEmail);
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

      // Process each report attachment
      for (const attachment of reportAttachments) {
        try {
          const xml = await extractXmlFromAttachment(attachment);
          const report = parseAndValidateDmarcReport(xml);
          logger.info('Successfully parsed DMARC report:', {
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
          
          // Save report to database
          await this.reportService.processReport(report, parsedEmail.date || new Date());

          // TODO: Next steps
          // - Trigger analysis pipeline
          // - Send notifications if needed
        } catch (error) {
          logger.error(`Failed to process DMARC report attachment: ${error instanceof Error ? error.message : 'Unknown error'}`, {
            sessionId: session.id,
            messageId: parsedEmail.messageId,
            attachmentIndex: reportAttachments.indexOf(attachment),
            error,
          });
          // Continue processing other attachments
        }
      }
    } catch (error) {
      logger.error(`Error parsing email: ${error instanceof Error ? error.message : error}`, {
        sessionId: session.id,
        clientHostname: session.clientHostname,
        transmissionType: session.transmissionType,
        error,
      });
      throw new Error('Failed to process email');
    }
  }
  
}