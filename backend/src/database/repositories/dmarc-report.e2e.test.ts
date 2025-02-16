import { assertEquals, assertExists } from "@std/assert";
import { TestDatabase } from "../testing/db-test-utils.ts";
import { DmarcReportRepository } from "./dmarc-report.ts";
import { CreateDmarcReportData } from "./types.ts";
import { setLoggerLevel } from "../../utils/logger.ts";

Deno.test({
  name: "DmarcReportRepository Integration Tests",
  ignore: Deno.env.get("MOCK_DB")?.toLowerCase() === "true", // Skip when mocking DB
  async fn(t) {
    const repository = new DmarcReportRepository();
    
    // Setup test database before tests
    await TestDatabase.init();

    const testReportData: CreateDmarcReportData = {
      mailDate: new Date(),
      reportId: "TEST-001",
      orgName: "Test Organization",
      orgEmail: "test@example.com",
      beginDate: new Date("2024-01-01"),
      endDate: new Date("2024-01-02"),
      domain: "example.com",
      adkim: "RELAXED",
      aspf: "RELAXED",
      policy: "NONE",
      subdomainPolicy: "NONE",
      percentage: 100,
      failureReporting: "ZERO",
      records: [{
        sourceIp: "192.0.2.1",
        count: 1,
        disposition: "NONE",
        dkim: "PASS",
        spf: "PASS",
        headerFrom: "example.com",
        dkimDomain: "example.com",
        dkimResult: "PASS",
        spfDomain: "example.com",
        spfResult: "PASS"
      }]
    };

    await t.step("should create DMARC report", async () => {
      const report = await repository.create(testReportData);
      assertExists(report.id);
      assertEquals(report.reportId, testReportData.reportId);
      assertEquals(report.orgName, testReportData.orgName);
      assertEquals(report.records.length, 1);
    });

    await t.step("should find report by reportId and orgName", async () => {
      const report = await repository.findByReportIdAndOrg(
        testReportData.reportId,
        testReportData.orgName
      );
      assertExists(report);
      assertEquals(report.domain, testReportData.domain);
    });

    await t.step("should find reports by date range", async () => {
      const reports = await repository.findByDateRange(
        new Date("2024-01-01"),
        new Date("2024-01-02")
      );
      assertEquals(reports.length, 1);
      assertEquals(reports[0].reportId, testReportData.reportId);
    });

    await t.step("should prevent duplicate reports", async () => {
      // Suppress the error log when the report already exists
      setLoggerLevel("CRITICAL");
      try {
        await repository.create(testReportData);
        throw new Error("Should not allow duplicate report");
      } catch (error) {
        assertEquals((error as Error).message, "Report already exists");
      }
      // Restore the logger level
      setLoggerLevel("ERROR");
    });

    // Cleanup test database after tests
    await TestDatabase.cleanup();
  }
}); 