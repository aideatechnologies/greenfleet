import { prisma } from "@/lib/db/client";

/** Cache in-memory delle descrizioni (code → description) */
let labelCache: Map<string, string> | null = null;

/**
 * Carica le label dei tipi carburante dal DB.
 * Restituisce Map<vehicleFuelType, description>.
 * Usa cache in-memory per evitare query ripetute.
 */
export async function getFuelTypeLabels(): Promise<Map<string, string>> {
  if (labelCache) return labelCache;

  const mappings = await prisma.fuelTypeMacroMapping.findMany({
    select: { vehicleFuelType: true, description: true },
    distinct: ["vehicleFuelType"],
  });

  labelCache = new Map(
    mappings.map((m) => [
      m.vehicleFuelType,
      m.description || m.vehicleFuelType,
    ])
  );

  return labelCache;
}

/** Invalida la cache in-memory (da chiamare dopo modifiche ai mapping). */
export function invalidateFuelTypeLabelCache() {
  labelCache = null;
}
