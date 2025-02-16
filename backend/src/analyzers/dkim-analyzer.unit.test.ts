import { assertEquals, assertThrows } from "@std/assert";
import { DkimAnalyzer, type DkimRecord } from "./dkim-analyzer.ts";

Deno.test("DkimAnalyzer", async (t) => {
  await t.step("validateRecord - valid records", () => {
    const validRecords = [
      "v=DKIM1; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC",
      "v=DKIM1; k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC",
      "v=DKIM1; k=ed25519; h=sha256; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC",
      "v=DKIM1; k=rsa; h=sha1:sha256; s=email; t=y:s; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC",
    ];

    for (const record of validRecords) {
      const result = DkimAnalyzer.validateRecord(record);
      assertEquals(result.v, "DKIM1");
      assertEquals(typeof result.p, "string");
    }
  });

  await t.step("validateRecord - parses all tags correctly", () => {
    const record = 'v=DKIM1; k=rsa; h=sha1:sha256; s=email; t=y:s; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC';
    const result = DkimAnalyzer.validateRecord(record);

    assertEquals(result, {
      v: "DKIM1",
      k: "rsa",
      h: ["sha1", "sha256"],
      s: ["email"],
      t: ["y", "s"],
      p: "MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC"
    });
  });

  await t.step("validateRecord - invalid records", () => {
    const invalidRecords = [
      { record: "v=DKIM2; p=test", error: "Invalid DKIM version: DKIM2" },
      { record: "k=rsa; p=test", error: "Missing required version (v) tag" },
      { record: "v=DKIM1; k=rsa", error: "Missing required public key (p) tag" },
      { record: "v=DKIM1; k=invalid; p=test", error: "Invalid key type: invalid" },
      { record: "v=DKIM1; h=md5; p=test", error: "Invalid hash algorithm: md5" },
      { record: "v=DKIM1; s=invalid; p=test", error: "Invalid service type: invalid" },
      { record: "v=DKIM1; p=invalid@key", error: "Invalid public key format" },
    ];

    for (const { record, error } of invalidRecords) {
      assertThrows(
        () => DkimAnalyzer.validateRecord(record),
        Error,
        error,
        `Expected "${record}" to throw with error: ${error}`
      );
    }
  });

  await t.step("evaluatePolicy - policy strength levels", () => {
    const testCases: Array<{
      record: DkimRecord;
      expectedStrength: 'weak' | 'moderate' | 'strong';
      expectedRecommendations: number;
      description: string;
    }> = [
      {
        record: {
          v: "DKIM1",
          k: "rsa",
          h: ["sha1", "sha256"],
          p: "test",
          t: ["y"]
        },
        expectedStrength: "weak",
        expectedRecommendations: 3,
        description: "weak configuration with SHA1 and testing mode"
      },
      {
        record: {
          v: "DKIM1",
          k: "rsa",
          h: ["sha256"],
          p: "test"
        },
        expectedStrength: "strong",
        expectedRecommendations: 1,
        description: "strong configuration but using RSA"
      },
      {
        record: {
          v: "DKIM1",
          k: "ed25519",
          h: ["sha256"],
          p: "test"
        },
        expectedStrength: "strong",
        expectedRecommendations: 0,
        description: "optimal configuration"
      }
    ];

    for (const { record, expectedStrength, expectedRecommendations, description } of testCases) {
      const result = DkimAnalyzer.evaluatePolicy(record);
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

  await t.step("validateRecord - handles optional properties correctly", () => {
    const record = "v=DKIM1; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC";
    const result = DkimAnalyzer.validateRecord(record);
    
    // Check that optional properties are not present in the result
    assertEquals(Object.hasOwn(result, 't'), false, "t should not be present");
    assertEquals(Object.hasOwn(result, 'n'), false, "n should not be present");
    
    // Verify required and default properties are present
    assertEquals(Object.hasOwn(result, 'v'), true);
    assertEquals(Object.hasOwn(result, 'p'), true);
    assertEquals(Object.hasOwn(result, 'k'), true);
    assertEquals(Object.hasOwn(result, 'h'), true);
    assertEquals(Object.hasOwn(result, 's'), true);
  });
}); 