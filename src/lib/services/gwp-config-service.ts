import type { GwpConfig } from "@/generated/prisma/client";
import type { PrismaClient } from "@/generated/prisma/client";
import type {
  CreateGwpConfigData,
  UpdateGwpConfigData,
} from "@/lib/schemas/gwp-config";
import { KYOTO_GASES, KYOTO_GAS_DB_NAMES, type GwpValues } from "@/types/emission";

// ---------------------------------------------------------------------------
// Get all GWP configs
// ---------------------------------------------------------------------------

export async function getGwpConfigs(
  prisma: PrismaClient,
  options: { activeOnly?: boolean } = {}
): Promise<GwpConfig[]> {
  const where: Record<string, unknown> = {};

  if (options.activeOnly) {
    where.isActive = true;
  }

  return prisma.gwpConfig.findMany({
    where,
    orderBy: { gasName: "asc" },
  });
}

// ---------------------------------------------------------------------------
// Get GWP config by ID
// ---------------------------------------------------------------------------

export async function getGwpConfigById(
  prisma: PrismaClient,
  id: string
): Promise<GwpConfig | null> {
  return prisma.gwpConfig.findUnique({
    where: { id },
  });
}

// ---------------------------------------------------------------------------
// Create GWP config
// ---------------------------------------------------------------------------

export async function createGwpConfig(
  prisma: PrismaClient,
  input: CreateGwpConfigData
): Promise<GwpConfig> {
  return prisma.gwpConfig.create({
    data: {
      gasName: input.gasName,
      gwpValue: input.gwpValue,
      source: input.source,
    },
  });
}

// ---------------------------------------------------------------------------
// Update GWP config
// ---------------------------------------------------------------------------

export async function updateGwpConfig(
  prisma: PrismaClient,
  id: string,
  input: UpdateGwpConfigData
): Promise<GwpConfig> {
  const existing = await prisma.gwpConfig.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new GwpConfigNotFoundError("Configurazione GWP non trovata");
  }

  return prisma.gwpConfig.update({
    where: { id },
    data: {
      ...(input.gwpValue !== undefined && { gwpValue: input.gwpValue }),
      ...(input.source !== undefined && { source: input.source }),
      ...(input.isActive !== undefined && { isActive: input.isActive }),
    },
  });
}

// ---------------------------------------------------------------------------
// Delete GWP config
// ---------------------------------------------------------------------------

export async function deleteGwpConfig(
  prisma: PrismaClient,
  id: string
): Promise<GwpConfig> {
  const existing = await prisma.gwpConfig.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new GwpConfigNotFoundError("Configurazione GWP non trovata");
  }

  await prisma.gwpConfig.delete({
    where: { id },
  });

  return existing;
}

// ---------------------------------------------------------------------------
// Get active GWP values as a GwpValues record
// ---------------------------------------------------------------------------

export async function getActiveGwpValues(prisma: PrismaClient): Promise<GwpValues> {
  const configs = await prisma.gwpConfig.findMany({
    where: { isActive: true },
  });

  const gwp: GwpValues = { co2: 0, ch4: 0, n2o: 0, hfc: 0, pfc: 0, sf6: 0, nf3: 0 };

  for (const config of configs) {
    // Map DB gas name (uppercase) to KyotoGas key (lowercase)
    for (const gas of KYOTO_GASES) {
      if (KYOTO_GAS_DB_NAMES[gas] === config.gasName) {
        gwp[gas] = config.gwpValue;
        break;
      }
    }
  }

  return gwp;
}

// ---------------------------------------------------------------------------
// Custom error classes
// ---------------------------------------------------------------------------

export class GwpConfigNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GwpConfigNotFoundError";
  }
}
