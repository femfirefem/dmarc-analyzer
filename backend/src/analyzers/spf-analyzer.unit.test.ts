import { assertEquals, assertThrows } from "@std/assert";
import { SpfAnalyzer, type SpfRecord } from "./spf-analyzer.ts";

Deno.test("SpfAnalyzer", async (t) => {
  await t.step("validateRecord - valid records", () => {
    const validRecords = [
      "v=spf1 +mx +a +ip4:192.0.2.0/24 -all",
      "v=spf1 include:_spf.example.com ~all",
      "v=spf1 ip4:192.0.2.0 ip4:192.0.2.1 -all",
      "v=spf1 a mx -all",
      "v=spf1 +a +mx +ip4:192.0.2.0/24 +ip4:198.51.100.0/24 -all",
      "v=spf1 ip6:2001:db8::/32 -all",
      "v=spf1 a:mail.example.com mx:mail.example.com -all",
      "v=spf1 include:example.com include:example.net -all",
      "v=spf1 ?all",
      "v=spf1 +mx:example.com ~all"
    ];

    for (const record of validRecords) {
      const result = SpfAnalyzer.validateRecord(record);
      assertEquals(result.version, "spf1");
      assertEquals(Array.isArray(result.terms), true);
    }
  });

  await t.step("validateRecord - parses terms correctly", () => {
    const testCases = [
      {
        record: "v=spf1 +mx ip4:192.0.2.0/24 ~all",
        expected: [
          { qualifier: "+", mechanism: "mx" },
          { qualifier: "+", mechanism: "ip4", value: "192.0.2.0/24" },
          { qualifier: "~", mechanism: "all" }
        ]
      },
      {
        record: "v=spf1 ip6:2001:db8::/32 -all",
        expected: [
          { qualifier: "+", mechanism: "ip6", value: "2001:db8::/32" },
          { qualifier: "-", mechanism: "all" }
        ]
      },
      {
        record: "v=spf1 a:mail.example.com mx:backup.example.com -all",
        expected: [
          { qualifier: "+", mechanism: "a", value: "mail.example.com" },
          { qualifier: "+", mechanism: "mx", value: "backup.example.com" },
          { qualifier: "-", mechanism: "all" }
        ]
      }
    ];

    for (const { record, expected } of testCases) {
      const result = SpfAnalyzer.validateRecord(record);
      assertEquals(result.terms, expected);
    }
  });

  await t.step("validateRecord - invalid records", () => {
    const invalidRecords = [
      { record: "v=spf2 all", error: "Invalid SPF record format: Must start with v=spf1" },
      { record: "v=spf1", error: "Invalid SPF term: " },
      { record: "v=spf1 invalid", error: "Invalid SPF mechanism: invalid" },
      { record: "v=spf1 *all", error: "Invalid SPF term: *all" },
      { record: "v=spf1 all all", error: "Multiple 'all' mechanisms are not allowed" },
      { record: "v=spf1 all mx", error: "The 'all' mechanism must be the last term" },
      { record: "v=spf1 ip4:invalid -all", error: "Invalid IPv4 address: invalid" },
      { record: "v=spf1 include: -all", error: "Invalid domain for include: " },
      { record: "v=spf1 ip6:invalid -all", error: "Invalid IPv6 address: invalid" },
      { record: "v=spf1 a: -all", error: "Invalid domain for a: " },
      { record: "v=spf1 mx: -all", error: "Invalid domain for mx: " },
      { record: "v=spf1 ip4: -all", error: "Invalid domain for ip4: " },
      { record: "v=spf1 include:invalid..com -all", error: "Invalid domain for include: invalid..com" },
      { record: "v=spf1 ip4:256.256.256.256 -all", error: "Invalid IPv4 address: 256.256.256.256" }
    ];

    for (const { record, error } of invalidRecords) {
      assertThrows(
        () => SpfAnalyzer.validateRecord(record),
        Error,
        error,
        `Expected "${record}" to throw with error: ${error}`
      );
    }
  });

  await t.step("evaluatePolicy - policy strength levels", () => {
    const testCases: Array<{
      record: SpfRecord;
      expectedStrength: 'weak' | 'moderate' | 'strong';
      expectedRecommendations: number;
      description: string;
    }> = [
      {
        record: {
          version: "spf1",
          terms: [
            { qualifier: "+", mechanism: "mx" },
            { qualifier: "+", mechanism: "all" }
          ]
        },
        expectedStrength: "weak",
        expectedRecommendations: 2,
        description: "permissive all"
      },
      {
        record: {
          version: "spf1",
          terms: [
            { qualifier: "+", mechanism: "mx" },
            { qualifier: "~", mechanism: "all" }
          ]
        },
        expectedStrength: "moderate",
        expectedRecommendations: 2,
        description: "softfail all"
      },
      {
        record: {
          version: "spf1",
          terms: [
            { qualifier: "+", mechanism: "mx" },
            { qualifier: "+", mechanism: "ip4", value: "192.0.2.0/24" },
            { qualifier: "-", mechanism: "all" }
          ]
        },
        expectedStrength: "strong",
        expectedRecommendations: 0,
        description: "strict with IP mechanisms"
      },
      {
        record: {
          version: "spf1",
          terms: [
            { qualifier: "+", mechanism: "ptr" },
            { qualifier: "-", mechanism: "all" }
          ]
        },
        expectedStrength: "weak",
        expectedRecommendations: 2,
        description: "using ptr mechanism"
      },
      {
        record: {
          version: "spf1",
          terms: [
            { qualifier: "+", mechanism: "mx" }
          ]
        },
        expectedStrength: "weak",
        expectedRecommendations: 2,
        description: "missing all mechanism"
      }
    ];

    for (const { record, expectedStrength, expectedRecommendations, description } of testCases) {
      const result = SpfAnalyzer.evaluatePolicy(record);
      assertEquals(
        result.strength, 
        expectedStrength,
        `Policy strength mismatch for ${description}`
      );
      assertEquals(
        result.recommendations.length,
        expectedRecommendations,
        `Expected ${expectedRecommendations} recommendations for ${description}, got ${result.recommendations.length}: ${result.recommendations.join(', ')}`
      );
    }
  });
}); 