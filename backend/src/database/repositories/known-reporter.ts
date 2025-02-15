import { PrismaClient, KnownReporter } from "@prisma/client";
import { CreateKnownReporterData, IKnownReporterRepository, UpdateKnownReporterData } from "./types.ts";

export class KnownReporterRepository implements IKnownReporterRepository {
  constructor(private prisma: PrismaClient) {}

  async create(data: CreateKnownReporterData): Promise<KnownReporter> {
    return await this.prisma.knownReporter.create({
      data
    });
  }

  async findByDomain(domain: string): Promise<KnownReporter | null> {
    return await this.prisma.knownReporter.findUnique({
      where: { domain }
    });
  }

  async update(domain: string, data: UpdateKnownReporterData): Promise<KnownReporter> {
    return await this.prisma.knownReporter.update({
      where: { domain },
      data
    });
  }

  async updateLastSeen(domain: string): Promise<KnownReporter> {
    return await this.prisma.knownReporter.update({
      where: { domain },
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