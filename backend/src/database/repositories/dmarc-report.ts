import { DmarcReport } from "@prisma/client";
import { getPrismaClient } from "../client.ts";
import { logger } from "../../utils/logger.ts";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { CreateDmarcReportData, IDmarcReportRepository } from "./types.ts";

export class DmarcReportRepository implements IDmarcReportRepository {
  private prisma = getPrismaClient();

  async create(data: CreateDmarcReportData): Promise<DmarcReport> {
    try {
      return await this.prisma.dmarcReport.create({
        data: {
          mailDate: data.mailDate,
          reportId: data.reportId,
          orgName: data.orgName,
          orgEmail: data.orgEmail,
          beginDate: data.beginDate,
          endDate: data.endDate,
          domain: data.domain,
          adkim: data.adkim,
          aspf: data.aspf,
          policy: data.policy,
          subdomainPolicy: data.subdomainPolicy,
          percentage: data.percentage,
          failureReporting: data.failureReporting,
          records: {
            create: data.records
          }
        },
        include: {
          records: true
        }
      });
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          logger.warn('Duplicate DMARC report detected', {
            reportId: data.reportId,
            orgName: data.orgName
          });
          throw new Error('Report already exists');
        }
      }
      logger.error(`Failed to create DMARC report: ${error instanceof Error ? error.message : error}`, {
        reportId: data.reportId,
        orgName: data.orgName,
        error,
      });
      throw error;
    }
  }

  async findByReportIdAndOrg(reportId: string, orgName: string): Promise<DmarcReport | null> {
    return await this.prisma.dmarcReport.findUnique({
      where: {
        reportId_orgName: {
          reportId,
          orgName
        }
      },
      include: {
        records: true
      }
    });
  }

  async findByDateRange(start: Date, end: Date): Promise<DmarcReport[]> {
    return await this.prisma.dmarcReport.findMany({
      where: {
        beginDate: {
          gte: start
        },
        endDate: {
          lte: end
        }
      },
      include: {
        records: true
      }
    });
  }
} 