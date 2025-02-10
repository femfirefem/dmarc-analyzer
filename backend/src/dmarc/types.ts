// Alignment mode (relaxed or strict) for DKIM and SPF
export type AlignmentType = "r" | "s";

// The policy actions specified by p and sp
export type DispositionType = "none" | "quarantine" | "reject";

// DMARC authentication result
export type DMARCResultType = "pass" | "fail";

// SPF result types
export type SPFResultType = "none" | "neutral" | "pass" | "fail" | "softfail" | "temperror" | "permerror";

// DKIM verification result
export type DKIMResultType = "none" | "pass" | "fail" | "policy" | "neutral" | "temperror" | "permerror";

// Policy override reasons
export type PolicyOverrideType = "forwarded" | "sampled_out" | "trusted_forwarder" | "mailing_list" | "local_policy" | "other";

export interface PolicyOverrideReason {
  type: PolicyOverrideType;
  comment?: string;
}

export interface DateRange {
  begin: Date;
  end: Date;
}

export interface DmarcReportMetadata {
  orgName: string;
  email: string;
  extraContactInfo?: string;
  reportId: string;
  dateRange: DateRange;
  errors?: string[];
}

export interface DmarcPolicyPublished {
  domain: string;
  adkim?: AlignmentType;
  aspf?: AlignmentType;
  p: DispositionType;
  sp: DispositionType;
  pct: number;
  fo?: string;
}

export interface PolicyEvaluated {
  disposition: DispositionType;
  dkim: DMARCResultType;
  spf: DMARCResultType;
  reasons?: PolicyOverrideReason[];
}

export interface DKIMAuthResult {
  domain: string;
  selector?: string;
  result: DKIMResultType;
  humanResult?: string;
}

export interface SPFAuthResult {
  domain: string;
  scope: "helo" | "mfrom";
  result: SPFResultType;
}

export interface AuthResults {
  dkim?: DKIMAuthResult[];
  spf: SPFAuthResult[];
}

export interface Identifiers {
  envelopeTo?: string;
  envelopeFrom?: string;
  headerFrom: string;
}

export interface Row {
  sourceIp: string;
  count: number;
  policyEvaluated: PolicyEvaluated;
}

export interface DmarcRecord {
  row: Row;
  identifiers: Identifiers;
  authResults: AuthResults;
}

export interface DmarcReport {
  version: number;
  reportMetadata: DmarcReportMetadata;
  policyPublished: DmarcPolicyPublished;
  records: DmarcRecord[];
}
