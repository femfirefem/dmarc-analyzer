import { assertEquals, assertExists, assertRejects } from "@std/assert";
import { DmarcSMTPServer } from "./server.ts";
import { createTransport } from "nodemailer";
import { createTestDmarcReport, createTestDmarcEmail } from "./test_utils.ts";
import { gzipString } from "../utils/compression.ts";
import { setLoggerLevel } from "../utils/logger.ts";
import { DmarcReportService } from "../services/dmarc-report.ts";
import { MockDmarcReportRepository } from "../database/repositories/mock-dmarc-report.ts";
import { MockKnownReporterRepository } from "../database/repositories/mock-known-reporter.ts";
import { KnownReporterService } from "../services/known-reporter.ts";
import { UnknownReporterPolicy } from "./types.ts";

const TEST_PORT = 52525; // Using a non-privileged port for testing
const TEST_HOST = "localhost";

Deno.test({
  name: "SMTP Server Integration Tests",
  async fn(t) {
    setLoggerLevel("ERROR"); // Reduce log noise while running tests

    const repository = new MockDmarcReportRepository();
    const reportService = new DmarcReportService(repository);
    const server = new DmarcSMTPServer({
      port: TEST_PORT,
      host: TEST_HOST,
      validateDmarc: false,  // Explicitly disable DMARC validation for basic tests
      dmarcReject: false,
      closeTimeout: 100,
      reportService: reportService
    });
    const reportBeginDate = new Date("2023-01-01T00:00:00Z");
    const reportEndDate = new Date("2023-01-02T00:00:00Z");
    
    // Start server before all tests
    await t.step("should start SMTP server", async () => {
      await server.start();
      // Server should be running now
    });

    // Test basic connection
    await t.step("should accept SMTP connections", async () => {
      const client = createTransport({
        host: TEST_HOST,
        port: TEST_PORT,
        secure: false
      });
      await client.verify();
      client.close();
    });

    // Test sending a basic DMARC report
    await t.step("should accept DMARC report email", async () => {
      const client = createTransport({
        host: TEST_HOST,
        port: TEST_PORT,
        secure: false
      });

      await client.verify();

      const result = await client.sendMail(createTestDmarcEmail({
        reporterEmail: "reporter@example.com",
        reporterName: "Test Reporter",
        domain: "example.com",
        reportId: "2024-test-001",
        begin: reportBeginDate,
        end: reportEndDate
      }));

      assertExists(result);
      client.close();
    });

    // Test rejection of invalid subject
    await t.step("should reject email with invalid subject", async () => {
      const client = createTransport({
        host: TEST_HOST,
        port: TEST_PORT,
        secure: false
      });

      await client.verify();

      setLoggerLevel("CRITICAL");
      await assertRejects(
        () => client.sendMail({
          from: "reporter@example.com", 
          to: ["dmarc-reports@yourdomain.com"],
          subject: "Invalid Subject",
          text: "DMARC Report",
          attachments: [
            {
              filename: `reporter.example.com!example.com!${reportBeginDate.getTime()/1000}!${reportEndDate.getTime()/1000}.xml.gz`,
              content: gzipString(createTestDmarcReport({
                reporterEmail: "reporter@example.com",
                reporterName: "Test Reporter",
                domain: "example.com",
                reportId: "2024-test-002",
                begin: reportBeginDate,
                end: reportEndDate
              })),
            },
          ],
        }),
        Error,
        "Invalid DMARC report email subject"
      );
      setLoggerLevel("ERROR");

      client.close();
    });

    // Test rejection of invalid filename
    await t.step("should reject email with invalid filename", async () => {
      const client = createTransport({
        host: TEST_HOST,
        port: TEST_PORT,
        secure: false
      });

      await client.verify();

      setLoggerLevel("CRITICAL");
      await assertRejects(
        () => client.sendMail({
          from: "reporter@example.com",
          to: ["dmarc-reports@yourdomain.com"],
          subject: "Report Domain: example.com Submitter: reporter.example.com Report-ID: 2024-test-003",
          text: "DMARC Report",
          attachments: [
            {
              filename: "invalid_filename.xml.gz",
              content: gzipString(createTestDmarcReport({
                reporterEmail: "reporter@example.com",
                reporterName: "Test Reporter",
                domain: "example.com",
                reportId: "2024-test-003",
                begin: reportBeginDate,
                end: reportEndDate
              })),
            },
          ],
        }),
        Error,
        "Invalid DMARC report filename"
      );
      setLoggerLevel("ERROR");
      client.close();
    });

    // Test retrieving reports from database
    await t.step("submitted report should exist in the database", async () => {
      const report = await repository.findByReportIdAndOrg("2024-test-001", "Test Reporter");
      assertExists(report);
      assertEquals(report.orgName, "Test Reporter");
      assertEquals(report.reportId, "2024-test-001");
      assertEquals(report.beginDate, reportBeginDate);
      assertEquals(report.endDate, reportEndDate);
      assertEquals(report.domain, "example.com");
      assertEquals(report.adkim, "r");
      assertEquals(report.aspf, "r");

      const records = await repository.findByDateRange(reportBeginDate, reportEndDate);
      assertEquals(records.length, 1);
      assertEquals(records[0].reportId, report.reportId);
    });
    
    // Cleanup
    await t.step("should stop SMTP server", async () => {
      // NOTE: Waiting 100ms to prevent race condition bug that leaks a setTimeout
      await new Promise(resolve => setTimeout(resolve, 100)); 
      
      await server.stop();
    });
  },
  sanitizeOps: false,
  sanitizeResources: false,
}); 

Deno.test({
  name: "SMTP Server Integration Tests with DMARC Reject",
  ignore: Deno.env.get("CI") === "true", // SKip on CI to prevent outbound DMARC checks
  async fn(t) {
    setLoggerLevel("ERROR");

    // Test DMARC authentication
    await t.step("should validate DMARC authentication when enabled", async () => {
      const repository = new MockDmarcReportRepository();
      const reportService = new DmarcReportService(repository);
      const serverWithDmarc = new DmarcSMTPServer({
        port: TEST_PORT + 1, // Use different port to avoid conflicts
        host: TEST_HOST,
        validateDmarc: true,
        dmarcReject: true,
        closeTimeout: 100,
        reportService: reportService
      });

      await serverWithDmarc.start();

      const client = createTransport({
        host: TEST_HOST,
        port: TEST_PORT + 1,
        secure: false
      });

      try {
        await client.verify();

        const reportBeginDate = new Date("2023-01-01T00:00:00Z");
        const reportEndDate = new Date("2023-01-02T00:00:00Z");

        setLoggerLevel("CRITICAL");
        // This should fail due to DMARC authentication
        await assertRejects(
          async () => await client.sendMail({
            from: "invalid@example.com",
            to: ["dmarc-reports@yourdomain.com"],
            subject: "Report Domain: example.com",
            text: "DMARC Report for example.com",
            attachments: [
              {
                filename: `invalid.example.com!example.com!${reportBeginDate.getTime()/1000}!${reportEndDate.getTime()/1000}.xml.gz`,
                content: gzipString(createTestDmarcReport({
                  reporterEmail: "reporter@example.com",
                  reporterName: "Test Reporter",
                  domain: "example.com",
                  reportId: "2024-test-004",
                  begin: reportBeginDate,
                  end: reportEndDate
                })),
              },
            ],
          }),
          Error,
          "Message failed: 450 Rejected by DMARC validation policy"
        );
        setLoggerLevel("ERROR");

      } finally {
        client.close();

        // NOTE: Waiting 100ms to prevent race condition bug that leaks a setTimeout
        await new Promise(resolve => setTimeout(resolve, 100)); 

        await serverWithDmarc.stop();
      }
    });
  },
});

Deno.test({
  name: "SMTP Server Integration Tests with Reporter Validation",
  ignore: Deno.env.get("CI") === "true", // Skip on CI
  async fn(t) {
    setLoggerLevel("ERROR");

    await t.step("should reject email from untrusted reporter", async () => {
      const reportRepository = new MockDmarcReportRepository();
      const reportService = new DmarcReportService(reportRepository);
      const reporterRepository = new MockKnownReporterRepository();
      const reporterService = new KnownReporterService(reporterRepository);

      const server = new DmarcSMTPServer({
        port: TEST_PORT,
        host: TEST_HOST,
        closeTimeout: 100,
        validateDmarc: false,
        unknownReporterPolicy: UnknownReporterPolicy.REJECT,
        reportService,
        reporterService,
      });

      await server.start();

      const client = createTransport({
        host: TEST_HOST,
        port: TEST_PORT,
        secure: false
      });

      try {
        await client.verify();

        const reportBeginDate = new Date("2023-01-01T00:00:00Z");
        const reportEndDate = new Date("2023-01-02T00:00:00Z");

        setLoggerLevel("CRITICAL");
        // This should fail due to untrusted reporter
        await assertRejects(
          () => client.sendMail({
            from: "untrusted@example.com",
            to: ["dmarc-reports@yourdomain.com"],
            subject: "Report Domain: example.com Submitter: untrusted.example.com Report-ID: 2024-test-005",
            text: "DMARC Report",
            attachments: [
              {
                filename: `untrusted.example.com!example.com!${reportBeginDate.getTime()/1000}!${reportEndDate.getTime()/1000}.xml.gz`,
                content: gzipString(createTestDmarcReport({
                  reporterEmail: "untrusted@example.com",
                  reporterName: "Test Reporter",
                  domain: "example.com",
                  reportId: "2024-test-005",
                  begin: reportBeginDate,
                  end: reportEndDate
                })),
              },
            ],
          }),
          Error,
          "Untrusted DMARC reporter"
        );
        setLoggerLevel("ERROR");
      } finally {
        client.close();
        await new Promise(resolve => setTimeout(resolve, 100));
        await server.stop();
      }
    });

    await t.step("should accept email from trusted reporter", async () => {
      const reportRepository = new MockDmarcReportRepository();
      const reportService = new DmarcReportService(reportRepository);
      const reporterRepository = new MockKnownReporterRepository();
      const reporterService = new KnownReporterService(reporterRepository);

      // Create and verify a trusted reporter
      await reporterService.getOrCreateReporter("google.com", "Google");
      await reporterService.updateReporter("google.com", {
        status: "ACTIVE",
        trustLevel: "HIGH"
      });

      const server = new DmarcSMTPServer({
        port: TEST_PORT,
        host: TEST_HOST,
        closeTimeout: 100,
        validateDmarc: false,
        reportService,
        reporterService,
      });

      await server.start();

      const client = createTransport({
        host: TEST_HOST,
        port: TEST_PORT,
        secure: false
      });

      try {
        await client.verify();

        const reportBeginDate = new Date("2023-01-01T00:00:00Z");
        const reportEndDate = new Date("2023-01-02T00:00:00Z");

        // This should succeed with trusted reporter
        await client.sendMail({
          from: "dmarc-noreply@google.com",
          to: ["dmarc-reports@yourdomain.com"],
          subject: "Report Domain: example.com Submitter: google.com Report-ID: 2024-test-005",
          text: "DMARC Report",
          attachments: [
            {
              filename: `google.com!example.com!${reportBeginDate.getTime()/1000}!${reportEndDate.getTime()/1000}.xml.gz`,
              content: gzipString(createTestDmarcReport({
                reporterEmail: "dmarc-noreply@google.com",
                reporterName: "Test Reporter",
                domain: "example.com",
                reportId: "2024-test-005",
                begin: reportBeginDate,
                end: reportEndDate
              })),
            },
          ],
        });

      } finally {
        client.close();
        await new Promise(resolve => setTimeout(resolve, 100));
        await server.stop();
      }
    });

    await t.step("should handle unknown reporters according to policy", async () => {
      const reportRepository = new MockDmarcReportRepository();
      const reportService = new DmarcReportService(reportRepository);
      const reporterRepository = new MockKnownReporterRepository();
      const reporterService = new KnownReporterService(reporterRepository);

      // Test REJECT policy
      const rejectServer = new DmarcSMTPServer({
        port: TEST_PORT,
        host: TEST_HOST,
        closeTimeout: 100,
        validateDmarc: false,
        reportService,
        reporterService,
        unknownReporterPolicy: UnknownReporterPolicy.REJECT
      });

      await rejectServer.start();
      try {
        const client = createTransport({
          host: TEST_HOST,
          port: TEST_PORT,
          secure: false
        });

        const reportBeginDate = new Date("2023-01-01T00:00:00Z");
        const reportEndDate = new Date("2023-01-02T00:00:00Z");

        setLoggerLevel("CRITICAL");
        await assertRejects(
          () => client.sendMail({
            from: "unknown@example.com",
            to: ["dmarc-reports@yourdomain.com"],
            subject: "Report Domain: example.com Submitter: unknown.example.com Report-ID: 2024-test-005",
            text: "DMARC Report",
            attachments: [
              {
                filename: `unknown.example.com!example.com!${reportBeginDate.getTime()/1000}!${reportEndDate.getTime()/1000}.xml.gz`,
                content: gzipString(createTestDmarcReport({
                  reporterEmail: "unknown@example.com",
                  reporterName: "Test Reporter",
                  domain: "example.com",
                  reportId: "2024-test-005",
                  begin: reportBeginDate,
                  end: reportEndDate
                })),
              },
            ],
          }),
          Error,
          "Untrusted DMARC reporter"
        );
        setLoggerLevel("ERROR");

        client.close();
      } finally {
        await rejectServer.stop();
      }

      // Test ALLOW policy
      const allowServer = new DmarcSMTPServer({
        port: TEST_PORT,
        host: TEST_HOST,
        closeTimeout: 100,
        validateDmarc: false,
        reportService,
        reporterService,
        unknownReporterPolicy: UnknownReporterPolicy.ALLOW
      });

      await allowServer.start();
      try {
        const client = createTransport({
          host: TEST_HOST,
          port: TEST_PORT,
          secure: false
        });

        const reportBeginDate = new Date("2023-01-01T00:00:00Z");
        const reportEndDate = new Date("2023-01-02T00:00:00Z");

        // Should succeed and create reporter with LOW trust level
        await client.sendMail({
          from: "unknown@example.com",
          to: ["dmarc-reports@yourdomain.com"],
          subject: "Report Domain: example.com Submitter: unknown.example.com Report-ID: 2024-test-005",
          text: "DMARC Report",
          attachments: [
            {
              filename: `unknown.example.com!example.com!${reportBeginDate.getTime()/1000}!${reportEndDate.getTime()/1000}.xml.gz`,
              content: gzipString(createTestDmarcReport({
                reporterEmail: "unknown@example.com",
                reporterName: "Test Reporter",
                domain: "example.com",
                reportId: "2024-test-005",
                begin: reportBeginDate,
                end: reportEndDate
              })),
            },
          ],
        });

        const reporter = await reporterRepository.findByOrgEmail("unknown@example.com");
        assertEquals(reporter?.trustLevel, "UNTRUSTED");
        assertEquals(reporter?.status, "PENDING_REVIEW");

        client.close();
      } finally {
        await allowServer.stop();
      }
    });
  }
});
