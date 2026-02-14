import type { EmissionFactor } from "@/generated/prisma/client";
import type { PrismaClient } from "@/generated/prisma/client";
import type { PaginatedResult } from "@/types/pagination";
import type {
  CreateEmissionFactorData,
  UpdateEmissionFactorData,
  EmissionFactorFilterInput,
} from "@/lib/schemas/emission-factor";

// ---------------------------------------------------------------------------
// Per-gas column names (V2 schema)
// ---------------------------------------------------------------------------

const GAS_COLUMNS = [
  "co2",
  "ch4",
  "n2o",
  "hfc",
  "pfc",
  "sf6",
  "nf3",
] as const;

// ---------------------------------------------------------------------------
// Get emission factors with filters (paginated)
// ---------------------------------------------------------------------------

export async function getEmissionFactors(
  prisma: PrismaClient,
  filters: EmissionFactorFilterInput
): Promise<PaginatedResult<EmissionFactor>> {
  const { macroFuelTypeId, dateFrom, dateTo, page, pageSize } = filters;

  const where: Record<string, unknown> = {};

  if (macroFuelTypeId) {
    where.macroFuelTypeId = macroFuelTypeId;
  }

  if (dateFrom || dateTo) {
    const dateFilter: Record<string, Date> = {};
    if (dateFrom) dateFilter.gte = dateFrom;
    if (dateTo) dateFilter.lte = dateTo;
    where.effectiveDate = dateFilter;
  }

  const [data, totalCount] = await Promise.all([
    prisma.emissionFactor.findMany({
      where,
      include: { macroFuelType: true },
      orderBy: [
        { macroFuelType: { name: "asc" } },
        { effectiveDate: "desc" },
      ],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.emissionFactor.count({ where }),
  ]);

  return {
    data,
    pagination: {
      page,
      pageSize,
      totalCount,
      totalPages: Math.ceil(totalCount / pageSize),
    },
  };
}

// ---------------------------------------------------------------------------
// Get emission factor by ID
// ---------------------------------------------------------------------------

export async function getEmissionFactorById(
  prisma: PrismaClient,
  id: string
): Promise<EmissionFactor | null> {
  return prisma.emissionFactor.findUnique({
    where: { id },
    include: { macroFuelType: true },
  });
}

// ---------------------------------------------------------------------------
// Create emission factor (V2: per-gas columns)
// ---------------------------------------------------------------------------

export async function createEmissionFactor(
  prisma: PrismaClient,
  input: CreateEmissionFactorData,
  createdBy: string
): Promise<EmissionFactor> {
  return prisma.emissionFactor.create({
    data: {
      macroFuelTypeId: input.macroFuelTypeId,
      fuelType: input.fuelType ?? null,
      co2: input.co2,
      ch4: input.ch4,
      n2o: input.n2o,
      hfc: input.hfc,
      pfc: input.pfc,
      sf6: input.sf6,
      nf3: input.nf3,
      source: input.source,
      effectiveDate: input.effectiveDate,
      createdBy,
    },
    include: { macroFuelType: true },
  });
}

// ---------------------------------------------------------------------------
// Update emission factor (V2: per-gas columns)
// ---------------------------------------------------------------------------

export async function updateEmissionFactor(
  prisma: PrismaClient,
  id: string,
  input: UpdateEmissionFactorData
): Promise<EmissionFactor> {
  const existing = await prisma.emissionFactor.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new EmissionFactorNotFoundError("Fattore di emissione non trovato");
  }

  const data: Record<string, unknown> = {};

  if (input.macroFuelTypeId !== undefined) {
    data.macroFuelTypeId = input.macroFuelTypeId;
  }

  if (input.fuelType !== undefined) {
    // null means "clear the override" (applies to all fuel types),
    // a non-empty string means "set specific fuel type override"
    data.fuelType = input.fuelType;
  }

  for (const gas of GAS_COLUMNS) {
    if (input[gas] !== undefined) {
      data[gas] = input[gas];
    }
  }

  if (input.source !== undefined) {
    data.source = input.source;
  }

  if (input.effectiveDate !== undefined) {
    data.effectiveDate = input.effectiveDate;
  }

  return prisma.emissionFactor.update({
    where: { id },
    data,
    include: { macroFuelType: true },
  });
}

// ---------------------------------------------------------------------------
// Delete emission factor
// ---------------------------------------------------------------------------

export async function deleteEmissionFactor(
  prisma: PrismaClient,
  id: string
): Promise<EmissionFactor> {
  const existing = await prisma.emissionFactor.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new EmissionFactorNotFoundError("Fattore di emissione non trovato");
  }

  await prisma.emissionFactor.delete({
    where: { id },
  });

  return existing;
}

// ---------------------------------------------------------------------------
// Get effective emission factor — LEGACY (temporal lookup by fuelType)
// ---------------------------------------------------------------------------

/**
 * @deprecated Usa `getEffectiveEmissionFactorV2` che lavora con macroFuelTypeId
 * e restituisce i valori per singolo gas (co2, ch4, n2o, hfc, pfc, sf6, nf3).
 *
 * Questa funzione e mantenuta per compatibilita con i dati legacy che usano
 * il campo `fuelType` + `value`. Verra rimossa quando la migrazione sara completa.
 *
 * Temporal lookup: trova il fattore dove fuelType corrisponde e
 * effectiveDate <= referenceDate, ordinato DESC, limit 1.
 */
export async function getEffectiveEmissionFactor(
  prisma: PrismaClient,
  fuelType: string,
  referenceDate: Date
): Promise<EmissionFactor> {
  const factor = await prisma.emissionFactor.findFirst({
    where: {
      fuelType,
      effectiveDate: { lte: referenceDate },
    },
    orderBy: { effectiveDate: "desc" },
  });

  if (!factor) {
    throw new EmissionFactorNotFoundError(
      `Nessun fattore di emissione trovato per ${fuelType} alla data ${referenceDate.toISOString().split("T")[0]}`
    );
  }

  return factor;
}

// ---------------------------------------------------------------------------
// Get effective emission factor V2 (temporal lookup by macroFuelTypeId)
// ---------------------------------------------------------------------------

/**
 * Trova il fattore di emissione per un dato macroFuelTypeId che era in vigore
 * alla data di riferimento indicata.
 *
 * Temporal lookup: trova il fattore dove macroFuelTypeId corrisponde e
 * effectiveDate <= referenceDate, ordinato DESC, limit 1.
 * Restituisce il fattore con i valori per singolo gas (co2, ch4, n2o, ecc.).
 */
export async function getEffectiveEmissionFactorV2(
  prisma: PrismaClient,
  macroFuelTypeId: string,
  referenceDate: Date
): Promise<EmissionFactor> {
  const factor = await prisma.emissionFactor.findFirst({
    where: {
      macroFuelTypeId,
      effectiveDate: { lte: referenceDate },
    },
    orderBy: { effectiveDate: "desc" },
    include: { macroFuelType: true },
  });

  if (!factor) {
    throw new EmissionFactorNotFoundError(
      `Nessun fattore di emissione trovato per macroFuelTypeId=${macroFuelTypeId} alla data ${referenceDate.toISOString().split("T")[0]}`
    );
  }

  return factor;
}

// ---------------------------------------------------------------------------
// Custom error classes
// ---------------------------------------------------------------------------

export class EmissionFactorNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EmissionFactorNotFoundError";
  }
}
