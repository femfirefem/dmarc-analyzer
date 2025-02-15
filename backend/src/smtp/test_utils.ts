import { Buffer } from "node:buffer";
import { gzipString } from "../utils/compression.ts";

export const createTestDmarcReport = ({
  reporterEmail = "reporter@example.com",
  reporterName = "Test Reporter",
  domain = "example.com",
  reportId = "test-report-id",
  begin = new Date("2023-01-01T00:00:00Z"),
  end = new Date("2023-01-02T00:00:00Z")
}: {
  reporterEmail?: string, reporterName?: string, domain?: string, reportId?: string, 
  begin?: Date, end?: Date
}): string => {
  return `<?xml version="1.0" encoding="UTF-8" ?>
<feedback>
  <version>1.0</version>
  <report_metadata>
    <org_name>${reporterName}</org_name>
    <email>${reporterEmail}</email>
    <report_id>${reportId}</report_id>
    <date_range>
      <begin>${begin ? begin.getTime()/1000 : 1234567890}</begin>
      <end>${end ? end.getTime()/1000 : 1234654290}</end>
    </date_range>
  </report_metadata>
  <policy_published>
    <domain>${domain}</domain>
    <adkim>r</adkim>
    <aspf>r</aspf>
    <p>none</p>
    <sp>none</sp>
    <pct>100</pct>
  </policy_published>
  <record>
    <row>
      <source_ip>192.168.1.1</source_ip>
      <count>10</count>
      <policy_evaluated>
        <disposition>none</disposition>
        <dkim>pass</dkim>
        <spf>pass</spf>
      </policy_evaluated>
    </row>
    <identifiers>
      <header_from>${domain}</header_from>
      <envelope_from>${domain}</envelope_from>
      <envelope_to>${domain}</envelope_to>
    </identifiers>
    <auth_results>
      <dkim>
        <domain>${domain}</domain>
        <result>pass</result>
      </dkim>
      <spf>
        <domain>${domain}</domain>
        <result>pass</result>
        <scope>mfrom</scope>
      </spf>
    </auth_results>
  </record>
</feedback>`;
};

export const createTestDmarcEmail = ({
  reporterEmail = "reporter@example.com",
  submitter = "reporter.example.com",
  reporterName = "Test Reporter",
  domain = "example.com",
  reportId = "test-report-id",
  begin = new Date("2023-01-01T00:00:00Z"),
  end = new Date("2023-01-02T00:00:00Z")
}: {
  reporterEmail?: string, submitter?: string, reporterName?: string, domain?: string, reportId?: string, 
  begin?: Date, end?: Date
}): {from: string, to: string[], subject: string, text: string, attachments: {filename: string, content: string|Buffer}[]} => {
  return {
    from: reporterEmail,
    to: ["dmarc-reports@yourdomain.com"],
    subject: `Report Domain: ${domain} Submitter: ${submitter} Report-ID: ${reportId}`,
    text: "DMARC Report for example.com",
    attachments: [
      {
        filename: `${submitter}!${domain}!${begin.getTime()/1000}!${end.getTime()/1000}.xml.gz`,
        content: gzipString(createTestDmarcReport({reporterEmail, reporterName, domain, reportId, begin, end})),
      },
    ],
  }
};