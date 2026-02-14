import type { MacroFuelType } from "@/generated/prisma/client";
import type { PrismaClient } from "@/generated/prisma/client";
import type {
  CreateMacroFuelTypeData,
  UpdateMacroFuelTypeData,
} from "@/lib/schemas/macro-fuel-type";

// ---------------------------------------------------------------------------
// Get all macro fuel types
// ---------------------------------------------------------------------------

export async function getMacroFuelTypes(
  prisma: PrismaClient,
  options: { includeInactive?: boolean } = {}
): Promise<MacroFuelType[]> {
  const where: Record<string, unknown> = {};

  if (!options.includeInactive) {
    where.isActive = true;
  }

  return prisma.macroFuelType.findMany({
    where,
    orderBy: { sortOrder: "asc" },
  });
}

// ---------------------------------------------------------------------------
// Get macro fuel type by ID
// ---------------------------------------------------------------------------

export async function getMacroFuelTypeById(
  prisma: PrismaClient,
  id: string
): Promise<MacroFuelType | null> {
  return prisma.macroFuelType.findUnique({
    where: { id },
  });
}

// ---------------------------------------------------------------------------
// Create macro fuel type
// ---------------------------------------------------------------------------

export async function createMacroFuelType(
  prisma: PrismaClient,
  input: CreateMacroFuelTypeData
): Promise<MacroFuelType> {
  return prisma.macroFuelType.create({
    data: {
      name: input.name,
      scope: input.scope,
      unit: input.unit,
      color: input.color,
      sortOrder: input.sortOrder,
    },
  });
}

// ---------------------------------------------------------------------------
// Update macro fuel type
// ---------------------------------------------------------------------------

export async function updateMacroFuelType(
  prisma: PrismaClient,
  id: string,
  input: UpdateMacroFuelTypeData
): Promise<MacroFuelType> {
  const existing = await prisma.macroFuelType.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new MacroFuelTypeNotFoundError("Macro tipo carburante non trovato");
  }

  return prisma.macroFuelType.update({
    where: { id },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.scope !== undefined && { scope: input.scope }),
      ...(input.unit !== undefined && { unit: input.unit }),
      ...(input.color !== undefined && { color: input.color }),
      ...(input.sortOrder !== undefined && { sortOrder: input.sortOrder }),
      ...(input.isActive !== undefined && { isActive: input.isActive }),
    },
  });
}

// ---------------------------------------------------------------------------
// Delete macro fuel type
// ---------------------------------------------------------------------------

export async function deleteMacroFuelType(
  prisma: PrismaClient,
  id: string
): Promise<MacroFuelType> {
  const existing = await prisma.macroFuelType.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new MacroFuelTypeNotFoundError("Macro tipo carburante non trovato");
  }

  // Check for dependent EmissionFactors
  const emissionFactorCount = await prisma.emissionFactor.count({
    where: { macroFuelTypeId: id },
  });

  if (emissionFactorCount > 0) {
    throw new MacroFuelTypeInUseError(
      `Impossibile eliminare: ${emissionFactorCount} fattori di emissione collegati`
    );
  }

  // Check for dependent FuelTypeMacroMappings
  const mappingCount = await prisma.fuelTypeMacroMapping.count({
    where: { macroFuelTypeId: id },
  });

  if (mappingCount > 0) {
    throw new MacroFuelTypeInUseError(
      `Impossibile eliminare: ${mappingCount} mappature tipo carburante collegate`
    );
  }

  await prisma.macroFuelType.delete({
    where: { id },
  });

  return existing;
}

// ---------------------------------------------------------------------------
// Custom error classes
// ---------------------------------------------------------------------------

export class MacroFuelTypeNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MacroFuelTypeNotFoundError";
  }
}

export class MacroFuelTypeInUseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MacroFuelTypeInUseError";
  }
}
