import { assertEquals } from "@std/assert";
import { parseDmarcReportFilename, parseDmarcReportSubject } from "./helpers.ts";

Deno.test("parseDmarcReportSubject", async (t) => {
  await t.step("should parse minimal valid subject", () => {
    const result = parseDmarcReportSubject("Report Domain: example.com");
    assertEquals(result, {
      domain: "example.com"
    });
  });

  await t.step("should parse full RFC format", () => {
    const result = parseDmarcReportSubject(
      "Report Domain: example.com Submitter: google.com Report-ID: abc123"
    );
    assertEquals(result, {
      domain: "example.com",
      submitter: "google.com",
      reportId: "abc123"
    });
  });

  await t.step("should handle submitter variations", () => {
    const subjects: [string, {
      domain: string;
      submitter?: string;
      reportId?: string;
      tag?: string;
    }][] = [
      // Just submitter
      ["Report Domain: example.com Submitter: google.com", {
        domain: "example.com",
        submitter: "google.com"
      }],
      // Submitter and Report-ID
      ["Report Domain: example.com Submitter: google.com Report-ID: abc123", {
        domain: "example.com",
        submitter: "google.com",
        reportId: "abc123"
      }],
      // Tag and submitter
      ["[External] Report Domain: example.com Submitter: google.com", {
        domain: "example.com",
        submitter: "google.com",
        tag: "External"
      }],
      // Tag, submitter, and Report-ID
      ["[External] Report Domain: example.com Submitter: google.com Report-ID: abc123", {
        domain: "example.com",
        submitter: "google.com",
        reportId: "abc123",
        tag: "External"
      }],
      // Submitter with subdomain
      ["Report Domain: example.com Submitter: dmarc.google.com Report-ID: abc123", {
        domain: "example.com",
        submitter: "dmarc.google.com",
        reportId: "abc123"
      }],
    ];

    for (const [subject, expected] of subjects) {
      const result = parseDmarcReportSubject(subject);
      assertEquals(result, expected, `Failed for subject: ${subject}`);
    }
  });

  await t.step("should handle tags in square brackets", () => {
    const subjects = [
      ["[Preview] Report Domain: example.com", "Preview"],
      ["[External] Report Domain: example.com", "External"],
      ["[SPAM] Report Domain: example.com", "SPAM"],
      ["[Test Message] Report Domain: example.com", "Test Message"],
    ];

    for (const [subject, expectedTag] of subjects) {
      const result = parseDmarcReportSubject(subject);
      assertEquals(result?.domain, "example.com");
      assertEquals(result?.tag, expectedTag);
    }
  });

  await t.step("should parse full format with tag", () => {
    const result = parseDmarcReportSubject(
      "[External] Report Domain: example.com Submitter: google.com Report-ID: <abc123@google.com>"
    );
    assertEquals(result, {
      domain: "example.com",
      submitter: "google.com",
      reportId: "abc123@google.com",
      tag: "External"
    });
  });

  await t.step("should be case insensitive", () => {
    const result = parseDmarcReportSubject(
      "[PREVIEW] REPORT DOMAIN: example.com SUBMITTER: GOOGLE.COM REPORT-ID: ABC123"
    );
    assertEquals(result, {
      domain: "example.com",
      submitter: "GOOGLE.COM",
      reportId: "ABC123",
      tag: "PREVIEW"
    });
  });

  await t.step("should handle extra whitespace", () => {
    const result = parseDmarcReportSubject(
      "  [Preview]    Report    Domain:    example.com    Submitter:   google.com    Report-ID:    abc123  "
    );
    assertEquals(result, {
      domain: "example.com",
      submitter: "google.com",
      reportId: "abc123",
      tag: "Preview"
    });
  });

  await t.step("should reject invalid subjects", () => {
    const invalidSubjects = [
      "",
      "Not a DMARC report",
      "Domain: example.com",
      "Report Domain: ",
      "Report Domain: invalid domain!",
      "Report Domain: .invalid.com",
      "Report Domain: invalid.com. Report-ID:",
      "[Preview] Not a proper report",
      "Report Domain: example.com Extra stuff at end",
      "[Invalid[] Report Domain: example.com",
      "Report Domain: example.com Submitter:",
      "Report Domain: example.com Submitter: !invalid!",
    ];

    for (const subject of invalidSubjects) {
      const result = parseDmarcReportSubject(subject);
      assertEquals(result, null, `Should reject: ${subject}`);
    }
  });

  await t.step("should handle valid domain formats", () => {
    const validDomains = [
      "example.com",
      "sub.example.com",
      "example-domain.com",
      "example123.com",
      "my-domain123.co.uk",
    ];

    for (const domain of validDomains) {
      const result = parseDmarcReportSubject(`Report Domain: ${domain}`);
      assertEquals(result?.domain, domain, `Should accept domain: ${domain}`);
    }
  });
});

Deno.test("parseDmarcReportFilename", async (t) => {
  await t.step("should parse valid filename", () => {
    const result = parseDmarcReportFilename("enterprise.protection.outlook.com!example.com!1600000000!1600000001.xml.gz");
    assertEquals(result, {
      domain: "example.com",
      submitter: "enterprise.protection.outlook.com",
      begin: 1600000000,
      end: 1600000001,
      extension: ".xml.gz"
    });

    const result2 = parseDmarcReportFilename("google.com!example.com!1600000000!1600000001.zip");
    assertEquals(result2, {
      domain: "example.com",
      submitter: "google.com",
      begin: 1600000000,
      end: 1600000001,
      extension: ".zip"
    });
  });

  await t.step("should reject invalid filenames", () => {
    const invalidFilenames = [
      "",
      "!example.com!1600000000!1600000001.xml.gz", // Empty submitter
      "invalid!example.com!1600000000!1600000001.xml.gz", // Invalid submitter (no dots)
      "google.com!example.com!abc!1600000001.xml.gz", // Invalid begin timestamp
      "google.com!example.com!1600000000!def.xml.gz", // Invalid end timestamp
      "google.com!!1600000000!1600000001.xml.gz", // Empty domain
      "google.com!invalid!1600000000!1600000001.xml.gz", // Invalid domain (no dots)
    ];

    for (const filename of invalidFilenames) {
      const result = parseDmarcReportFilename(filename);
      assertEquals(result, null, `Should reject: ${filename}`);
    }
  });
});
