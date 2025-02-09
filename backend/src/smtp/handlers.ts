import type { SMTPServerDataStream, SMTPServerSession } from "npm:@types/smtp-server@3.5.10";
import { parseEmail, getReportAttachments, extractXmlFromAttachment } from "../mime/helpers.ts";
import { parseAndValidateDmarcReport } from "../dmarc/parser.ts";
import { logger } from "../utils/logger.ts";

export function handleIncomingMail(
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
      
      // Parse the email content
      const parsedEmail = await parseEmail(fullEmail);
      logger.debug('Parsed email:', {
        sessionId: session.id,
        from: parsedEmail.from.text,
        to: parsedEmail.to.text,
        date: parsedEmail.date,
        messageId: parsedEmail.messageId,
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
          remoteAddress: session.remoteAddress,
          hostname: session.clientHostname,
          from: session.envelope?.mailFrom,
        });
        callback();
        return;
      }

      // Process each report attachment
      for (const attachment of reportAttachments) {
        try {
          const xml = await extractXmlFromAttachment(attachment);
          const report = parseAndValidateDmarcReport(xml);
          logger.info('Successfully parsed DMARC report:', {
            sessionId: session.id,
            reportMetadata: {
              orgName: report.report_metadata.org_name,
              reportId: report.report_metadata.report_id,
              dateRange: {
                begin: report.report_metadata.date_range.begin,
                end: report.report_metadata.date_range.end,
              }
            },
            policyPublished: report.policy_published,
            recordCount: report.records.length,
          });
          
          // TODO: Next steps
          // 1. Save report to database
          // 2. Trigger analysis pipeline
          // 3. Send notifications if needed
        } catch (error) {
          logger.error('Failed to parse DMARC report attachment:', {
            sessionId: session.id,
            error,
          });
          // Continue processing other attachments
        }
      }
      
      callback();
      
    } catch (error) {
      logger.error('Error processing email:', {
        sessionId: session.id,
        error,
        clientHostname: session.clientHostname,
        transmissionType: session.transmissionType
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