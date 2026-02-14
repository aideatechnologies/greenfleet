"use server";

import { ActionResult, ErrorCode } from "@/types/action-result";
import { requireAuth } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db/client";
import {
  calculateMissingStandard,
  type EngineEmissionInput,
} from "@/lib/services/emission-conversion-service";
import { logger } from "@/lib/utils/logger";

type RecalculateResult = {
  updated: number;
  errors: number;
};

const BATCH_SIZE = 100;

// ---------------------------------------------------------------------------
// Helper: verifica ruolo owner o admin
// ---------------------------------------------------------------------------

function isOwnerOrAdmin(role: string | null): boolean {
  return role === "owner" || role === "admin";
}

// ---------------------------------------------------------------------------
// Ricalcola emissioni per tutti i motori
// ---------------------------------------------------------------------------

export async function recalculateEmissions(): Promise<
  ActionResult<RecalculateResult>
> {
  const authResult = await requireAuth();
  if (!authResult.success) return authResult;
  const { ctx } = authResult;

  if (!isOwnerOrAdmin(ctx.role)) {
    return {
      success: false,
      error: "Permessi insufficienti. Solo owner e admin possono ricalcolare le emissioni.",
      code: ErrorCode.FORBIDDEN,
    };
  }

  try {
    let updated = 0;
    let errors = 0;
    let skip = 0;

    // Processa in batch
    while (true) {
      const engines = await prisma.engine.findMany({
        where: {
          OR: [
            { co2GKm: { not: null } },
            { co2GKmWltp: { not: null } },
            { co2GKmNedc: { not: null } },
          ],
        },
        select: {
          id: true,
          co2GKm: true,
          co2GKmWltp: true,
          co2GKmNedc: true,
          co2Standard: true,
          conversionConfigId: true,
        },
        skip,
        take: BATCH_SIZE,
        orderBy: { id: "asc" },
      });

      if (engines.length === 0) break;

      for (const engine of engines) {
        try {
          // Determina i valori di input: preferisce i campi specifici,
          // poi fallback al campo generico co2GKm
          const wltpInput =
            engine.co2GKmWltp ??
            (engine.co2Standard === "WLTP" ? engine.co2GKm : null);
          const nedcInput =
            engine.co2GKmNedc ??
            (engine.co2Standard === "NEDC" ? engine.co2GKm : null);

          // Se non c'e nessun valore utile, salta
          if (wltpInput == null && nedcInput == null) continue;

          const input: EngineEmissionInput = {
            co2GKmWltp: wltpInput,
            co2GKmNedc: nedcInput,
            co2Standard: engine.co2Standard as "WLTP" | "NEDC",
            conversionConfigId: engine.conversionConfigId,
          };

          const result = await calculateMissingStandard(input);

          await prisma.engine.update({
            where: { id: engine.id },
            data: {
              co2GKmWltp: result.co2GKmWltp,
              co2GKmNedc: result.co2GKmNedc,
              co2GKmWltpIsCalculated: result.co2GKmWltpIsCalculated,
              co2GKmNedcIsCalculated: result.co2GKmNedcIsCalculated,
              co2GKm: result.co2GKm,
            },
          });

          updated++;
        } catch (engineError) {
          errors++;
          logger.warn(
            { error: engineError, engineId: engine.id },
            "Failed to recalculate emissions for engine"
          );
        }
      }

      skip += engines.length;

      // Se il batch era incompleto, abbiamo finito
      if (engines.length < BATCH_SIZE) break;
    }

    logger.info(
      { updated, errors, userId: ctx.userId },
      "Emission recalculation completed"
    );

    return { success: true, data: { updated, errors } };
  } catch (error) {
    logger.error({ error, userId: ctx.userId }, "Failed to recalculate emissions");
    return {
      success: false,
      error: "Errore nel ricalcolo delle emissioni",
      code: ErrorCode.INTERNAL,
    };
  }
}
