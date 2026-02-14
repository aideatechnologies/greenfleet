"use server";

import { z } from "zod";
import type { ActionResult } from "@/types/action-result";
import { ErrorCode } from "@/types/action-result";
import type { DrillDownLevel, DrillDownResult, VehicleEmissionDetail } from "@/types/report";
import {
  getFleetOverview,
  getCarlistDetail,
  getVehicleDetail,
} from "@/lib/services/report-service";
import { requireAuth } from "@/lib/auth/permissions";
import { getPrismaForTenant } from "@/lib/db/client";
import { logger } from "@/lib/utils/logger";

// ---------------------------------------------------------------------------
// Validation schema
// ---------------------------------------------------------------------------

const drillDownSchema = z.object({
  level: z.union([
    z.literal("FLEET"),
    z.literal("CARLIST"),
    z.literal("VEHICLE"),
  ]),
  id: z.string().nullable(),
  startDate: z.string({ error: "La data di inizio e obbligatoria" }),
  endDate: z.string({ error: "La data di fine e obbligatoria" }),
});

// ---------------------------------------------------------------------------
// Server action: drill-down navigation
// ---------------------------------------------------------------------------

export async function drillDown(
  level: DrillDownLevel,
  id: string | null,
  startDate: string,
  endDate: string
): Promise<ActionResult<DrillDownResult>> {
  // 1. Auth
  const authResult = await requireAuth();
  if (!authResult.success) return authResult;
  const { ctx } = authResult;

  // 2. RBAC: owner/admin only
  if (ctx.role !== "owner" && ctx.role !== "admin") {
    return {
      success: false,
      error: "Non hai i permessi per visualizzare il drill-down emissioni",
      code: ErrorCode.FORBIDDEN,
    };
  }

  const tenantId = ctx.organizationId;
  if (!tenantId) {
    return {
      success: false,
      error: "Nessun tenant attivo nella sessione",
      code: ErrorCode.FORBIDDEN,
    };
  }

  // 3. Validate input
  const parsed = drillDownSchema.safeParse({ level, id, startDate, endDate });
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0].message,
      code: ErrorCode.VALIDATION,
    };
  }

  const dateRange = {
    startDate: new Date(parsed.data.startDate),
    endDate: new Date(parsed.data.endDate),
  };

  // 4. Execute drill-down
  try {
    const prisma = getPrismaForTenant(tenantId);

    let result: DrillDownResult;

    switch (parsed.data.level) {
      case "FLEET":
        result = await getFleetOverview(prisma, dateRange);
        break;
      case "CARLIST":
        if (!parsed.data.id) {
          return {
            success: false,
            error: "ID carlist obbligatorio per il livello CARLIST",
            code: ErrorCode.VALIDATION,
          };
        }
        result = await getCarlistDetail(prisma, parsed.data.id, dateRange);
        break;
      case "VEHICLE":
        // VEHICLE level returns a DrillDownResult wrapping single vehicle
        if (!parsed.data.id) {
          return {
            success: false,
            error: "ID veicolo obbligatorio per il livello VEHICLE",
            code: ErrorCode.VALIDATION,
          };
        }
        // For VEHICLE level, use getCarlistDetail is not appropriate.
        // Return a single-item result for the vehicle.
        // The full detail is loaded separately by getVehicleDetailAction.
        return {
          success: false,
          error: "Utilizzare getVehicleDetailAction per il dettaglio veicolo",
          code: ErrorCode.VALIDATION,
        };
      default:
        return {
          success: false,
          error: "Livello drill-down non valido",
          code: ErrorCode.VALIDATION,
        };
    }

    return { success: true, data: result };
  } catch (error) {
    logger.error(
      { error, userId: ctx.userId, tenantId, level, id },
      "Failed to execute drill-down"
    );
    return {
      success: false,
      error: "Errore nel caricamento dei dati drill-down",
      code: ErrorCode.INTERNAL,
    };
  }
}

// ---------------------------------------------------------------------------
// Server action: vehicle emission detail
// ---------------------------------------------------------------------------

export async function getVehicleDetailAction(
  vehicleId: string,
  startDate: string,
  endDate: string
): Promise<ActionResult<VehicleEmissionDetail>> {
  // 1. Auth
  const authResult = await requireAuth();
  if (!authResult.success) return authResult;
  const { ctx } = authResult;

  // 2. RBAC: owner/admin only
  if (ctx.role !== "owner" && ctx.role !== "admin") {
    return {
      success: false,
      error: "Non hai i permessi per visualizzare il dettaglio veicolo",
      code: ErrorCode.FORBIDDEN,
    };
  }

  const tenantId = ctx.organizationId;
  if (!tenantId) {
    return {
      success: false,
      error: "Nessun tenant attivo nella sessione",
      code: ErrorCode.FORBIDDEN,
    };
  }

  if (!vehicleId) {
    return {
      success: false,
      error: "ID veicolo obbligatorio",
      code: ErrorCode.VALIDATION,
    };
  }

  const dateRange = {
    startDate: new Date(startDate),
    endDate: new Date(endDate),
  };

  try {
    const prisma = getPrismaForTenant(tenantId);
    const detail = await getVehicleDetail(prisma, vehicleId, dateRange);

    if (!detail) {
      return {
        success: false,
        error: "Veicolo non trovato",
        code: ErrorCode.NOT_FOUND,
      };
    }

    return { success: true, data: detail };
  } catch (error) {
    logger.error(
      { error, userId: ctx.userId, tenantId, vehicleId },
      "Failed to load vehicle emission detail"
    );
    return {
      success: false,
      error: "Errore nel caricamento del dettaglio veicolo",
      code: ErrorCode.INTERNAL,
    };
  }
}
