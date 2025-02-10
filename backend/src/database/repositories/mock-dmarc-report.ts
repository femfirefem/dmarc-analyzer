import { DmarcReport } from "@prisma/client";
import { CreateDmarcReportData, IDmarcReportRepository } from "./types.ts";

export class MockDmarcReportRepository implements IDmarcReportRepository {
  private reports: DmarcReport[] = [];

  create(data: CreateDmarcReportData): Promise<DmarcReport> {
    const report = {
      id: Math.random().toString(),
      mailDate: data.mailDate,
      processedDate: new Date(),
      reportId: data.reportId,
      orgName: data.orgName,
      orgEmail: data.orgEmail,
      beginDate: data.beginDate,
      endDate: data.endDate,
      domain: data.domain,
      adkim: data.adkim,
      aspf: data.aspf,
      policy: data.policy,
      subdomainPolicy: data.subdomainPolicy,
      percentage: data.percentage,
      failureReporting: data.failureReporting,
      records: data.records.map(record => ({
        id: Math.random().toString(),
        dmarcReportId: Math.random().toString(),
        ...record
      }))
    } as DmarcReport;

    this.reports.push(report);
    return Promise.resolve(report);
  }

  findByReportIdAndOrg(reportId: string, orgName: string): Promise<DmarcReport | null> {
    return Promise.resolve(this.reports.find(report => 
      report.reportId === reportId && report.orgName === orgName
    ) || null);
  }

  findByDateRange(start: Date, end: Date): Promise<DmarcReport[]> {
    return Promise.resolve(this.reports.filter(report =>
      report.beginDate >= start && report.endDate <= end
    ));
  }
}
