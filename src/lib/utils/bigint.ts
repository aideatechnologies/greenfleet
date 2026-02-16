/**
 * Recursively converts all bigint values in an object tree to number.
 * Safe for fleet-management IDs that never exceed Number.MAX_SAFE_INTEGER.
 */
export function numberifyBigInts<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === "bigint") return Number(obj) as unknown as T;
  if (obj instanceof Date) return obj;
  if (Array.isArray(obj)) return obj.map(numberifyBigInts) as unknown as T;
  if (typeof obj === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = numberifyBigInts(value);
    }
    return result as T;
  }
  return obj;
}
