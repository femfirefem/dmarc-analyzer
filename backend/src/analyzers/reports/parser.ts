import { parseAndValidateDmarcReport } from "../../dmarc/parser.ts";
import { DmarcReport } from "../../dmarc/types.ts";
import { type Attachment, extractXmlFromAttachment } from "../../mime/helpers.ts";

export async function parseReportAttachments(attachments: Attachment[]): Promise<DmarcReport | null> {
  for (const attachment of attachments) {
    const xml = await extractXmlFromAttachment(attachment);
    if (xml) return parseAndValidateDmarcReport(xml);
  }
  return null;
};
