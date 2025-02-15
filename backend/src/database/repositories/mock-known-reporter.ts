import { KnownReporter } from "@prisma/client";
import { CreateKnownReporterData, IKnownReporterRepository, UpdateKnownReporterData } from "./types.ts";

export class MockKnownReporterRepository implements IKnownReporterRepository {
  private reporters: KnownReporter[] = [];

  create(data: CreateKnownReporterData): Promise<KnownReporter> {
    const reporter: KnownReporter = {
      id: Math.random().toString(),
      domain: data.domain,
      orgName: data.orgName,
      firstSeen: new Date(),
      lastSeen: new Date(),
      trustLevel: data.trustLevel ?? "UNTRUSTED",
      status: data.status ?? "PENDING_REVIEW",
      notes: data.notes ?? null,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.reporters.push(reporter);
    return Promise.resolve(reporter);
  }

  findByDomain(domain: string): Promise<KnownReporter | null> {
    return Promise.resolve(this.reporters.find(r => r.domain === domain) ?? null);
  }

  async update(domain: string, data: UpdateKnownReporterData): Promise<KnownReporter> {
    const reporter = await this.findByDomain(domain);
    if (!reporter) throw new Error(`Reporter not found: ${domain}`);

    const updated = {
      ...reporter,
      ...data,
      updatedAt: new Date()
    };

    this.reporters = this.reporters.map(r => 
      r.domain === domain ? updated : r
    );

    return updated;
  }

  async updateLastSeen(domain: string): Promise<KnownReporter> {
    return await this.update(domain, {});
  }

  list(): Promise<KnownReporter[]> {
    return Promise.resolve([...this.reporters].sort((a, b) => 
      b.lastSeen.getTime() - a.lastSeen.getTime()
    ));
  }
} 