"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/types/action-result";
import { ErrorCode } from "@/types/action-result";
import { updateEmissionTargetSchema } from "@/lib/schemas/emission-target";
import { requireAuth, isTenantAdmin } from "@/lib/auth/permissions";
import { getPrismaForTenant } from "@/lib/db/client";
import { auditUpdate, diffObjects } from "@/lib/services/audit-service";
import { logger } from "@/lib/utils/logger";
import type { EmissionTarget } from "@/generated/prisma/client";

export async function updateEmissionTargetAction(
  input: unknown
): Promise<ActionResult<EmissionTarget>> {
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

  const parsed = updateEmissionTargetSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0].message,
      code: ErrorCode.VALIDATION,
    };
  }

  try {
    const prisma = getPrismaForTenant(tenantId);

    // Verify target belongs to tenant
    const existing = await prisma.emissionTarget.findFirst({
      where: { id: parsed.data.id },
    });
    if (!existing) {
      return {
        success: false,
        error: "Target di emissioni non trovato",
        code: ErrorCode.NOT_FOUND,
      };
    }

    // If scope = Carlist, verify the carlist belongs to the tenant
    if (parsed.data.scope === "Carlist" && parsed.data.carlistId) {
      const carlist = await prisma.carlist.findFirst({
        where: { id: parsed.data.carlistId },
      });
      if (!carlist) {
        return {
          success: false,
          error: "Carlist non trovata",
          code: ErrorCode.NOT_FOUND,
        };
      }
    }

    const updated = await prisma.emissionTarget.update({
      where: { id: parsed.data.id },
      data: {
        scope: parsed.data.scope,
        carlistId: parsed.data.scope === "Carlist" ? parsed.data.carlistId : null,
        targetValue: parsed.data.targetValue,
        period: parsed.data.period,
        startDate: parsed.data.startDate,
        endDate: parsed.data.endDate,
        description: parsed.data.description ?? null,
      },
    });

    // Audit trail
    const changes = diffObjects(
      {
        scope: existing.scope,
        carlistId: existing.carlistId,
        targetValue: existing.targetValue,
        period: existing.period,
        startDate: existing.startDate,
        endDate: existing.endDate,
        description: existing.description,
      },
      {
        scope: updated.scope,
        carlistId: updated.carlistId,
        targetValue: updated.targetValue,
        period: updated.period,
        startDate: updated.startDate,
        endDate: updated.endDate,
        description: updated.description,
      }
    );

    await auditUpdate(prisma, {
      userId: ctx.userId,
      action: "emission_target.updated",
      entityType: "EmissionTarget",
      entityId: updated.id,
      changes,
    });

    revalidatePath("/emissions/targets");
    return { success: true, data: updated };
  } catch (error) {
    logger.error(
      { error, userId: ctx.userId, tenantId },
      "Failed to update emission target"
    );
    return {
      success: false,
      error: "Errore nell'aggiornamento del target di emissioni",
      code: ErrorCode.INTERNAL,
    };
  }
}
