"use server";

import type { ActionResult } from "@/types/action-result";
import { ErrorCode } from "@/types/action-result";
import { requireAuth } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db/client";
import { logger } from "@/lib/utils/logger";
import type { CatalogVehicleWithEngines } from "@/lib/services/catalog-service";
import { UNCATALOGED_VEHICLE_ID } from "@/lib/utils/constants";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CatalogModelGroup = {
  marca: string;
  modello: string;
  imageUrl: string | null;
  count: number;
};

// ---------------------------------------------------------------------------
// Step 1: Search marca+modello (multi-word)
// ---------------------------------------------------------------------------

/**
 * Ricerca modelli catalogo con supporto multi-parola.
 * "Alfa Romeo Giulia" splitta in ["Alfa", "Romeo", "Giulia"] e ogni parola
 * deve matchare marca O modello (AND tra le parole).
 * Restituisce coppie marca+modello raggruppate (max 20).
 */
export async function searchCatalogModelsAction(
  query: string
): Promise<ActionResult<CatalogModelGroup[]>> {
  const authResult = await requireAuth();
  if (!authResult.success) return authResult;

  if (!query || query.trim().length < 2) {
    return { success: true, data: [] };
  }

  const words = query.trim().split(/\s+/).filter((w) => w.length >= 1);
  if (words.length === 0) {
    return { success: true, data: [] };
  }

  try {
    const results = await prisma.catalogVehicle.findMany({
      where: {
        id: { not: UNCATALOGED_VEHICLE_ID },
        AND: words.map((word) => ({
          OR: [
            { marca: { contains: word } },
            { modello: { contains: word } },
          ],
        })),
      },
      select: { marca: true, modello: true, imageUrl: true },
      orderBy: [{ marca: "asc" }, { modello: "asc" }],
      take: 200,
    });

    // Group by marca+modello
    const groups = new Map<string, CatalogModelGroup>();
    for (const r of results) {
      const key = `${r.marca}|${r.modello}`;
      const existing = groups.get(key);
      if (!existing) {
        groups.set(key, {
          marca: r.marca,
          modello: r.modello,
          imageUrl: r.imageUrl,
          count: 1,
        });
      } else {
        existing.count++;
        if (!existing.imageUrl && r.imageUrl) {
          existing.imageUrl = r.imageUrl;
        }
      }
    }

    return { success: true, data: [...groups.values()].slice(0, 20) };
  } catch (error) {
    logger.error(
      { error, userId: authResult.ctx.userId },
      "Failed to search catalog models"
    );
    return {
      success: false,
      error: "Errore nella ricerca dei modelli",
      code: ErrorCode.INTERNAL,
    };
  }
}

// ---------------------------------------------------------------------------
// Step 2: Allestimenti per un dato marca+modello
// ---------------------------------------------------------------------------

/**
 * Restituisce gli allestimenti disponibili per un modello.
 * Null viene incluso se esistono record senza allestimento.
 */
export async function getCatalogAllestimentiAction(
  marca: string,
  modello: string
): Promise<ActionResult<(string | null)[]>> {
  const authResult = await requireAuth();
  if (!authResult.success) return authResult;

  try {
    const results = await prisma.catalogVehicle.findMany({
      where: {
        id: { not: UNCATALOGED_VEHICLE_ID },
        marca,
        modello,
      },
      select: { allestimento: true },
    });

    const unique = [
      ...new Set(results.map((r) => r.allestimento)),
    ].sort((a, b) => {
      if (a === null) return 1;
      if (b === null) return -1;
      return a.localeCompare(b);
    });

    return { success: true, data: unique };
  } catch (error) {
    logger.error(
      { error, userId: authResult.ctx.userId },
      "Failed to get catalog allestimenti"
    );
    return {
      success: false,
      error: "Errore nel recupero degli allestimenti",
      code: ErrorCode.INTERNAL,
    };
  }
}

// ---------------------------------------------------------------------------
// Step 3: Varianti (anno) per marca+modello+allestimento
// ---------------------------------------------------------------------------

/**
 * Restituisce le varianti catalogo per un dato marca+modello+allestimento.
 * Ordinate per anno di immatricolazione decrescente.
 */
export async function getCatalogVariantsAction(
  marca: string,
  modello: string,
  allestimento: string | null
): Promise<ActionResult<CatalogVehicleWithEngines[]>> {
  const authResult = await requireAuth();
  if (!authResult.success) return authResult;

  try {
    const where: Record<string, unknown> = {
      id: { not: UNCATALOGED_VEHICLE_ID },
      marca,
      modello,
    };

    if (allestimento !== null) {
      where.allestimento = allestimento;
    } else {
      where.allestimento = null;
    }

    const results = await prisma.catalogVehicle.findMany({
      where,
      include: { engines: true },
      orderBy: { annoImmatricolazione: "desc" },
    });

    return { success: true, data: results };
  } catch (error) {
    logger.error(
      { error, userId: authResult.ctx.userId },
      "Failed to get catalog variants"
    );
    return {
      success: false,
      error: "Errore nel recupero delle varianti",
      code: ErrorCode.INTERNAL,
    };
  }
}
