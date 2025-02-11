import { type ParsedMail } from "mailparser";
import { Buffer } from "node:buffer";
import { getFirstXmlFromZip, gunzipAsString, isGzip, isZip } from "../utils/compression.ts";
import { logger } from "../utils/logger.ts";

export interface Attachment {
  content: Buffer;
  contentType: string;
  filename?: string;
}

export function maybeIsReportAttachment(attachment: Attachment): boolean {
  return !!(
    attachment.contentType === "application/zip" || 
    attachment.contentType === "application/gzip" ||
    attachment.contentType === "text/xml" || 
    attachment.filename?.endsWith(".xml.gz") ||
    attachment.filename?.endsWith(".xml") || 
    attachment.filename?.endsWith(".zip")
  );
};

export function getReportAttachments(message: ParsedMail): Attachment[] {
  return message.attachments.filter(maybeIsReportAttachment);
};

export async function extractXmlFromAttachment(attachment: Attachment): Promise<string> {
  try {
    // Convert Buffer to Uint8Array
    const data = new Uint8Array(attachment.content);
    let xmlContent: string;

    // Determine the extraction method based on content type, filename, and magic numbers
    if (
      attachment.contentType.includes('gzip') ||
      attachment.filename?.endsWith('.gz') ||
      isGzip(data)
    ) {
      logger.debug('Processing as GZIP', {
        filename: attachment.filename,
        contentType: attachment.contentType,
      });
      xmlContent = gunzipAsString(data);
    } else if (
      attachment.contentType.includes('zip') ||
      attachment.filename?.endsWith('.zip') ||
      isZip(data)
    ) {
      logger.debug('Processing as ZIP', {
        filename: attachment.filename,
        contentType: attachment.contentType,
      });
      xmlContent = await getFirstXmlFromZip(data);
    } else if (
      attachment.contentType.includes('xml') ||
      attachment.filename?.endsWith('.xml')
    ) {
      logger.debug('Processing as plain XML', {
        filename: attachment.filename,
        contentType: attachment.contentType,
      });
      xmlContent = new TextDecoder().decode(data);
    } else {
      throw new Error(`Unsupported attachment type: ${attachment.contentType}`);
    }

    // Log the extracted content for now
    logger.debug('Extracted XML content:', {
      filename: attachment.filename,
      contentType: attachment.contentType,
      preview: xmlContent.substring(0, 200) + '...'
    });
    
    return xmlContent;
    
  } catch (error) {
    logger.error('Error parsing report attachment:', {
      filename: attachment.filename,
      contentType: attachment.contentType,
      error
    });
    throw new Error(`Failed to extract XML from attachment: ${error instanceof Error ? error.message : error}`);
  }
};
