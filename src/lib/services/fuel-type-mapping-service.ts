import type { FuelTypeMacroMapping } from "@/generated/prisma/client";
import type { PrismaClient } from "@/generated/prisma/client";
import type {
  CreateFuelTypeMappingData,
  UpdateFuelTypeMappingData,
} from "@/lib/schemas/fuel-type-mapping";

// ---------------------------------------------------------------------------
// Get all fuel type mappings
// ---------------------------------------------------------------------------

export async function getFuelTypeMappings(
  prisma: PrismaClient
): Promise<(FuelTypeMacroMapping & { macroFuelType: { id: string; name: string; scope: number; unit: string } })[]> {
  return prisma.fuelTypeMacroMapping.findMany({
    include: {
      macroFuelType: {
        select: { id: true, name: true, scope: true, unit: true },
      },
    },
    orderBy: { vehicleFuelType: "asc" },
  });
}

// ---------------------------------------------------------------------------
// Get mappings for a specific vehicle fuel type
// ---------------------------------------------------------------------------

export async function getMappingsForFuelType(
  prisma: PrismaClient,
  vehicleFuelType: string
): Promise<(FuelTypeMacroMapping & { macroFuelType: { id: string; name: string; scope: number; unit: string } })[]> {
  return prisma.fuelTypeMacroMapping.findMany({
    where: { vehicleFuelType },
    include: {
      macroFuelType: {
        select: { id: true, name: true, scope: true, unit: true },
      },
    },
    orderBy: { scope: "asc" },
  });
}

// ---------------------------------------------------------------------------
// Create fuel type mapping
// ---------------------------------------------------------------------------

export async function createFuelTypeMapping(
  prisma: PrismaClient,
  input: CreateFuelTypeMappingData
): Promise<FuelTypeMacroMapping> {
  return prisma.fuelTypeMacroMapping.create({
    data: {
      vehicleFuelType: input.vehicleFuelType,
      macroFuelTypeId: input.macroFuelTypeId,
      scope: input.scope,
      description: input.description ?? "",
    },
  });
}

// ---------------------------------------------------------------------------
// Update fuel type mapping
// ---------------------------------------------------------------------------

export async function updateFuelTypeMapping(
  prisma: PrismaClient,
  id: string,
  input: UpdateFuelTypeMappingData
): Promise<FuelTypeMacroMapping> {
  const existing = await prisma.fuelTypeMacroMapping.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new FuelTypeMappingNotFoundError(
      "Mappatura tipo carburante non trovata"
    );
  }

  return prisma.fuelTypeMacroMapping.update({
    where: { id },
    data: {
      macroFuelTypeId: input.macroFuelTypeId,
      ...(input.description !== undefined && { description: input.description }),
    },
  });
}

// ---------------------------------------------------------------------------
// Delete fuel type mapping
// ---------------------------------------------------------------------------

export async function deleteFuelTypeMapping(
  prisma: PrismaClient,
  id: string
): Promise<FuelTypeMacroMapping> {
  const existing = await prisma.fuelTypeMacroMapping.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new FuelTypeMappingNotFoundError(
      "Mappatura tipo carburante non trovata"
    );
  }

  await prisma.fuelTypeMacroMapping.delete({
    where: { id },
  });

  return existing;
}

// ---------------------------------------------------------------------------
// Custom error classes
// ---------------------------------------------------------------------------

export class FuelTypeMappingNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FuelTypeMappingNotFoundError";
  }
}
