import type { PrismaClient } from "@/generated/prisma/client";
import {
  KYOTO_GASES,
  type EmissionContext,
  type GasEmissionFactors,
  type EmissionScope,
} from "@/types/emission";
import { getActiveGwpValues } from "@/lib/services/gwp-config-service";

// ---------------------------------------------------------------------------
// resolveEmissionContexts
// ---------------------------------------------------------------------------

/**
 * For a given vehicle fuel type and reference date, resolves all emission contexts needed.
 * Returns 1 context for pure fuels, 2 for hybrids (scope 1 + scope 2).
 *
 * Steps:
 * 1. Look up FuelTypeMacroMapping(s) for the vehicleFuelType
 * 2. For each mapping, get the effective EmissionFactor for that MacroFuelType at the referenceDate
 * 3. Load active GWP values
 * 4. Build EmissionContext objects
 *
 * If no mapping is found, returns empty array.
 * If no EmissionFactor is found for a mapping, uses zero factors for all gases.
 */
export async function resolveEmissionContexts(
  prisma: PrismaClient,
  vehicleFuelType: string,
  referenceDate: Date
): Promise<EmissionContext[]> {
  // 1. Get mappings for this vehicle fuel type (1 for pure, 2 for hybrid)
  const mappings = await prisma.fuelTypeMacroMapping.findMany({
    where: { vehicleFuelType },
    include: { macroFuelType: true },
    orderBy: { scope: "asc" },
  });

  if (mappings.length === 0) return [];

  // 2. Load GWP values
  const gwpValues = await getActiveGwpValues(prisma);

  // 3. Build contexts
  const contexts: EmissionContext[] = [];

  for (const mapping of mappings) {
    const mt = mapping.macroFuelType;

    // Get the effective emission factor for this macro fuel type at the reference date.
    // Try fuelType-specific override first, then fall back to default (fuelType IS NULL).
    const factor =
      (await prisma.emissionFactor.findFirst({
        where: {
          macroFuelTypeId: mt.id,
          fuelType: vehicleFuelType,
          effectiveDate: { lte: referenceDate },
        },
        orderBy: { effectiveDate: "desc" },
      })) ??
      (await prisma.emissionFactor.findFirst({
        where: {
          macroFuelTypeId: mt.id,
          fuelType: null,
          effectiveDate: { lte: referenceDate },
        },
        orderBy: { effectiveDate: "desc" },
      }));

    const gasFactors: GasEmissionFactors = {
      co2: factor?.co2 ?? 0,
      ch4: factor?.ch4 ?? 0,
      n2o: factor?.n2o ?? 0,
      hfc: factor?.hfc ?? 0,
      pfc: factor?.pfc ?? 0,
      sf6: factor?.sf6 ?? 0,
      nf3: factor?.nf3 ?? 0,
    };

    contexts.push({
      macroFuelType: {
        id: Number(mt.id),
        name: mt.name,
        scope: mt.scope as EmissionScope,
        unit: mt.unit,
      },
      gasFactors,
      gwpValues,
    });
  }

  return contexts;
}

// ---------------------------------------------------------------------------
// resolveAllEmissionContextsBulk
// ---------------------------------------------------------------------------

/**
 * Bulk-resolves emission contexts for ALL fuel type mappings.
 * Returns a Map<vehicleFuelType, EmissionContext[]>.
 * Used by report-service.ts for batch processing to avoid N+1 queries.
 */
export async function resolveAllEmissionContextsBulk(
  prisma: PrismaClient,
  referenceDate: Date
): Promise<Map<string, EmissionContext[]>> {
  // 1. Load ALL mappings with their macro fuel types
  const allMappings = await prisma.fuelTypeMacroMapping.findMany({
    include: { macroFuelType: true },
    orderBy: [{ vehicleFuelType: "asc" }, { scope: "asc" }],
  });

  // 2. Load ALL emission factors effective at or before referenceDate
  const allFactors = await prisma.emissionFactor.findMany({
    where: {
      macroFuelTypeId: { not: null },
      effectiveDate: { lte: referenceDate },
    },
    orderBy: [{ macroFuelTypeId: "asc" }, { effectiveDate: "desc" }],
  });

  // Build factor lookup: (macroFuelTypeId, fuelType|"__default__") -> latest factor.
  // Since results are ordered by effectiveDate desc, the first entry per
  // (macroFuelTypeId, fuelType) combination is the most recent effective factor.
  type FactorEntry = (typeof allFactors)[number];
  const factorMap = new Map<string, FactorEntry>();
  for (const f of allFactors) {
    if (!f.macroFuelTypeId) continue;
    const suffix = f.fuelType ?? "__default__";
    const key = `${f.macroFuelTypeId}::${suffix}`;
    if (!factorMap.has(key)) {
      factorMap.set(key, f);
    }
  }

  // 3. Load GWP values
  const gwpValues = await getActiveGwpValues(prisma);

  // 4. Build result map
  const result = new Map<string, EmissionContext[]>();

  for (const mapping of allMappings) {
    const mt = mapping.macroFuelType;
    // Try fuelType-specific override first, then fall back to default
    const factor =
      factorMap.get(`${mt.id}::${mapping.vehicleFuelType}`) ??
      factorMap.get(`${mt.id}::__default__`);

    const gasFactors: GasEmissionFactors = {
      co2: factor?.co2 ?? 0,
      ch4: factor?.ch4 ?? 0,
      n2o: factor?.n2o ?? 0,
      hfc: factor?.hfc ?? 0,
      pfc: factor?.pfc ?? 0,
      sf6: factor?.sf6 ?? 0,
      nf3: factor?.nf3 ?? 0,
    };

    const context: EmissionContext = {
      macroFuelType: {
        id: Number(mt.id),
        name: mt.name,
        scope: mt.scope as EmissionScope,
        unit: mt.unit,
      },
      gasFactors,
      gwpValues,
    };

    const existing = result.get(mapping.vehicleFuelType) ?? [];
    existing.push(context);
    result.set(mapping.vehicleFuelType, existing);
  }

  return result;
}

// ---------------------------------------------------------------------------
// getFuelTypeCO2eFactors
// ---------------------------------------------------------------------------

/**
 * Returns a Map<vehicleFuelType, totalKgCO2ePerUnit> for quick CO2 estimation.
 * Each value represents the total kgCO2e emitted per unit (litre or kWh)
 * of fuel, summing all Kyoto gases and scopes.
 */
export async function getFuelTypeCO2eFactors(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  prisma: any,
  referenceDate: Date
): Promise<Map<string, number>> {
  const contextMap = await resolveAllEmissionContextsBulk(prisma, referenceDate);
  const factors = new Map<string, number>();

  for (const [fuelType, ctxList] of contextMap) {
    let total = 0;
    for (const ctx of ctxList) {
      for (const gas of KYOTO_GASES) {
        total += (ctx.gasFactors[gas] ?? 0) * (ctx.gwpValues[gas] ?? 0);
      }
    }
    factors.set(fuelType, total);
  }

  return factors;
}
