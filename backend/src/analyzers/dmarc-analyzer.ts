import { logger } from "../utils/logger.ts";

export type DmarcAlignment = "s" | "r";
export type DmarcPolicy = "none" | "quarantine" | "reject";

export interface DmarcRecord {
  v: string;
  p: DmarcPolicy;
  sp?: DmarcPolicy;
  rua?: string[];
  ruf?: string[];
  adkim?: DmarcAlignment;
  aspf?: DmarcAlignment;
  pct?: number;
  fo?: string[];
}

export class DmarcAnalyzer {
  static readonly DMARC_REGEX = /^v=DMARC1;(.+)$/i;
  static readonly TAG_REGEX = /([a-zA-Z]+)=((?:[^;\s"]+)|(?:"[^"]+"))/g;

  /**
   * Validates and parses a DMARC record
   */
  static validateRecord(record: string): DmarcRecord {
    const match = record.trim().match(this.DMARC_REGEX);
    if (!match) {
      throw new Error("Invalid DMARC record format: Must start with v=DMARC1");
    }

    const tags = this.parseTags(match[1]);
    this.validateRequiredTags(tags);
    this.validateTagValues(tags);

    return tags;
  }

  private static parseTags(tagString: string): DmarcRecord {
    const tags: Record<string, string | string[]> = {
      v: 'DMARC1' // Initialize with default version since we already validated it in DMARC_REGEX
    };
    let match;

    while ((match = this.TAG_REGEX.exec(tagString)) !== null) {
      const [, key, value] = match;
      
      // Handle quoted values
      const cleanValue = value.startsWith('"') ? 
        value.slice(1, -1) : value;

      // Handle special cases for URI lists
      if (key === 'rua' || key === 'ruf') {
        tags[key] = cleanValue.split(',').map(uri => uri.trim());
      } else if (key === 'fo') {
        tags[key] = cleanValue.split(':').map(v => v.trim());
      } else {
        tags[key] = cleanValue;
      }
    }

    return this.convertToRecord(tags);
  }

  private static validateRequiredTags(record: DmarcRecord): void {
    if (record.v !== 'DMARC1') {
      throw new Error("Invalid DMARC version");
    }

    if (!record.p) {
      throw new Error("Missing required policy (p) tag");
    }
  }

  private static validateTagValues(record: DmarcRecord): void {
    // Validate policy values
    const validPolicies: DmarcPolicy[] = ['none', 'quarantine', 'reject'];
    if (!validPolicies.includes(record.p)) {
      throw new Error(`Invalid policy value: ${record.p}`);
    }
    if (record.sp && !validPolicies.includes(record.sp)) {
      throw new Error(`Invalid subdomain policy value: ${record.sp}`);
    }

    // Validate alignment values
    const validAlignments: DmarcAlignment[] = ['s', 'r'];
    if (record.adkim && !validAlignments.includes(record.adkim)) {
      throw new Error(`Invalid DKIM alignment value: ${record.adkim}`);
    }
    if (record.aspf && !validAlignments.includes(record.aspf)) {
      throw new Error(`Invalid SPF alignment value: ${record.aspf}`);
    }

    // Validate percentage
    if (record.pct !== undefined) {
      const pct = Number(record.pct);
      if (isNaN(pct) || pct < 0 || pct > 100) {
        throw new Error(`Invalid percentage value: ${record.pct}`);
      }
    }

    // Validate URIs
    if (record.rua) {
      this.validateUris(record.rua, 'rua');
    }
    if (record.ruf) {
      this.validateUris(record.ruf, 'ruf');
    }
  }

  private static validateUris(uris: string[], tag: string): void {
    for (const uri of uris) {
      try {
        const url = new URL(uri);
        if (!url.protocol.match(/^mailto:|https?:/)) {
          throw new Error(`Invalid protocol in ${tag} URI: ${uri}`);
        }
      } catch {
        throw new Error(`Invalid ${tag} URI format: ${uri}`);
      }
    }
  }

  private static convertToRecord(tags: Record<string, string | string[]>): DmarcRecord {
    return {
      v: tags.v as string,
      p: tags.p as DmarcPolicy,
      sp: tags.sp as DmarcPolicy | undefined,
      rua: Array.isArray(tags.rua) ? tags.rua : undefined,
      ruf: Array.isArray(tags.ruf) ? tags.ruf : undefined,
      adkim: tags.adkim as DmarcAlignment | undefined,
      aspf: tags.aspf as DmarcAlignment | undefined,
      pct: tags.pct ? Number(tags.pct) : undefined,
      fo: Array.isArray(tags.fo) ? tags.fo : undefined,
    };
  }

  /**
   * Evaluates if a DMARC record provides adequate protection
   */
  static evaluatePolicy(record: DmarcRecord): {
    strength: 'weak' | 'moderate' | 'strong';
    recommendations: string[];
  } {
    const recommendations: string[] = [];
    let strength: 'weak' | 'moderate' | 'strong' = 'strong';

    // Check policy strength
    if (record.p === 'none') {
      strength = 'weak';
      recommendations.push('Consider implementing a quarantine or reject policy');
    } else if (record.p === 'quarantine') {
      strength = 'moderate';
    }

    // Check percentage
    if (record.pct !== undefined && record.pct < 100) {
      strength = 'weak';
      recommendations.push('Increase policy application percentage to 100%');
    }

    // Check alignment
    if (!record.adkim || record.adkim === 'r') {
      recommendations.push('Consider strict DKIM alignment for enhanced security');
    }
    if (!record.aspf || record.aspf === 'r') {
      recommendations.push('Consider strict SPF alignment for enhanced security');
    }

    // Check reporting
    if (!record.rua) {
      recommendations.push('Add aggregate report URIs for monitoring');
    }
    if (!record.ruf) {
      recommendations.push('Add failure report URIs for detailed error tracking');
    }

    // Check subdomain policy
    if (!record.sp && record.p !== 'reject') {
      recommendations.push('Specify subdomain policy for comprehensive protection');
    }

    return { strength, recommendations };
  }
} 