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
  org_name: string;
  email: string;
  extra_contact_info?: string;
  report_id: string;
  date_range: DateRange;
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
  human_result?: string;
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
  envelope_to?: string;
  envelope_from?: string;
  header_from: string;
}

export interface Row {
  source_ip: string;
  count: number;
  policy_evaluated: PolicyEvaluated;
}

export interface DmarcRecord {
  row: Row;
  identifiers: Identifiers;
  auth_results: AuthResults;
}

export interface DmarcReport {
  version: number;
  report_metadata: DmarcReportMetadata;
  policy_published: DmarcPolicyPublished;
  records: DmarcRecord[];
}
