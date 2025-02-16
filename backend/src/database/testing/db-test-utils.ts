import { PrismaClient } from "@prisma/client";
import { getPrismaClient, disconnectDatabase } from "../client.ts";
import { logger } from "../../utils/logger.ts";

export class TestDatabase {
  private static client: PrismaClient;

  static async init(): Promise<PrismaClient> {
    // Initialize Prisma client
    this.client = getPrismaClient();

    // Clear all test data
    await this.clearAllTables();

    return this.client;
  }

  static async cleanup(): Promise<void> {
    try {
      await this.clearAllTables();
      await disconnectDatabase();
    } catch (error) {
      logger.error("Failed to cleanup test database:", error);
      throw error;
    }
  }

  private static async clearAllTables(): Promise<void> {
    try {
      // Delete in correct order to handle foreign key constraints
      await this.client.record.deleteMany();
      await this.client.dmarcReport.deleteMany();
      await this.client.knownReporter.deleteMany();
    } catch (error) {
      logger.error("Failed to clear test database tables:", error);
      throw error;
    }
  }
} 