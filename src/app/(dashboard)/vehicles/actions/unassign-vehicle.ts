"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/types/action-result";
import { ErrorCode } from "@/types/action-result";
import { unassignVehicleSchema } from "@/lib/schemas/vehicle-assignment";
import { unassignVehicle } from "@/lib/services/assignment-service";
import { requireAuth, isTenantAdmin } from "@/lib/auth/permissions";
import { getPrismaForTenant } from "@/lib/db/client";
import { logger } from "@/lib/utils/logger";

export async function unassignVehicleAction(
  input: unknown
): Promise<ActionResult<void>> {
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

  const canManage = await isTenantAdmin(ctx, tenantId);
  if (!canManage) {
    return {
      success: false,
      error: "Permessi insufficienti per gestire le assegnazioni",
      code: ErrorCode.FORBIDDEN,
    };
  }

  const parsed = unassignVehicleSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0].message,
      code: ErrorCode.VALIDATION,
    };
  }

  try {
    const prisma = getPrismaForTenant(tenantId);
    await unassignVehicle(
      prisma,
      parsed.data.vehicleId,
      parsed.data.endDate,
      parsed.data.notes
    );

    revalidatePath("/vehicles");
    revalidatePath(`/vehicles/${parsed.data.vehicleId}`);
    revalidatePath("/dipendenti");

    return { success: true, data: undefined };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Errore nella rimozione dell'assegnazione";
    logger.error(
      { error, userId: ctx.userId, tenantId, vehicleId: parsed.data.vehicleId },
      "Failed to unassign vehicle"
    );
    return {
      success: false,
      error: message,
      code: ErrorCode.INTERNAL,
    };
  }
}
