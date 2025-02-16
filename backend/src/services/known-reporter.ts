import { KnownReporter } from "@prisma/client";
import { IKnownReporterRepository, UpdateKnownReporterData } from "../database/repositories/types.ts";
import { logger } from "../utils/logger.ts";
import { MockKnownReporterRepository } from "../database/repositories/mock-known-reporter.ts";
import { KnownReporterRepository } from "../database/repositories/known-reporter.ts";

export class KnownReporterService {
  private repository: IKnownReporterRepository;

  constructor(repository: IKnownReporterRepository | undefined = undefined) {
    this.repository = repository ?? (
      Deno.env.get("MOCK_DB")?.toLowerCase() === "true" ?
      new MockKnownReporterRepository() : new KnownReporterRepository()
    );
  }

  async getOrCreateReporter(orgEmail: string, orgName: string, submitter?: string): Promise<KnownReporter> {
    try {
      const existing = await this.repository.findByOrgEmail(orgEmail);
      if (existing) {
        await this.repository.updateLastSeen(orgEmail);
        return existing;
      }

      logger.debug(`Creating new reporter record`, { 
        orgEmail, 
        orgName,
        submitter 
      });

      return await this.repository.create({
        orgEmail,
        orgName,
        submitter,  // Only set on first creation
        trustLevel: "UNTRUSTED",
        status: "PENDING_REVIEW"
      });
    } catch (error) {
      logger.error(`Failed to get or create reporter`, { 
        orgEmail, 
        orgName,
        submitter,
        error 
      });
      throw error;
    }
  }

  async validateReporter(orgEmail: string): Promise<boolean> {
    try {
      const reporter = await this.repository.findByOrgEmail(orgEmail);
      if (!reporter) return false;

      // Update last seen timestamp
      await this.repository.updateLastSeen(orgEmail);

      // Check if reporter is allowed to send reports
      return reporter.status === "ACTIVE" &&
             reporter.trustLevel !== "UNTRUSTED";
    } catch (error) {
      logger.error(`Failed to validate reporter`, { orgEmail, error });
      return false;
    }
  }

  async updateReporter(orgEmail: string, data: UpdateKnownReporterData): Promise<KnownReporter> {
    try {
      return await this.repository.update(orgEmail, data);
    } catch (error) {
      logger.error(`Failed to update reporter`, { orgEmail, data, error });
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