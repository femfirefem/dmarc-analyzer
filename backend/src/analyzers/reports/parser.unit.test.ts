import { assertEquals, assertRejects } from "@std/assert";
import { parseReportAttachments } from "./parser.ts";
import { createTestDmarcReport } from "../../smtp/test_utils.ts";
import { Buffer } from "node:buffer";
import { gzipString } from "../../utils/compression.ts";
import { createEMailWithReport } from "../../utils/test_utils.ts";
import { setLoggerLevel } from "../../utils/logger.ts";
import { simpleParser } from "mailparser";

Deno.test("parseReportAttachment", async (t) => {
  await t.step("should handle gzip by content-type", async () => {
    const report = createTestDmarcReport({
      reporterEmail: "reporter@example.com",
      reporterName: "Test Reporter",
      domain: "example.com",
      reportId: "2024-test-001",
      begin: new Date("2009-02-13T23:31:30.000Z"),
      end: new Date("2009-02-14T23:31:30.000Z")
    });
    const compressed = gzipString(report);
    await parseReportAttachments([{
      content: Buffer.from(compressed),
      contentType: 'application/gzip',
      filename: 'report.xml.gz'
    }]);
  });

  await t.step("should handle gzip by filename", async () => {
    const report = createTestDmarcReport({
      reporterEmail: "reporter@example.com",
      reporterName: "Test Reporter",
      domain: "example.com",
      reportId: "2024-test-001",
      begin: new Date("2009-02-13T23:31:30.000Z"),
      end: new Date("2009-02-14T23:31:30.000Z")
    });
    const compressed = gzipString(report);
    
    await parseReportAttachments([{
      content: Buffer.from(compressed),
      contentType: 'application/octet-stream',
      filename: 'report.xml.gz'
    }]);
  });

  await t.step("should handle gzip by magic numbers", async () => {
    const report = createTestDmarcReport({
      reporterEmail: "reporter@example.com",
      reporterName: "Test Reporter",
      domain: "example.com",
      reportId: "2024-test-001",
      begin: new Date("2009-02-13T23:31:30.000Z"),
      end: new Date("2009-02-14T23:31:30.000Z")
    });
    const compressed = gzipString(report);
    await parseReportAttachments([{
      content: Buffer.from(compressed),
      contentType: 'application/octet-stream'
    }]);
  });

  await t.step("should handle plain XML", async () => {
    const report = createTestDmarcReport({
      reporterEmail: "reporter@example.com",
      reporterName: "Test Reporter",
      domain: "example.com",
      reportId: "2024-test-001",
      begin: new Date("2009-02-13T23:31:30.000Z"),
      end: new Date("2009-02-14T23:31:30.000Z")
    });
    await parseReportAttachments([{
      content: Buffer.from(report),
      contentType: 'application/xml',
      filename: 'report.xml'
    }]);
  });

  await t.step("should reject unsupported types", async () => {
    setLoggerLevel("CRITICAL");
    await assertRejects(
      async () => {
        await parseReportAttachments([{
          content: Buffer.from("invalid"),
          contentType: 'text/plain',
          filename: 'report.txt'
        }]);
      },
      Error,
      "Unsupported attachment type"
    );
    setLoggerLevel("ERROR");
  });
});

Deno.test("parseReportAttachments should parse a valid DMARC report", async () => {
  // Create test DMARC report
  const report = createTestDmarcReport({
    reporterEmail: "reporter@example.com",
    reporterName: "Test Reporter",
    domain: "example.com",
    reportId: "2024-test-001",
    begin: new Date("2009-02-13T23:31:30.000Z"),
    end: new Date("2009-02-14T23:31:30.000Z")
  });
  const rawEmail = createEMailWithReport(report);
  const parsedEmail = await simpleParser(rawEmail);
  const dmarcReport = await parseReportAttachments(parsedEmail.attachments);

  assertEquals(dmarcReport, {
    version: 1.0,
    reportMetadata: {
      orgName: "Test Reporter",
      reportId: "2024-test-001",
      dateRange: {
        begin: new Date("2009-02-13T23:31:30.000Z"),
        end: new Date("2009-02-14T23:31:30.000Z")
      },
      email: "reporter@example.com"
    },
    policyPublished: {
      domain: "example.com",
      adkim: "r",
      aspf: "r",
      p: "none",
      sp: "none",
      pct: 100
    },
    records: [
      {
        row: {
          sourceIp: "192.168.1.1",
          count: 10,
          policyEvaluated: {
            disposition: "none",
            dkim: "pass",
            spf: "pass"
          }
        },
        identifiers: {
          envelopeTo: "example.com",
          envelopeFrom: "example.com",
          headerFrom: "example.com"
        },
        authResults: {
          dkim: [{
            domain: "example.com",
            result: "pass"
          }],
          spf: [{ domain: "example.com", result: "pass", scope: "mfrom" }]
        }
      }
    ]
  });
});

Deno.test("parseEmail should handle missing DMARC report", async () => {
  const emailWithoutReport =`From: reporter@example.com
To: dmarc-reports@yourdomain.com
Subject: Report Domain: example.com
Content-Type: multipart/mixed; boundary="boundary"

--boundary
Content-Type: text/plain

DMARC Report for example.com
--boundary--`;
  const email = await simpleParser(emailWithoutReport);
  const dmarcReport = await parseReportAttachments(email.attachments);
  assertEquals(dmarcReport, null);
});

Deno.test("parseEmail should handle invalid DMARC report", async () => {
  const invalidDmarcReportXml = `<?xml version="1.0"?>
<feedback>
  <report_metadata>
    <org_name>Test</org_name>
    <!-- Missing required email field -->
    <report_id>test</report_id>
    <date_range>
      <begin>1577836800</begin>
      <end>1577923200</end>
    </date_range>
  </report_metadata>
  <policy_published>
    <domain>test.com</domain>
    <p>none</p>
    <sp>none</sp>
    <pct>100</pct>
  </policy_published>
  <record>
    <row>
      <source_ip>203.0.113.1</source_ip>
      <count>1</count>
      <policy_evaluated>
        <disposition>none</disposition>
        <dkim>pass</dkim>
        <spf>pass</spf>
      </policy_evaluated>
    </row>
    <identifiers>
      <envelope_from>test.com</envelope_from>
    </identifiers>
    <auth_results>
      <spf>
        <domain>test.com</domain>
        <scope>mfrom</scope>
        <result>pass</result>
      </spf>
    </auth_results>
  </record>
</feedback>`;

  const emailWithInvalidReport = createEMailWithReport(invalidDmarcReportXml);

  const email = await simpleParser(emailWithInvalidReport);

  setLoggerLevel("CRITICAL");
  assertRejects(
    async () => await parseReportAttachments(email.attachments),
    Error,
    "Missing "
  );
  setLoggerLevel("ERROR");
});

