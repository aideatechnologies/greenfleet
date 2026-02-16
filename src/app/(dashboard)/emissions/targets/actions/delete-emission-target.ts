"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/types/action-result";
import { ErrorCode } from "@/types/action-result";
import { requireAuth, isTenantAdmin } from "@/lib/auth/permissions";
import { getPrismaForTenant } from "@/lib/db/client";
import { auditCreate } from "@/lib/services/audit-service";
import { logger } from "@/lib/utils/logger";

export async function deleteEmissionTargetAction(
  targetId: number
): Promise<ActionResult<{ id: number }>> {
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

  // Only owner or admin can manage targets
  const canManage = await isTenantAdmin(ctx, tenantId);
  if (!canManage) {
    return {
      success: false,
      error: "Permessi insufficienti per gestire i target di emissioni",
      code: ErrorCode.FORBIDDEN,
    };
  }

  try {
    const prisma = getPrismaForTenant(tenantId);

    // Verify target belongs to tenant
    const existing = await prisma.emissionTarget.findFirst({
      where: { id: targetId },
    });
    if (!existing) {
      return {
        success: false,
        error: "Target di emissioni non trovato",
        code: ErrorCode.NOT_FOUND,
      };
    }

    await prisma.emissionTarget.delete({
      where: { id: targetId },
    });

    // Audit trail
    await auditCreate(prisma, {
      userId: ctx.userId,
      action: "emission_target.deleted",
      entityType: "EmissionTarget",
      entityId: String(targetId),
      data: {
        scope: existing.scope,
        carlistId: existing.carlistId,
        targetValue: existing.targetValue,
        period: existing.period,
        startDate: existing.startDate,
        endDate: existing.endDate,
        description: existing.description,
      },
    });

    revalidatePath("/emissions/targets");
    return { success: true, data: { id: targetId } };
  } catch (error) {
    logger.error(
      { error, userId: ctx.userId, tenantId, targetId },
      "Failed to delete emission target"
    );
    return {
      success: false,
      error: "Errore nell'eliminazione del target di emissioni",
      code: ErrorCode.INTERNAL,
    };
  }
}
