import { Buffer } from "node:buffer";
import { Uint8ArrayReader, Uint8ArrayWriter, ZipWriter } from "@zip-js/zip-js";
import { encodeBase64 } from "@std/encoding/base64";
import { gzipString } from "./compression.ts";

export async function createTestZipWithXml(xmlContent: string): Promise<Buffer> {
  const zipWriter = new ZipWriter(new Uint8ArrayWriter());
  
  // Add the XML content as a file named 'report.xml'
  const xmlBuffer = new TextEncoder().encode(xmlContent);
  await zipWriter.add("report.xml", new Uint8ArrayReader(xmlBuffer));
  
  // Close and get the ZIP data
  const zipData = await zipWriter.close();
  
  return Buffer.from(zipData);
};

export function createEMailWithReport(xmlContent: string): string {
  return `From: reporter@example.com
To: dmarc-reports@yourdomain.com
Subject: Report Domain: example.com
Content-Type: multipart/mixed; boundary="boundary"

--boundary
Content-Type: text/plain

DMARC Report for example.com
--boundary
Content-Type: application/gzip
Content-Transfer-Encoding: base64
Filename: report.xml.gz

${encodeBase64(gzipString(xmlContent))}
--boundary--`
};
