export type DkimKeyType = "rsa" | "ed25519";
export type DkimHashAlgorithm = "sha1" | "sha256";
export type DkimServiceType = "email" | "*";

export interface DkimRecord {
  v: string;  // Required: Version
  p: string;  // Required: Public key
  k?: DkimKeyType;  // Optional: Key type (default: "rsa")
  h?: DkimHashAlgorithm[];  // Optional: Hash algorithms
  s?: DkimServiceType[];  // Optional: Service type (default: "*")
  t?: string[];  // Optional: Flags
  n?: string;  // Optional: Notes (human-readable)
}

export class DkimAnalyzer {
  static readonly DKIM_TAG_REGEX = /([a-z]+)=([^;]+)/g;

  /**
   * Validates and parses a DKIM record
   */
  static validateRecord(record: string): DkimRecord {
    const tags = this.parseTags(record.trim());
    this.validateRequiredTags(tags);
    this.validateTagValues(tags);
    return tags;
  }

  private static parseTags(record: string): DkimRecord {
    const tags: Record<string, string | string[]> = {};
    let match;

    while ((match = this.DKIM_TAG_REGEX.exec(record)) !== null) {
      const [, key, value] = match;
      
      // Handle multi-value tags
      if (key === 'h' || key === 's' || key === 't') {
        tags[key] = value.split(':').map(v => v.trim());
      } else {
        tags[key] = value.trim();
      }
    }

    return this.convertToRecord(tags);
  }

  private static validateRequiredTags(record: DkimRecord): void {
    if (!record.v) {
      throw new Error("Missing required version (v) tag");
    }
    if (record.v !== "DKIM1") {
      throw new Error(`Invalid DKIM version: ${record.v}`);
    }
    if (!record.p) {
      throw new Error("Missing required public key (p) tag");
    }
  }

  private static validateTagValues(record: DkimRecord): void {
    // Validate key type
    if (record.k && !["rsa", "ed25519"].includes(record.k)) {
      throw new Error(`Invalid key type: ${record.k}`);
    }

    // Validate hash algorithms
    if (record.h) {
      for (const hash of record.h) {
        if (!["sha1", "sha256"].includes(hash)) {
          throw new Error(`Invalid hash algorithm: ${hash}`);
        }
      }
    }

    // Validate service types
    if (record.s) {
      for (const service of record.s) {
        if (!["email", "*"].includes(service)) {
          throw new Error(`Invalid service type: ${service}`);
        }
      }
    }

    // Validate public key format (base64)
    if (!/^[A-Za-z0-9+/=]+$/.test(record.p)) {
      throw new Error("Invalid public key format");
    }
  }

  private static convertToRecord(tags: Record<string, string | string[]>): DkimRecord {
    // Create base record with required fields and default values
    const record: DkimRecord = {
      v: tags.v as string,
      p: tags.p as string,
      k: (tags.k as DkimKeyType) || "rsa",
      h: Array.isArray(tags.h) ? tags.h as DkimHashAlgorithm[] : ["sha256"],
      s: Array.isArray(tags.s) ? tags.s as DkimServiceType[] : ["*"],
    };

    // Only add optional fields if they are present
    if (tags.t) {
      record.t = Array.isArray(tags.t) ? tags.t : [tags.t as string];
    }
    if (tags.n) {
      record.n = tags.n as string;
    }

    return record;
  }

  /**
   * Evaluates if a DKIM record provides adequate protection
   */
  static evaluatePolicy(record: DkimRecord): {
    strength: 'weak' | 'moderate' | 'strong';
    recommendations: string[];
  } {
    const recommendations: string[] = [];
    let strength: 'weak' | 'moderate' | 'strong' = 'strong';

    // Check key type
    if (!record.k || record.k === 'rsa') {
      // RSA is fine but ED25519 is preferred for modern deployments
      recommendations.push('Consider using ED25519 for better performance and security');
    }

    // Check hash algorithms
    if (!record.h || record.h.includes('sha1')) {
      strength = 'weak';
      recommendations.push('Remove SHA1 and use only SHA256 for hashing');
    }

    // Check testing mode
    if (record.t && record.t.includes('y')) {
      strength = 'weak';
      recommendations.push('Remove testing flag for production use');
    }

    return { strength, recommendations };
  }
} 