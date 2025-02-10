import { assertEquals, assertThrows } from "@std/assert";
import { parseAndValidateDmarcReport } from "./parser.ts";

const sampleReport = `<?xml version="1.0" encoding="UTF-8" ?>
<feedback>
  <version>1.0</version>
  <report_metadata>
    <org_name>Google</org_name>
    <email>noreply-dmarc-support@google.com</email>
    <report_id>1234567890</report_id>
    <date_range>
      <begin>1577836800</begin>
      <end>1577923200</end>
    </date_range>
    <extra_contact_info>https://support.google.com/a/answer/2466580</extra_contact_info>
  </report_metadata>
  <policy_published>
    <domain>example.com</domain>
    <adkim>r</adkim>
    <aspf>r</aspf>
    <p>none</p>
    <sp>none</sp>
    <pct>100</pct>
    <fo>1</fo>
  </policy_published>
  <record>
    <row>
      <source_ip>203.0.113.1</source_ip>
      <count>2</count>
      <policy_evaluated>
        <disposition>none</disposition>
        <dkim>pass</dkim>
        <spf>pass</spf>
        <reason>
          <type>trusted_forwarder</type>
          <comment>Known good sender</comment>
        </reason>
      </policy_evaluated>
    </row>
    <identifiers>
      <header_from>example.com</header_from>
      <envelope_from>example.com</envelope_from>
      <envelope_to>recipient.com</envelope_to>
    </identifiers>
    <auth_results>
      <dkim>
        <domain>example.com</domain>
        <selector>default</selector>
        <result>pass</result>
        <human_result>pass (ok)</human_result>
      </dkim>
      <spf>
        <domain>example.com</domain>
        <scope>mfrom</scope>
        <result>pass</result>
      </spf>
    </auth_results>
  </record>
</feedback>`;

Deno.test("parseDmarcReport", async (t) => {
  await t.step("should parse valid DMARC report", () => {
    const report = parseAndValidateDmarcReport(sampleReport);
    
    // Test report metadata
    assertEquals(report.reportMetadata.orgName, "Google");
    assertEquals(report.reportMetadata.email, "noreply-dmarc-support@google.com");
    assertEquals(report.reportMetadata.extraContactInfo, "https://support.google.com/a/answer/2466580");
    
    // Test policy published
    assertEquals(report.policyPublished.domain, "example.com");
    assertEquals(report.policyPublished.adkim, "r");
    assertEquals(report.policyPublished.p, "none");
    assertEquals(report.policyPublished.pct, 100);
    
    // Test records
    assertEquals(report.records.length, 1);
    const record = report.records[0];
    
    // Test row data
    assertEquals(record.row.sourceIp, "203.0.113.1");
    assertEquals(record.row.count, 2);
    assertEquals(record.row.policyEvaluated.disposition, "none");
    assertEquals(record.row.policyEvaluated.dkim, "pass");
    assertEquals(record.row.policyEvaluated.spf, "pass");
    
    // Test policy override reason
    assertEquals(record.row.policyEvaluated.reasons?.[0].type, "trusted_forwarder");
    assertEquals(record.row.policyEvaluated.reasons?.[0].comment, "Known good sender");
    
    // Test identifiers
    assertEquals(record.identifiers.headerFrom, "example.com");
    assertEquals(record.identifiers.envelopeFrom, "example.com");
    assertEquals(record.identifiers.envelopeTo, "recipient.com");
    
    // Test auth results
    const dkim = record.authResults.dkim?.[0];
    assertEquals(dkim?.domain, "example.com");
    assertEquals(dkim?.selector, "default");
    assertEquals(dkim?.result, "pass");
    assertEquals(dkim?.humanResult, "pass (ok)");
    
    const spf = record.authResults.spf[0];
    assertEquals(spf.domain, "example.com");
    assertEquals(spf.scope, "mfrom");
    assertEquals(spf.result, "pass");
  });

  await t.step("should handle missing optional fields", () => {
    const minimalReport = `<?xml version="1.0"?>
      <feedback>
        <report_metadata>
          <org_name>Test</org_name>
          <email>test@test.com</email>
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
            <header_from>test.com</header_from>
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
    
    const report = parseAndValidateDmarcReport(minimalReport);
    assertEquals(report.policyPublished.adkim, undefined);
    assertEquals(report.records[0].authResults.dkim, undefined);
    assertEquals(report.records[0].identifiers.envelopeTo, undefined);
  });

  await t.step("should throw on missing required fields", () => {
    const invalidReport = `<?xml version="1.0"?>
      <feedback>
        <report_metadata>
          <org_name>Test</org_name>
          <report_id>test</report_id>
          <date_range>
            <begin>1577836800</begin>
            <end>1577923200</end>
          </date_range>
        </report_metadata>
        <policy_published>
          <domain>test.com</domain>
        </policy_published>
        <record>
          <row>
            <source_ip>203.0.113.1</source_ip>
            <count>1</count>
          </row>
        </record>
      </feedback>`;
    
    assertThrows(
      () => parseAndValidateDmarcReport(invalidReport),
      Error,
      "Missing "
    );
  });

  await t.step("should throw on invalid XML", () => {
    assertThrows(
      () => parseAndValidateDmarcReport("<invalid>"),
      Error,
      "Failed to parse DMARC report"
    );
  });
}); 