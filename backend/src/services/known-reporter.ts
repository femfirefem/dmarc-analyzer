import { KnownReporter } from "@prisma/client";
import { IKnownReporterRepository, UpdateKnownReporterData } from "../database/repositories/types.ts";
import { logger } from "../utils/logger.ts";

export class KnownReporterService {
  constructor(private repository: IKnownReporterRepository) {}

  async getOrCreateReporter(domain: string, orgName: string): Promise<KnownReporter> {
    try {
      const existing = await this.repository.findByDomain(domain);
      if (existing) {
        await this.repository.updateLastSeen(domain);
        return existing;
      }

      logger.info(`Creating new reporter record`, { domain, orgName });
      return await this.repository.create({
        domain,
        orgName,
        trustLevel: "UNTRUSTED",
        status: "PENDING_REVIEW"
      });
    } catch (error) {
      logger.error(`Failed to get or create reporter`, { domain, orgName, error });
      throw error;
    }
  }

  async validateReporter(domain: string): Promise<boolean> {
    try {
      const reporter = await this.repository.findByDomain(domain);
      if (!reporter) return false;

      // Update last seen timestamp
      await this.repository.updateLastSeen(domain);

      // Check if reporter is allowed to send reports
      return reporter.status === "ACTIVE" &&
             reporter.trustLevel !== "UNTRUSTED";
    } catch (error) {
      logger.error(`Failed to validate reporter`, { domain, error });
      return false;
    }
  }

  async updateReporter(domain: string, data: UpdateKnownReporterData): Promise<KnownReporter> {
    try {
      return await this.repository.update(domain, data);
    } catch (error) {
      logger.error(`Failed to update reporter`, { domain, data, error });
      throw error;
    }
  }

  async listReporters(): Promise<KnownReporter[]> {
    try {
      return await this.repository.list();
    } catch (error) {
      logger.error(`Failed to list reporters`, { error });
      throw error;
    }
  }
} 