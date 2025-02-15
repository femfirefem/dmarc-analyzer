import { KnownReporter } from "@prisma/client";
import { CreateKnownReporterData, IKnownReporterRepository, UpdateKnownReporterData } from "./types.ts";

export class MockKnownReporterRepository implements IKnownReporterRepository {
  private reporters: KnownReporter[] = [];

  create(data: CreateKnownReporterData): Promise<KnownReporter> {
    const reporter: KnownReporter = {
      id: Math.random().toString(),
      orgEmail: data.orgEmail,
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

  findByOrgEmail(orgEmail: string): Promise<KnownReporter | null> {
    return Promise.resolve(this.reporters.find(r => r.orgEmail === orgEmail) ?? null);
  }

  async update(orgEmail: string, data: UpdateKnownReporterData): Promise<KnownReporter> {
    const reporter = await this.findByOrgEmail(orgEmail);
    if (!reporter) throw new Error(`Reporter not found: ${orgEmail}`);

    const updated = {
      ...reporter,
      ...data,
      updatedAt: new Date()
    };

    this.reporters = this.reporters.map(r => 
      r.orgEmail === orgEmail ? updated : r
    );

    return updated;
  }

  async updateLastSeen(orgEmail: string): Promise<KnownReporter> {
    return await this.update(orgEmail, {});
  }

  list(): Promise<KnownReporter[]> {
    return Promise.resolve([...this.reporters].sort((a, b) => 
      b.lastSeen.getTime() - a.lastSeen.getTime()
    ));
  }
} 