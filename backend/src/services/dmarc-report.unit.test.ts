import { assertEquals, assertRejects } from "@std/assert";
import { DmarcReportService } from "./dmarc-report.ts";
import { MockDmarcReportRepository } from "../database/repositories/mock-dmarc-report.ts";
import { DmarcReport } from "../dmarc/types.ts";
import { setLoggerLevel } from "../utils/logger.ts";

const mockReport: DmarcReport = {
  version: 1,
  reportMetadata: {
    reportId: "test-report-1",
    dateRange: {
      begin: new Date("2023-01-01T00:00:00Z"),
      end: new Date("2023-01-02T00:00:00Z")
    },
    orgName: "Test Org",
    email: "test@example.com"
  },
  policyPublished: {
    domain: "example.com",
    adkim: "r",
    aspf: "r",
    p: "none",
    sp: "none",
    pct: 100,
    fo: "0"
  },
  records: [{
    row: {
      sourceIp: "192.0.2.1",
      count: 1,
      policyEvaluated: {
        disposition: "none",
        dkim: "pass",
        spf: "pass"
      }
    },
    identifiers: {
      headerFrom: "example.com"
    },
    authResults: {
      dkim: [{
        domain: "example.com",
        result: "pass",
        selector: "default"
      }],
      spf: [{
        domain: "example.com",
        scope: "mfrom",
        result: "pass"
      }]
    }
  }]
};

Deno.test("DmarcReportService - processReport", async (t) => {
  setLoggerLevel("ERROR"); // Reduce log noise while running tests
  await t.step("successfully processes new report", async () => {
    const repository = new MockDmarcReportRepository();
    const service = new DmarcReportService(repository);
    const mailDate = new Date();

    await service.processReport(mockReport, mailDate);

    const savedReport = await repository.findByReportIdAndOrg(
      mockReport.reportMetadata.reportId,
      mockReport.reportMetadata.orgName
    );

    assertEquals(savedReport?.reportId, mockReport.reportMetadata.reportId);
    assertEquals(savedReport?.orgName, mockReport.reportMetadata.orgName);
    assertEquals(savedReport?.mailDate, mailDate);
  });

  await t.step("skips processing duplicate report", async () => {
    const repository = new MockDmarcReportRepository();
    const service = new DmarcReportService(repository);
    const mailDate = new Date();

    // Process report first time
    await service.processReport(mockReport, mailDate);
    
    // Process same report second time
    await service.processReport(mockReport, mailDate);

    // Verify only one report was saved
    const reports = await repository.findByDateRange(
      new Date(mockReport.reportMetadata.dateRange.begin),
      new Date(mockReport.reportMetadata.dateRange.end)
    );
    assertEquals(reports.length, 1);
  });

  await t.step("handles repository errors", async () => {
    const repository = new MockDmarcReportRepository();
    repository.create = () => Promise.reject(new Error("Database error"));
    const service = new DmarcReportService(repository);

    setLoggerLevel("CRITICAL");
    await assertRejects(
      () => service.processReport(mockReport, new Date()),
      Error,
      "Database error"
    );
    setLoggerLevel("ERROR");
  });
});
