"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/types/action-result";
import { ErrorCode } from "@/types/action-result";
import { assignVehicleSchema } from "@/lib/schemas/vehicle-assignment";
import { assignVehicle } from "@/lib/services/assignment-service";
import { requireAuth, isTenantAdmin } from "@/lib/auth/permissions";
import { getPrismaForTenant } from "@/lib/db/client";
import { logger } from "@/lib/utils/logger";

export async function assignVehicleAction(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
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

  const parsed = assignVehicleSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0].message,
      code: ErrorCode.VALIDATION,
    };
  }

  try {
    const prisma = getPrismaForTenant(tenantId);
    const assignment = await assignVehicle(prisma, parsed.data);

    revalidatePath("/vehicles");
    revalidatePath(`/vehicles/${parsed.data.vehicleId}`);
    revalidatePath("/dipendenti");
    revalidatePath(`/dipendenti/${parsed.data.employeeId}`);

    return { success: true, data: { id: assignment.id } };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Errore nell'assegnazione";
    logger.error(
      { error, userId: ctx.userId, tenantId, input: parsed.data },
      "Failed to assign vehicle"
    );
    return {
      success: false,
      error: message,
      code: ErrorCode.INTERNAL,
    };
  }
}
