export type SpfQualifier = "+" | "-" | "~" | "?";
export type SpfMechanism = 
  | "all"
  | "include"
  | "a"
  | "mx"
  | "ptr"
  | "ip4"
  | "ip6"
  | "exists"
  | "ip"
  | "redirect"
  | "exp";

export interface SpfTerm {
  qualifier: SpfQualifier;
  mechanism: SpfMechanism;
  value?: string;
}

export interface SpfRecord {
  version: string;
  terms: SpfTerm[];
}

export class SpfAnalyzer {
  static readonly SPF_REGEX = /^v=spf1(?:\s+(.+))?$/i;
  static readonly TERM_REGEX = /^([+\-~?])?([a-z]+\d?)(?:[:\/](.*))?$/i;

  /**
   * Validates and parses an SPF record
   */
  static validateRecord(record: string): SpfRecord {
    const match = record.trim().match(this.SPF_REGEX);
    if (!match) {
      throw new Error("Invalid SPF record format: Must start with v=spf1");
    }

    // Handle empty record after v=spf1
    if (!match[1]) {
      throw new Error("Invalid SPF term: ");
    }

    const terms = this.parseTerms(match[1]);
    this.validateTerms(terms);

    return {
      version: "spf1",
      terms
    };
  }

  private static parseTerms(termString: string): SpfTerm[] {
    const terms: SpfTerm[] = [];
    const termStrings = termString.trim().split(/\s+/);

    for (const term of termStrings) {
      const match = term.match(this.TERM_REGEX);
      if (!match) {
        throw new Error(`Invalid SPF term: ${term}`);
      }

      const [, qualifier = "+", mechanism, value] = match;
      
      // Validate qualifier first
      if (!this.isValidQualifier(qualifier)) {
        throw new Error(`Invalid SPF qualifier: ${qualifier}`);
      }

      // Validate mechanism
      if (!this.isValidMechanism(mechanism)) {
        throw new Error(`Invalid SPF mechanism: ${mechanism}`);
      }

      // For mechanisms that require a value (like include:), ensure it exists and is not empty
      if ((mechanism === "include" || mechanism === "ip4" || mechanism === "ip6") && (!value || !value.trim())) {
        throw new Error(`Invalid domain for ${mechanism}: ${value}`);
      }

      // Create the term with the correct mechanism type
      const spfTerm: SpfTerm = {
        qualifier: qualifier as SpfQualifier,
        mechanism: mechanism as SpfMechanism
      };

      if (value !== undefined) {
        spfTerm.value = value.trim();
      }

      terms.push(spfTerm);
    }

    return terms;
  }

  private static validateTerms(terms: SpfTerm[]): void {
    // Check for duplicate all mechanisms
    const allTerms = terms.filter(term => term.mechanism === "all");
    if (allTerms.length > 1) {
      throw new Error("Multiple 'all' mechanisms are not allowed");
    }

    // Check if 'all' is not the last term
    const allIndex = terms.findIndex(term => term.mechanism === "all");
    if (allIndex !== -1 && allIndex !== terms.length - 1) {
      throw new Error("The 'all' mechanism must be the last term");
    }

    // Validate mechanism-specific requirements
    for (const term of terms) {
      this.validateMechanismValue(term);
    }
  }

  private static validateMechanismValue(term: SpfTerm): void {
    switch (term.mechanism) {
      case "ip4":
        if (!term.value || !this.isValidIpv4(term.value)) {
          throw new Error(`Invalid IPv4 address: ${term.value}`);
        }
        break;
      case "ip6":
        if (!term.value || !this.isValidIpv6(term.value)) {
          throw new Error(`Invalid IPv6 address: ${term.value}`);
        }
        break;
      case "include":
      case "exists":
        if (!term.value || !this.isValidDomain(term.value)) {
          throw new Error(`Invalid domain for ${term.mechanism}: ${term.value}`);
        }
        break;
      case "a":
      case "mx":
        // Check if the term had a colon (value would be empty string or undefined)
        if (term.value !== undefined && (!term.value || !this.isValidDomain(term.value))) {
          throw new Error(`Invalid domain for ${term.mechanism}: ${term.value}`);
        }
        break;
    }
  }

  private static isValidMechanism(mechanism: string): boolean {
    return ["all", "include", "a", "mx", "ptr", "ip4", "ip6", "exists", "ip", "redirect", "exp"].includes(mechanism.toLowerCase());
  }

  private static isValidQualifier(qualifier: string): boolean {
    return ["+", "-", "~", "?"].includes(qualifier);
  }

  private static isValidIpv4(ip: string): boolean {
    const parts = ip.split(".");
    if (parts.length !== 4) return false;
    
    return parts.every(part => {
      const num = parseInt(part, 10);
      return !isNaN(num) && num >= 0 && num <= 255;
    });
  }

  private static isValidIpv6(ip: string): boolean {
    // Split on / to handle CIDR notation
    const [addr, cidr] = ip.split('/');
    
    // Validate CIDR if present
    if (cidr !== undefined) {
      const prefix = parseInt(cidr, 10);
      if (isNaN(prefix) || prefix < 0 || prefix > 128) {
        return false;
      }
    }

    // Basic IPv6 validation
    const parts = addr.split(':');
    if (parts.length > 8) return false;

    // Check for valid hex values
    return parts.every(part => {
      // Empty part is valid for :: notation, but not at start/end
      if (part === '') return true;
      // Each part must be valid hex and 1-4 characters
      return /^[0-9A-Fa-f]{1,4}$/.test(part);
    });
  }

  private static isValidDomain(domain: string): boolean {
    // Allow underscores in any part of the domain name
    const parts = domain.split('.');
    return parts.length >= 1 && parts.every(part => 
      part.length > 0 && /^[a-zA-Z0-9_][a-zA-Z0-9-_]*[a-zA-Z0-9]$/.test(part)
    );
  }

  /**
   * Evaluates if an SPF record provides adequate protection
   */
  static evaluatePolicy(record: SpfRecord): {
    strength: 'weak' | 'moderate' | 'strong';
    recommendations: string[];
  } {
    const recommendations: string[] = [];
    let strength: 'weak' | 'moderate' | 'strong' = 'strong';

    // Check for all mechanism
    const allTerm = record.terms.find(term => term.mechanism === "all");
    if (!allTerm) {
      strength = 'weak';
      recommendations.push("Add an 'all' mechanism as the last term");
    } else if (allTerm.qualifier === '+') {
      strength = 'weak';
      recommendations.push("Change '+all' to '-all' to reject unauthorized senders");
    } else if (allTerm.qualifier === '?') {
      strength = 'weak';
      recommendations.push("Change '?all' to '-all' to reject unauthorized senders");
    } else if (allTerm.qualifier === '~') {
      strength = 'moderate';
      recommendations.push("Consider changing '~all' to '-all' for stronger protection");
    }

    // Check for potentially risky mechanisms
    if (record.terms.some(term => term.mechanism === "ptr")) {
      strength = 'weak';
      recommendations.push("Remove 'ptr' mechanism as it is unreliable and slow");
    }

    // Check for IP-based mechanisms
    const hasIpMechanisms = record.terms.some(term => 
      term.mechanism === "ip4" || term.mechanism === "ip6"
    );
    if (!hasIpMechanisms) {
      recommendations.push("Consider adding IP-based mechanisms for critical infrastructure");
    }

    return { strength, recommendations };
  }
} 