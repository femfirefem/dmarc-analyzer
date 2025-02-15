import type { AlignmentMode, PolicyType, FailureReporting, AuthResult, DmarcReport, KnownReporter, ReporterTrustLevel, ReporterStatus } from "@prisma/client";

export interface IDmarcReportRepository {
  create(data: CreateDmarcReportData): Promise<DmarcReport>;
  findByReportIdAndOrg(reportId: string, orgName: string): Promise<DmarcReport | null>;
  findByDateRange(start: Date, end: Date): Promise<DmarcReport[]>;
}

export interface CreateDmarcReportData {
  mailDate: Date;
  reportId: string;
  orgName: string;
  orgEmail?: string | null;
  beginDate: Date;
  endDate: Date;
  domain: string;
  adkim?: AlignmentMode | null;
  aspf?: AlignmentMode | null;
  policy: PolicyType;
  subdomainPolicy?: PolicyType | null;
  percentage?: number | null;
  failureReporting?: FailureReporting | null;
  reporterId?: string | null;
  records: {
    sourceIp: string;
    count: number;
    disposition: PolicyType;
    dkim: AuthResult;
    spf: AuthResult;
    headerFrom: string;
    dkimDomain?: string | null;
    dkimResult?: AuthResult | null;
    dkimSelector?: string | null;
    spfDomain?: string | null;
    spfResult?: AuthResult | null;
  }[];
}

export interface CreateKnownReporterData {
  domain: string;
  orgName: string;
  trustLevel?: ReporterTrustLevel;
  status?: ReporterStatus;
  notes?: string;
}

export interface UpdateKnownReporterData {
  orgName?: string;
  trustLevel?: ReporterTrustLevel;
  status?: ReporterStatus;
  notes?: string;
}

export interface IKnownReporterRepository {
  create(data: CreateKnownReporterData): Promise<KnownReporter>;
  findByDomain(domain: string): Promise<KnownReporter | null>;
  update(domain: string, data: UpdateKnownReporterData): Promise<KnownReporter>;
  updateLastSeen(domain: string): Promise<KnownReporter>;
  list(): Promise<KnownReporter[]>;
}
