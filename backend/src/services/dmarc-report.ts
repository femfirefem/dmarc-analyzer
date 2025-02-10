import { DmarcReportRepository } from "../database/repositories/dmarc-report.ts";
import { DmarcReport } from "../dmarc/types.ts";
import { logger } from "../utils/logger.ts";
import type { PolicyType, AuthResult, AlignmentMode, FailureReporting } from "@prisma/client";
import { MockDmarcReportRepository } from "../database/repositories/mock-dmarc-report.ts";
import { IDmarcReportRepository, CreateDmarcReportData } from "../database/repositories/types.ts";

export class DmarcReportService {
  private repository: IDmarcReportRepository;

  constructor() {
    this.repository = Deno.env.get("MOCK_DB")?.toLowerCase() === "true" ?
      new MockDmarcReportRepository() : new DmarcReportRepository();
  }

  async processReport(report: DmarcReport, mailDate: Date): Promise<void> {
    try {
      const existingReport = await this.repository.findByReportIdAndOrg(
        report.reportMetadata.reportId,
        report.reportMetadata.orgName
      );

      if (existingReport) {
        logger.info('Report already exists, skipping', {
          reportId: report.reportMetadata.reportId,
          orgName: report.reportMetadata.orgName
        });
        return;
      }

      const data: CreateDmarcReportData = {
        mailDate,
        reportId: report.reportMetadata.reportId,
        orgName: report.reportMetadata.orgName,
        orgEmail: report.reportMetadata.email,
        beginDate: new Date(report.reportMetadata.dateRange.begin),
        endDate: new Date(report.reportMetadata.dateRange.end),
        domain: report.policyPublished.domain,
        adkim: report.policyPublished.adkim as AlignmentMode,
        aspf: report.policyPublished.aspf as AlignmentMode,
        policy: report.policyPublished.p as PolicyType,
        subdomainPolicy: report.policyPublished.sp as PolicyType,
        percentage: report.policyPublished.pct,
        failureReporting: report.policyPublished.fo as FailureReporting,
        records: report.records.map(record => ({
          sourceIp: record.row.sourceIp,
          count: record.row.count,
          disposition: record.row.policyEvaluated.disposition as PolicyType,
          dkim: record.row.policyEvaluated.dkim as AuthResult,
          spf: record.row.policyEvaluated.spf as AuthResult,
          headerFrom: record.identifiers.headerFrom,
          dkimDomain: record.authResults.dkim?.[0]?.domain,
          dkimResult: record.authResults.dkim?.[0]?.result as AuthResult,
          dkimSelector: record.authResults.dkim?.[0]?.selector,
          spfDomain: record.authResults.spf?.[0]?.domain,
          spfResult: record.authResults.spf?.[0]?.result as AuthResult,
        }))
      };

      await this.repository.create(data);
      logger.info('Successfully saved DMARC report to database', {
        reportId: data.reportId,
        orgName: data.orgName
      });
    } catch (error) {
      logger.error('Failed to process DMARC report:', error);
      throw error;
    }
  }
} 