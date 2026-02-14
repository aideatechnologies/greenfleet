"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/types/action-result";
import { ErrorCode } from "@/types/action-result";
import { replatVehicleSchema } from "@/lib/schemas/license-plate";
import { replatVehicle } from "@/lib/services/license-plate-service";
import { requireAuth, isTenantAdmin } from "@/lib/auth/permissions";
import { getPrismaForTenant } from "@/lib/db/client";
import { logger } from "@/lib/utils/logger";

export async function replatVehicleAction(
  input: unknown
): Promise<ActionResult<{ id: string; newPlate: string }>> {
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
      error: "Permessi insufficienti per la ritargatura",
      code: ErrorCode.FORBIDDEN,
    };
  }

  const parsed = replatVehicleSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0].message,
      code: ErrorCode.VALIDATION,
    };
  }

  try {
    const prisma = getPrismaForTenant(tenantId);
    const result = await replatVehicle(prisma, parsed.data);

    revalidatePath("/vehicles");
    revalidatePath(`/vehicles/${parsed.data.vehicleId}`);

    return {
      success: true,
      data: { id: result.id, newPlate: result.plateNumber },
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Errore nella ritargatura";
    logger.error(
      { error, userId: ctx.userId, tenantId, input: parsed.data },
      "Failed to replat vehicle"
    );
    const code = message.includes("gia")
      ? ErrorCode.CONFLICT
      : ErrorCode.INTERNAL;
    return { success: false, error: message, code };
  }
}
