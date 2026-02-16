"use server";

import type { ActionResult } from "@/types/action-result";
import { ErrorCode } from "@/types/action-result";
import { requireAuth } from "@/lib/auth/permissions";
import { getPrismaForTenant } from "@/lib/db/client";
import { getLastKnownOdometer } from "@/lib/services/km-reading-service";

export type LastOdometerResult = {
  odometerKm: number;
  date: Date;
  source: string;
} | null;

/**
 * Get the last known odometer reading for a vehicle.
 * Used as a hint in the km reading form.
 */
export async function getLastOdometerAction(
  vehicleId: number
): Promise<ActionResult<LastOdometerResult>> {
  const authResult = await requireAuth();
  if (!authResult.success) return authResult;
  const { ctx } = authResult;

  const tenantId = ctx.organizationId;
  if (!tenantId) {
    return {
      success: false,
      error: "Nessun tenant attivo nella sessione",
      code: ErrorCode.FORBIDDEN,
    };
  }

  try {
    const prisma = getPrismaForTenant(tenantId);
    const result = await getLastKnownOdometer(prisma, vehicleId);
    return { success: true, data: result };
  } catch {
    return {
      success: false,
      error: "Errore nel recupero del chilometraggio",
      code: ErrorCode.INTERNAL,
    };
  }
}
