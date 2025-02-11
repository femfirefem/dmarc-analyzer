import { DmarcReportService } from "../services/dmarc-report.ts";

export interface DmarcSMTPServerOptions {
  port?: number;
  host?: string;
  tls?: boolean;
  strictSubject?: boolean;
  strictFilename?: boolean;
  validateDmarc?: boolean;
  dmarcReject?: boolean;
  closeTimeout?: number;
  reportService?: DmarcReportService | undefined;
}
