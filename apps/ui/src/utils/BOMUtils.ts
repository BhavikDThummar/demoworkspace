/**
 * BOM Utilities for parsing and validating BOM data
 */

export class BOMUtils {
  /**
   * Parse refDesig string into array of individual reference designators
   */
  static parseRefDesig(refDesig: string): string[] {
    if (!refDesig || typeof refDesig !== 'string') {
      return [];
    }

    // Split by common delimiters: comma, semicolon, space, pipe
    return refDesig
      .split(/[,;\s|]+/)
      .map(ref => ref.trim())
      .filter(ref => ref.length > 0);
  }

  /**
   * Normalize QPA value to number
   */
  static normalizeQPA(qpa: string | number): number {
    if (typeof qpa === 'number') {
      return qpa;
    }
    
    if (typeof qpa === 'string') {
      const parsed = parseFloat(qpa);
      return isNaN(parsed) ? 0 : parsed;
    }
    
    return 0;
  }

  /**
   * Check if refDesig has special characters (excluding allowed ones)
   */
  static hasSpecialCharacters(refDesig: string, allowedChars: string[]): boolean {
    const specialCharRegex = /[^a-zA-Z0-9]/g;
    const specialChars = refDesig.match(specialCharRegex) || [];
    
    return specialChars.some(char => !allowedChars.includes(char));
  }

  /**
   * Check if refDesig matches oddly named patterns
   */
  static isOddlyNamedRefDes(refDesig: string, patterns: RegExp[]): boolean {
    return patterns.some(pattern => pattern.test(refDesig));
  }

  /**
   * Get unique reference designators from all BOM items
   */
  static getAllRefDesigs(items: any[]): Set<string> {
    const allRefDesigs = new Set<string>();
    
    items.forEach(item => {
      const refDesigs = this.parseRefDesig(item.refDesig);
      refDesigs.forEach(ref => allRefDesigs.add(ref));
    });
    
    return allRefDesigs;
  }

  /**
   * Find duplicate reference designators across BOM items
   */
  static findDuplicateRefDesigs(items: any[]): Map<string, string[]> {
    const refDesigMap = new Map<string, string[]>();
    
    items.forEach(item => {
      const refDesigs = this.parseRefDesig(item.refDesig);
      refDesigs.forEach(ref => {
        if (!refDesigMap.has(ref)) {
          refDesigMap.set(ref, []);
        }
        refDesigMap.get(ref)?.push(item.lineID);
      });
    });
    
    // Filter to only duplicates
    const duplicates = new Map<string, string[]>();
    refDesigMap.forEach((lineIDs, refDesig) => {
      if (lineIDs.length > 1) {
        duplicates.set(refDesig, lineIDs);
      }
    });
    
    return duplicates;
  }
}