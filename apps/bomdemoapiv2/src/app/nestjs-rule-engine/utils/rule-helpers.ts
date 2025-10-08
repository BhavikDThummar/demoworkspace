/**
 * Helper functions for rule execution
 */

export function parseRefDesig(refDesig: string): string[] {
  if (!refDesig || typeof refDesig !== 'string') {
    return [];
  }
  return refDesig
    .split(/[,;\s|]+/)
    .map((ref) => ref.trim())
    .filter((ref) => ref.length > 0);
}

export function normalizeQPA(qpa: string | number): number {
  if (typeof qpa === 'number') {
    return qpa;
  }
  if (typeof qpa === 'string') {
    const parsed = parseFloat(qpa);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

export function createError(field: string, message: string, itemId: number) {
  return {
    field,
    message,
    itemId,
  };
}
