"use server";

import type { ActionResult } from "@/types/action-result";
import { ErrorCode } from "@/types/action-result";
import { requireAuth } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db/client";
import { logger } from "@/lib/utils/logger";

export type AvailableCatalogVehicle = {
  id: string;
  marca: string;
  modello: string;
  allestimento: string | null;
  carrozzeria: string | null;
  annoImmatricolazione: number | null;
  engine: {
    fuelType: string;
    potenzaKw: number | null;
    cilindrata: number | null;
  } | null;
};

export async function getAvailableCatalogVehiclesAction(
  excludeIds: string[]
): Promise<ActionResult<AvailableCatalogVehicle[]>> {
  const authResult = await requireAuth();
  if (!authResult.success) return authResult;
  const { ctx } = authResult;

  if (!ctx.organizationId) {
    return {
      success: false,
      error: "Nessun tenant attivo nella sessione",
      code: ErrorCode.FORBIDDEN,
    };
  }

  try {
    const vehicles = await prisma.catalogVehicle.findMany({
      where: {
        id: { notIn: excludeIds.length > 0 ? excludeIds : undefined },
      },
      include: {
        engines: {
          select: {
            fuelType: true,
            potenzaKw: true,
            cilindrata: true,
          },
          take: 1,
        },
      },
      orderBy: [{ marca: "asc" }, { modello: "asc" }],
      take: 200,
    });

    const data: AvailableCatalogVehicle[] = vehicles.map((v) => ({
      id: v.id,
      marca: v.marca,
      modello: v.modello,
      allestimento: v.allestimento,
      carrozzeria: v.carrozzeria,
      annoImmatricolazione: v.annoImmatricolazione,
      engine: v.engines[0] ?? null,
    }));

    return { success: true, data };
  } catch (error) {
    logger.error(
      { error, userId: ctx.userId },
      "Failed to get available catalog vehicles"
    );
    return {
      success: false,
      error: "Errore nel caricamento dei veicoli catalogo",
      code: ErrorCode.INTERNAL,
    };
  }
}
