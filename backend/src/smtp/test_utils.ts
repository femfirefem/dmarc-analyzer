export const createTestDmarcReport = (domain: string, begin: Date|undefined = undefined, end: Date|undefined = undefined): string => {
  return `<?xml version="1.0" encoding="UTF-8" ?>
<feedback>
  <version>1.0</version>
  <report_metadata>
    <org_name>Test Reporter</org_name>
    <email>reporter@example.com</email>
    <report_id>2024-test-001</report_id>
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

