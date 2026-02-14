"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/types/action-result";
import { ErrorCode } from "@/types/action-result";
import { createEmissionTargetSchema } from "@/lib/schemas/emission-target";
import { requireAuth, isTenantAdmin } from "@/lib/auth/permissions";
import { getPrismaForTenant } from "@/lib/db/client";
import { auditCreate } from "@/lib/services/audit-service";
import { logger } from "@/lib/utils/logger";
import type { EmissionTarget } from "@/generated/prisma/client";

export async function createEmissionTargetAction(
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

  const parsed = createEmissionTargetSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0].message,
      code: ErrorCode.VALIDATION,
    };
  }

  try {
    const prisma = getPrismaForTenant(tenantId);

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

    const target = await prisma.emissionTarget.create({
      data: {
        tenantId: "", // Overwritten by tenant extension
        scope: parsed.data.scope,
        carlistId: parsed.data.scope === "Carlist" ? parsed.data.carlistId : null,
        targetValue: parsed.data.targetValue,
        period: parsed.data.period,
        startDate: parsed.data.startDate,
        endDate: parsed.data.endDate,
        description: parsed.data.description ?? null,
        createdBy: ctx.userId,
      },
    });

    // Audit trail
    await auditCreate(prisma, {
      userId: ctx.userId,
      action: "emission_target.created",
      entityType: "EmissionTarget",
      entityId: target.id,
      data: {
        scope: target.scope,
        carlistId: target.carlistId,
        targetValue: target.targetValue,
        period: target.period,
        startDate: target.startDate,
        endDate: target.endDate,
        description: target.description,
      },
    });

    revalidatePath("/emissions/targets");
    return { success: true, data: target };
  } catch (error) {
    logger.error(
      { error, userId: ctx.userId, tenantId },
      "Failed to create emission target"
    );
    return {
      success: false,
      error: "Errore nella creazione del target di emissioni",
      code: ErrorCode.INTERNAL,
    };
  }
}
