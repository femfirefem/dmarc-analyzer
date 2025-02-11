/**
 * Checks if email subject matches DMARC report format and extracts relevant information
 * Example valid subjects:
 * - "Report Domain: example.com"
 * - "Report Domain: example.com Submitter: google.com Report-ID: abc123"
 * - "[Preview] Report Domain: example.com Submitter: google.com Report-ID: <abc123@google.com>"
 * 
 * @returns Object with domain and optional submitter,reportId and tag if found, or null if invalid format
 */
export function parseDmarcReportSubject(subject: string): DmarcEmailSubject | null {
  const pattern = /^(?:\[([\w ]+)\]\s*)?Report\s+Domain:\s*([a-zA-Z0-9][a-zA-Z0-9-_.]+[a-zA-Z0-9])(?:\s+Submitter:\s*([a-zA-Z0-9][a-zA-Z0-9-_.]+[a-zA-Z0-9]))?\s*(?:Report-ID:\s*(?:<)?([^>\s]+)(?:>)?)?$/i;
  
  const match = subject.trim().match(pattern);
  if (!match) {
    return null;
  }

  const [, tag, domain, submitter, reportId] = match;
  
  const result: { 
    tag?: string;
    domain: string;
    submitter?: string;
    reportId?: string;
  } = {
    ...(tag && { tag }),
    domain,
    ...(submitter && { submitter }),
    ...(reportId && { reportId }),
  };

  return result;
};

export interface DmarcEmailSubject {
  tag?: string;
  domain: string;
  submitter?: string;
  reportId?: string;
};

/**
 * Validates a DMARC report filename format
 * Format: {submitter}!{domain}!{begin}!{end}.{extension}
 * 
 * @param filename The filename to validate
 * @returns Object with parsed components if valid, null if invalid
 */
export function parseDmarcReportFilename(filename: string): DmarcReportFilename | null {
  const pattern = /^((?:[a-zA-Z0-9_-]+\.)+[a-zA-Z]{2,})!((?:[a-zA-Z0-9_-]+\.)+[a-zA-Z]{2,})\!(\d+)\!(\d+)((?:\.[^.]+)*)$/;
  
  const match = filename.match(pattern);
  
  if (!match) {
    return null;
  }

  const [_, submitter, domain, begin, end, extension] = match;

  return {
    submitter,
    domain,
    begin: Number(begin),
    end: Number(end),
    extension
  };
}

export interface DmarcReportFilename {
  submitter: string;
  domain: string; 
  begin: number;
  end: number;
  extension: string;
}
