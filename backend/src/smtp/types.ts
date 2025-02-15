import { DmarcReportService } from "../services/dmarc-report.ts";
import { KnownReporterService } from "../services/known-reporter.ts";

export enum UnknownReporterPolicy {
  REJECT = 'reject',    // Reject emails from unknown reporters
  ALLOW = 'allow',      // Accept emails from unknown reporters
  IGNORE = 'ignore'     // Ignore unknown reporters
}

export interface DmarcSMTPServerOptions {
  port?: number;
  host?: string;
  tls?: boolean;
  strictSubject?: boolean;
  strictFilename?: boolean;
  validateDmarc?: boolean;
  dmarcReject?: boolean;
  closeTimeout?: number;
  reportService?: DmarcReportService;
  reporterService?: KnownReporterService;
  unknownReporterPolicy?: UnknownReporterPolicy;  // Add policy option
}
