import {
  DmarcReport,
  DmarcRecord,
  DKIMAuthResult,
  SPFAuthResult,
  PolicyOverrideReason,
  DispositionType,
  DMARCResultType,
  DmarcPolicyPublished,
  Identifiers,
  AuthResults,
  AlignmentType,
  DmarcReportMetadata,
  PolicyEvaluated,
  DateRange
} from "./types.ts";
import { XMLParser } from "fast-xml-parser";

interface DmarcXmlReportMetadata {
  org_name: string;
  email: string;
  extra_contact_info?: string;
  report_id: string;
  date_range: DmarcXmlDateRange;
  error?: string[];
}

interface DmarcXmlDateRange {
  begin: number;
  end: number;
}

interface DmarcXmlFeedback {
  version: number;
  report_metadata: DmarcXmlReportMetadata;
  policy_published: DmarcPolicyPublished;
  record: DmarcXmlRecord[];
}

interface DmarcXmlRecord {
  row: DmarcXmlRow;
  identifiers: Identifiers;
  auth_results: AuthResults;
}

interface DmarcXmlPolicyEvaluated {
  disposition: DispositionType;
  dkim: DMARCResultType;
  spf: DMARCResultType;
  reason?: PolicyOverrideReason[];
}

interface DmarcXmlRow {
  source_ip: string;
  count: number;
  policy_evaluated: DmarcXmlPolicyEvaluated;
}

export function parseDmarcReport(xmlContent: string): DmarcReport {
  const options = {
    ignoreAttributes: true,
    isArray: (name: string) => [
      'record',
      'error',
      'dkim',
      'spf',
      'reason'
    ].indexOf(name) !== -1
  };

  const parser = new XMLParser(options);
  const result = parser.parse(xmlContent);

  if (!result.feedback) {
    throw new Error("Invalid DMARC report: missing feedback element");
  }

  const feedback = result.feedback as DmarcXmlFeedback;

  // Convert Unix timestamps to Date objects
  const dateRange: DateRange = feedback.report_metadata?.date_range ? {
    begin: new Date(Number(feedback.report_metadata.date_range.begin) * 1000),
    end: new Date(Number(feedback.report_metadata.date_range.end) * 1000)
  } : undefined!;

  // Parse report metadata
  const reportMetadata: DmarcReportMetadata = {
    org_name: feedback.report_metadata?.org_name,
    email: feedback.report_metadata?.email,
    report_id: feedback.report_metadata?.report_id,
    date_range: dateRange
  };

  // Add optional fields if present
  if (feedback.report_metadata?.extra_contact_info) {
    reportMetadata.extra_contact_info = feedback.report_metadata.extra_contact_info;
  }
  if (feedback.report_metadata?.error) {
    reportMetadata.errors = feedback.report_metadata.error;
  }

  // Parse policy published
  const policyPublished: DmarcPolicyPublished = {
    domain: feedback.policy_published?.domain,
    adkim: feedback.policy_published?.adkim as AlignmentType,
    aspf: feedback.policy_published?.aspf as AlignmentType,
    p: feedback.policy_published?.p as DispositionType,
    sp: feedback.policy_published?.sp as DispositionType,
    pct: Number(feedback.policy_published?.pct),
  };

  // Add optional fields if present
  if (feedback.policy_published?.fo) {
    policyPublished.fo = feedback.policy_published.fo;
  }

  // Parse records
  const records: DmarcRecord[] = Array.isArray(feedback.record)
    ? feedback.record.map((record: DmarcXmlRecord) => {
      // Parse policy override reasons if present
      const reasons: PolicyOverrideReason[] | undefined = record.row.policy_evaluated?.reason
        ? (Array.isArray(record.row.policy_evaluated.reason)
          ? record.row.policy_evaluated.reason as PolicyOverrideReason[]
          : [record.row.policy_evaluated.reason as PolicyOverrideReason]
        )
        : undefined;

      // Parse DKIM auth results
      const dkimResults: DKIMAuthResult[] | undefined = record.auth_results?.dkim
        ? (Array.isArray(record.auth_results.dkim)
          ? record.auth_results.dkim as DKIMAuthResult[]
          : [record.auth_results.dkim as DKIMAuthResult]
        )
        : undefined;

      // Parse SPF auth results
      const spfResults: SPFAuthResult[] | undefined = record.auth_results?.spf
        ? (Array.isArray(record.auth_results.spf)
          ? record.auth_results.spf as SPFAuthResult[]
          : [record.auth_results.spf as SPFAuthResult]
        )
        : undefined;

      const policyEvaluated: PolicyEvaluated = {
        disposition: record.row.policy_evaluated?.disposition as DispositionType,
        dkim: record.row.policy_evaluated?.dkim?.[0] as DMARCResultType,
        spf: record.row.policy_evaluated?.spf?.[0] as DMARCResultType,
      };

      // Add optional fields if present
      if (reasons) {
        policyEvaluated.reasons = reasons;
      }
      
      return {
        row: {
          source_ip: record.row.source_ip,
          count: Number(record.row.count),
          policy_evaluated: policyEvaluated
        },
        identifiers: {
          envelope_to: record.identifiers?.envelope_to,
          envelope_from: record.identifiers?.envelope_from,
          header_from: record.identifiers?.header_from
        },
        auth_results: {
          dkim: dkimResults,
          spf: spfResults!
        }
      };
    })
    : [];

  return {
    version: feedback.version,
    report_metadata: reportMetadata,
    policy_published: policyPublished,
    records
  };
}

// Validation helper functions
export function validateDateRange(dateRange: { begin: Date; end: Date }): boolean {
  return (
    dateRange.begin instanceof Date &&
    dateRange.end instanceof Date &&
    !isNaN(dateRange.begin.getTime()) &&
    !isNaN(dateRange.end.getTime()) &&
    dateRange.begin <= dateRange.end
  );
}

function validateDmarcReport(report: DmarcReport): void {
  // Required fields according to schema
  if (!report.report_metadata.org_name) {
    throw new Error("Missing required field: org_name");
  }
  if (!report.report_metadata.email) {
    throw new Error("Missing required field: email");
  }
  if (!report.report_metadata.report_id) {
    throw new Error("Missing required field: report_id");
  }
  if (!report.report_metadata.date_range) {
    throw new Error("Missing required field: date_range");
  }
  if (!report.policy_published.domain) {
    throw new Error("Missing required field: policy domain");
  }

  // Validate each record
  report.records.forEach((record, index) => {
    if (!record.row.source_ip) {
      throw new Error(`Missing source_ip in record ${index}`);
    }
    if (typeof record.row.count !== 'number' || record.row.count < 0) {
      throw new Error(`Invalid count in record ${index}`);
    }
    if (!record.row.policy_evaluated.disposition) {
      throw new Error(`Missing disposition in record ${index}`);
    }
    if (!record.identifiers.header_from) {
      throw new Error(`Missing header_from in record ${index}`);
    }
    // NOTE: Some providers do not include envelope_from in the report
    // if (!record.identifiers.envelope_from) {
    //   throw new Error(`Missing envelope_from in record ${index}`);
    // }
    if (!record.auth_results.spf || record.auth_results.spf.length === 0) {
      throw new Error(`Missing SPF results in record ${index}`);
    }
  });
}

export function parseAndValidateDmarcReport(xmlContent: string): DmarcReport {
  try {
    const report = parseDmarcReport(xmlContent);
    validateDmarcReport(report);
    return report;
  } catch (error) {
    throw new Error(`Failed to parse DMARC report: ${error instanceof Error ? error.message : error}`);
  }
}
