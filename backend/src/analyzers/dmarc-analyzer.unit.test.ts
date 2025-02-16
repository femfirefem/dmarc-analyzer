import { assertEquals, assertThrows } from "@std/assert";
import { DmarcAnalyzer, type DmarcRecord } from "./dmarc-analyzer.ts";

Deno.test("DmarcAnalyzer", async (t) => {
  await t.step("validateRecord - valid records", () => {
    const validRecords = [
      "v=DMARC1;p=none",
      "v=DMARC1;p=reject;rua=mailto:dmarc@example.com",
      "v=DMARC1;p=quarantine;pct=100;rua=mailto:dmarc@example.com;ruf=mailto:forensic@example.com",
      'v=DMARC1;p=reject;sp=quarantine;adkim=s;aspf=s;pct=100;fo=1:d:s;rua=mailto:dmarc@example.com;ruf=mailto:forensic@example.com',
    ];

    for (const record of validRecords) {
      const result = DmarcAnalyzer.validateRecord(record);
      assertEquals(result.v, "DMARC1");
      assertEquals(typeof result.p, "string");
    }
  });

  await t.step("validateRecord - parses all tags correctly", () => {
    const record = 'v=DMARC1;p=reject;sp=quarantine;adkim=s;aspf=s;pct=100;fo=1:d:s;rua=mailto:dmarc@example.com,mailto:reports@example.com;ruf=mailto:forensic@example.com';
    const result = DmarcAnalyzer.validateRecord(record);

    assertEquals(result, {
      v: "DMARC1",
      p: "reject",
      sp: "quarantine",
      adkim: "s",
      aspf: "s",
      pct: 100,
      fo: ["1", "d", "s"],
      rua: ["mailto:dmarc@example.com", "mailto:reports@example.com"],
      ruf: ["mailto:forensic@example.com"]
    });
  });

  await t.step("validateRecord - handles quoted values", () => {
    const record = 'v=DMARC1;p=reject;rua="mailto:dmarc@example.com, mailto:backup@example.com"';
    const result = DmarcAnalyzer.validateRecord(record);
    assertEquals(result.rua, ["mailto:dmarc@example.com", "mailto:backup@example.com"]);
  });

  await t.step("validateRecord - invalid records", () => {
    const invalidRecords = [
      { record: "v=DMARC2;p=none", error: "Invalid DMARC record format: Must start with v=DMARC1" },
      { record: "v=DMARC1;adkim=s", error: "Missing required policy (p) tag" },
      { record: "v=DMARC1;p=invalid", error: "Invalid policy value: invalid" },
      { record: "v=DMARC1;p=none;pct=101", error: "Invalid percentage value: 101" },
      { record: "v=DMARC1;p=none;rua=invalid-uri", error: "Invalid rua URI format: invalid-uri" },
      { record: "v=DMARC1;p=none;adkim=x", error: "Invalid DKIM alignment value: x" },
      { record: "v=DMARC1;p=none;aspf=x", error: "Invalid SPF alignment value: x" },
      { record: "v=DMARC1;p=none;rua=ftp://example.com", error: "Invalid rua URI format: ftp://example.com" },
    ];

    for (const { record, error } of invalidRecords) {
      assertThrows(
        () => DmarcAnalyzer.validateRecord(record),
        Error,
        error,
        `Expected "${record}" to throw with error: ${error}`
      );
    }
  });

  await t.step("evaluatePolicy - policy strength levels", () => {
    const testCases: Array<{
      record: DmarcRecord;
      expectedStrength: 'weak' | 'moderate' | 'strong';
      expectedRecommendations: number;
      description: string;
    }> = [
      {
        record: {
          v: "DMARC1",
          p: "none",
          pct: 100
        },
        expectedStrength: "weak",
        expectedRecommendations: 6,
        description: "none policy with no optional tags"
      },
      {
        record: {
          v: "DMARC1",
          p: "quarantine",
          pct: 100,
          adkim: "r",
          aspf: "r",
          rua: ["mailto:dmarc@example.com"]
        },
        expectedStrength: "moderate",
        expectedRecommendations: 4,
        description: "quarantine policy with relaxed alignment"
      },
      {
        record: {
          v: "DMARC1",
          p: "reject",
          pct: 100,
          adkim: "s",
          aspf: "s",
          rua: ["mailto:dmarc@example.com"],
          ruf: ["mailto:forensic@example.com"],
          sp: "reject"
        },
        expectedStrength: "strong",
        expectedRecommendations: 0,
        description: "full reject policy with all recommended settings"
      },
      {
        record: {
          v: "DMARC1",
          p: "reject",
          pct: 50,
          adkim: "s",
          aspf: "s",
          rua: ["mailto:dmarc@example.com"],
          ruf: ["mailto:forensic@example.com"]
        },
        expectedStrength: "weak",
        expectedRecommendations: 1,
        description: "reject policy with partial enforcement"
      }
    ];

    for (const { record, expectedStrength, expectedRecommendations, description } of testCases) {
      const result = DmarcAnalyzer.evaluatePolicy(record);
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

  await t.step("validateRecord - handles whitespace", () => {
    const records = [
      " v=DMARC1;p=none ",
      "v=DMARC1; p=none",
      "v=DMARC1;\tp=none",
      "v=DMARC1;p=none;  rua=mailto:dmarc@example.com"
    ];

    for (const record of records) {
      const result = DmarcAnalyzer.validateRecord(record);
      assertEquals(result.v, "DMARC1");
      assertEquals(result.p, "none");
    }
  });

  await t.step("validateRecord - preserves tag order independence", () => {
    const record1 = "v=DMARC1;p=none;pct=100";
    const record2 = "v=DMARC1;pct=100;p=none";

    const result1 = DmarcAnalyzer.validateRecord(record1);
    const result2 = DmarcAnalyzer.validateRecord(record2);

    assertEquals(result1, result2);
  });
}); 