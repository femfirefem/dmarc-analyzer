import { PrismaClient, KnownReporter } from "@prisma/client";
import { CreateKnownReporterData, IKnownReporterRepository, UpdateKnownReporterData } from "./types.ts";
import { getPrismaClient } from "../client.ts";

export class KnownReporterRepository implements IKnownReporterRepository {
  constructor(private prisma: PrismaClient = getPrismaClient()) {}

  async create(data: CreateKnownReporterData): Promise<KnownReporter> {
    return await this.prisma.knownReporter.create({
      data
    });
  }

  async findByOrgEmail(orgEmail: string): Promise<KnownReporter | null> {
    return await this.prisma.knownReporter.findUnique({
      where: { orgEmail }
    });
  }

  async update(orgEmail: string, data: UpdateKnownReporterData): Promise<KnownReporter> {
    return await this.prisma.knownReporter.update({
      where: { orgEmail },
      data
    });
  }

  async updateLastSeen(orgEmail: string): Promise<KnownReporter> {
    return await this.prisma.knownReporter.update({
      where: { orgEmail },
      data: {
        lastSeen: new Date()
      }
    });
  }

  async list(): Promise<KnownReporter[]> {
    return await this.prisma.knownReporter.findMany({
      orderBy: {
        lastSeen: 'desc'
      }
    });
  }
} 