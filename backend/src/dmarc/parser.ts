import { XMLParser } from "fast-xml-parser";
import type * as DmarcXmlTypes from "./xmlTypes.ts";
import type * as DmarcTypes from "./types.ts";

export function parseDmarcReport(xmlContent: string): DmarcTypes.DmarcReport {
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

  const feedback = result.feedback as DmarcXmlTypes.Feedback;

  // Convert Unix timestamps to Date objects
  const dateRange: DmarcTypes.DateRange = feedback.report_metadata?.date_range ? {
    begin: new Date(Number(feedback.report_metadata.date_range.begin) * 1000),
    end: new Date(Number(feedback.report_metadata.date_range.end) * 1000)
  } : undefined!;

  // Parse report metadata
  const reportMetadata: DmarcTypes.DmarcReportMetadata = {
    orgName: feedback.report_metadata?.org_name,
    email: feedback.report_metadata?.email,
    reportId: feedback.report_metadata?.report_id,
    dateRange: dateRange,
    ...("extra_contact_info" in feedback.report_metadata && { extraContactInfo: feedback.report_metadata.extra_contact_info }),
    ...("error" in feedback.report_metadata && { errors: feedback.report_metadata.error }),
  };

  // Parse policy published
  const policyPublished: DmarcTypes.DmarcPolicyPublished = {
    domain: feedback.policy_published?.domain,
    ...("adkim" in feedback.policy_published && { adkim: feedback.policy_published.adkim as DmarcTypes.AlignmentType }),
    ...("aspf" in feedback.policy_published && { aspf: feedback.policy_published.aspf as DmarcTypes.AlignmentType }),
    p: feedback.policy_published?.p as DmarcTypes.DispositionType,
    sp: feedback.policy_published?.sp as DmarcTypes.DispositionType,
    pct: Number(feedback.policy_published?.pct),
    ...("fo" in feedback.policy_published && { fo: feedback.policy_published.fo }),
  };

  // Parse records
  const records: DmarcTypes.DmarcRecord[] = Array.isArray(feedback.record)
    ? feedback.record.map((record: DmarcXmlTypes.Record) => {
      // Parse policy override reasons if present
      const reasons: DmarcTypes.PolicyOverrideReason[] | undefined = record.row.policy_evaluated?.reason
        ? record.row.policy_evaluated.reason.map((reason) => ({
          type: reason.type,
          ...("comment" in reason && { comment: reason.comment })
        }))
        : undefined;

      // Parse DKIM auth results
      const dkimResults: DmarcTypes.DKIMAuthResult[] | undefined = record.auth_results?.dkim
        ? record.auth_results.dkim.map((dkim) => ({
          domain: dkim.domain,
          ...("selector" in dkim && { selector: dkim.selector }),
          result: dkim.result,
          ...("human_result" in dkim && { humanResult: dkim.human_result })
        }))
        : undefined;

      // Parse SPF auth results
      const spfResults: DmarcTypes.SPFAuthResult[] | undefined = record.auth_results?.spf
        ? record.auth_results.spf.map((spf) => ({
          domain: spf.domain,
          scope: spf.scope,
          result: spf.result
        }))
        : undefined;

      const policyEvaluated: DmarcTypes.PolicyEvaluated = {
        disposition: record.row.policy_evaluated?.disposition as DmarcTypes.DispositionType,
        dkim: record.row.policy_evaluated?.dkim?.[0] as DmarcTypes.DMARCResultType,
        spf: record.row.policy_evaluated?.spf?.[0] as DmarcTypes.DMARCResultType,
        ...(record.row.policy_evaluated && "reason" in record.row.policy_evaluated && { reasons }),
      };
      
      return {
        row: {
          sourceIp: record.row.source_ip,
          count: Number(record.row.count),
          policyEvaluated: policyEvaluated
        },
        identifiers: {
          ...(record.identifiers && "envelope_to" in record.identifiers && { envelopeTo: record.identifiers.envelope_to }),
          ...(record.identifiers && "envelope_from" in record.identifiers && { envelopeFrom: record.identifiers.envelope_from }),
          headerFrom: record.identifiers?.header_from
        },
        authResults: {
          ...(record.auth_results && "dkim" in record.auth_results && { dkim: dkimResults }),
          spf: spfResults!
        }
      };
    })
    : [];

  return {
    version: feedback.version,
    reportMetadata: reportMetadata,
    policyPublished: policyPublished,
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

function validateDmarcReport(report: DmarcTypes.DmarcReport): void {
  // Required fields according to schema
  if (!report.reportMetadata.orgName) {
    throw new Error("Missing required field: org_name");
  }
  if (!report.reportMetadata.email) {
    throw new Error("Missing required field: email");
  }
  if (!report.reportMetadata.reportId) {
    throw new Error("Missing required field: report_id");
  }
  if (!report.reportMetadata.dateRange) {
    throw new Error("Missing required field: date_range");
  }
  if (!report.policyPublished.domain) {
    throw new Error("Missing required field: policy domain");
  }

  // Validate each record
  report.records.forEach((record, index) => {
    if (!record.row.sourceIp) {
      throw new Error(`Missing source_ip in record ${index}`);
    }
    if (typeof record.row.count !== 'number' || record.row.count < 0) {
      throw new Error(`Invalid count in record ${index}`);
    }
    if (!record.row.policyEvaluated.disposition) {
      throw new Error(`Missing disposition in record ${index}`);
    }
    if (!record.identifiers.headerFrom) {
      throw new Error(`Missing header_from in record ${index}`);
    }
    // NOTE: Some providers do not include envelope_from in the report
    // if (!record.identifiers.envelope_from) {
    //   throw new Error(`Missing envelope_from in record ${index}`);
    // }
    if (!record.authResults.spf || record.authResults.spf.length === 0) {
      throw new Error(`Missing SPF results in record ${index}`);
    }
  });
}

export function parseAndValidateDmarcReport(xmlContent: string): DmarcTypes.DmarcReport {
  try {
    const report = parseDmarcReport(xmlContent);
    validateDmarcReport(report);
    return report;
  } catch (error) {
    throw new Error(`Failed to parse DMARC report: ${error instanceof Error ? error.message : error}`);
  }
}
