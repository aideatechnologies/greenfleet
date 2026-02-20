/**
 * Recursively converts all bigint values in an object tree to number.
 * Safe for fleet-management IDs that never exceed Number.MAX_SAFE_INTEGER.
 * Guards against circular references and non-plain objects (Map, Set, Buffer…).
 */
export function numberifyBigInts<T>(obj: T): T {
  return _numberify(obj, new WeakSet()) as T;
}

function _numberify(obj: unknown, seen: WeakSet<object>): unknown {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === "bigint") return Number(obj);
  if (typeof obj !== "object") return obj;

  // Fast-path for common non-plain types — return as-is
  if (obj instanceof Date) return obj;
  if (obj instanceof Map || obj instanceof Set) return obj;
  if (ArrayBuffer.isView(obj)) return obj;

  // Circular reference guard
  const o = obj as object;
  if (seen.has(o)) return o;
  seen.add(o);

  if (Array.isArray(o)) {
    return o.map((item) => _numberify(item, seen));
  }

  // Only process plain objects (constructor is Object or null-proto)
  const proto = Object.getPrototypeOf(o);
  if (proto !== null && proto !== Object.prototype) return o;

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(o)) {
    result[key] = _numberify(value, seen);
  }
  return result;
}
