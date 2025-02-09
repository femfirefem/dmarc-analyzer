import { simpleParser, type ParsedMail } from "mailparser";
import { Buffer } from "node:buffer";
import { getFirstXmlFromZip, gunzipAsString, isGzip, isZip } from "../utils/compression.ts";

export interface Attachment {
  content: Buffer;
  contentType: string;
  filename?: string;
}

export async function parseEmail(emailContent: string): Promise<ParsedMail> {
  return await simpleParser(emailContent) as ParsedMail;
};

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
      // console.log('Processing as GZIP');
      xmlContent = gunzipAsString(data);
    } else if (
      attachment.contentType.includes('zip') ||
      attachment.filename?.endsWith('.zip') ||
      isZip(data)
    ) {
      // console.log('Processing as ZIP');
      xmlContent = await getFirstXmlFromZip(data);
    } else if (
      attachment.contentType.includes('xml') ||
      attachment.filename?.endsWith('.xml')
    ) {
      // console.log('Processing as plain XML');
      xmlContent = new TextDecoder().decode(data);
    } else {
      throw new Error(`Unsupported attachment type: ${attachment.contentType}`);
    }

    // Log the extracted content for now
    // console.log('Extracted XML content:', {
    //   filename: attachment.filename,
    //   contentType: attachment.contentType,
    //   preview: xmlContent.substring(0, 200) + '...'
    // });
    
    return xmlContent;
    
  } catch (error) {
    // console.error('Error parsing report attachment:', {
    //   filename: attachment.filename,
    //   contentType: attachment.contentType,
    //   error
    // });
    throw new Error(`Failed to extract XML from attachment: ${error instanceof Error ? error.message : error}`);
  }
};
