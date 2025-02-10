import { assertEquals, assertExists } from "@std/assert";
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
    const server = new DmarcSMTPServer(TEST_PORT, TEST_HOST, reportService);
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
        subject: "Report Domain: example.com",
        text: "DMARC Report for example.com",
        attachments: [
          {
            filename: "report.xml.gz",
            content: gzipString(createTestDmarcReport("example.com", reportBeginDate, reportEndDate)),
          },
        ],
      });
      setLoggerLevel("ERROR");

      assertExists(result);
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
      await server.stop();
    });
  },
  sanitizeOps: false,
  sanitizeResources: false,
}); 