import { assertEquals, assertExists, assertRejects } from "@std/assert";
import { DmarcSMTPServer } from "./server.ts";
import { createTransport } from "nodemailer";
import { createTestDmarcReport } from "./test_utils.ts";
import { gzipString } from "../utils/compression.ts";
import { setLoggerLevel } from "../utils/logger.ts";
import { DmarcReportService } from "../services/dmarc-report.ts";
import { MockDmarcReportRepository } from "../database/repositories/mock-dmarc-report.ts";

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

      setLoggerLevel("ERROR");
      const result = await client.sendMail({
        from: "reporter@example.com",
        to: ["dmarc-reports@yourdomain.com"],
        subject: "Report Domain: example.com Submitter: reporter.example.com Report-ID: 2024-test-001",
        text: "DMARC Report for example.com",
        attachments: [
          {
            filename: `reporter.example.com!example.com!${reportBeginDate.getTime()/1000}!${reportEndDate.getTime()/1000}.xml.gz`,
            content: gzipString(createTestDmarcReport("example.com", "2024-test-001", reportBeginDate, reportEndDate)),
          },
        ],
      });
      setLoggerLevel("ERROR");

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
              content: gzipString(createTestDmarcReport("example.com", "2024-test-002", reportBeginDate, reportEndDate)),
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
              content: gzipString(createTestDmarcReport("example.com", "2024-test-003", reportBeginDate, reportEndDate)),
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
                filename: "report.xml.gz",
                content: gzipString(createTestDmarcReport("example.com", "2024-test-004", new Date(), new Date())),
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
