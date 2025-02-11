// TODO: Add unit tests for mime/helpers.ts
import { assertEquals, assertRejects } from "@std/assert";
import { Buffer } from "node:buffer";
import { extractXmlFromAttachment, maybeIsReportAttachment } from "./helpers.ts";
import { gzipString } from "../utils/compression.ts";
import { setLoggerLevel } from "../utils/logger.ts";

Deno.test("getReportAttachments - filters report attachments", () => {
  const allAttachments = [
    { contentType: "application/zip", filename: "report.zip", content: Buffer.from("") },
    { contentType: "application/pdf", filename: "unrelated.pdf", content: Buffer.from("") },
    { contentType: "application/gzip", filename: "report.gz", content: Buffer.from("") },
    { contentType: "text/xml", filename: "report.xml", content: Buffer.from("") }
  ];

  const attachments = allAttachments.filter(maybeIsReportAttachment);
  assertEquals(attachments.length, 3);
  assertEquals(attachments[0].contentType, "application/zip");
  assertEquals(attachments[1].contentType, "application/gzip");
  assertEquals(attachments[2].contentType, "text/xml");
});

Deno.test("extractXmlFromAttachment - handles gzipped XML", async () => {
  const xmlContent = "<test>content</test>";
  const gzippedContent = gzipString(xmlContent);
  
  const attachment = {
    content: gzippedContent,
    contentType: "application/gzip",
    filename: "report.xml.gz"
  };

  const result = await extractXmlFromAttachment(attachment);
  assertEquals(result, xmlContent);
});

Deno.test("extractXmlFromAttachment - handles plain XML", async () => {
  const xmlContent = "<test>content</test>";
  const attachment = {
    content: Buffer.from(xmlContent),
    contentType: "text/xml",
    filename: "report.xml"
  };

  const result = await extractXmlFromAttachment(attachment);
  assertEquals(result, xmlContent);
});

Deno.test("extractXmlFromAttachment - rejects invalid content type", async () => {
  const attachment = {
    content: Buffer.from("invalid"),
    contentType: "application/pdf",
    filename: "report.pdf"
  };

  setLoggerLevel("CRITICAL");
  await assertRejects(
    () => extractXmlFromAttachment(attachment),
    Error,
    "Unsupported attachment type"
  );
  setLoggerLevel("ERROR");
});
