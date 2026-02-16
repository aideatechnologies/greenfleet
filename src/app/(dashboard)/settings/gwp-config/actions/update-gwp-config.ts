"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/types/action-result";
import { ErrorCode } from "@/types/action-result";
import type { GwpConfig } from "@/generated/prisma/client";
import { updateGwpConfigSchema } from "@/lib/schemas/gwp-config";
import {
  updateGwpConfig,
  getGwpConfigById,
  GwpConfigNotFoundError,
} from "@/lib/services/gwp-config-service";
import { requireAuth, isGlobalAdmin } from "@/lib/auth/permissions";
import { prisma, getPrismaForTenant } from "@/lib/db/client";
import { auditUpdate, calculateChanges } from "@/lib/services/audit-service";
import { logger } from "@/lib/utils/logger";

const AUDITABLE_FIELDS = ["gwpValue", "source", "isActive"];

export async function updateGwpConfigAction(
  id: number,
  input: unknown
): Promise<ActionResult<GwpConfig>> {
  const authResult = await requireAuth();
  if (!authResult.success) return authResult;
  const { ctx } = authResult;

  const isAdmin =
    ctx.role === "owner" || (await isGlobalAdmin(ctx.userId));
  if (!isAdmin) {
    return {
      success: false,
      error: "Solo gli amministratori possono gestire le configurazioni GWP",
      code: ErrorCode.FORBIDDEN,
    };
  }

  const parsed = updateGwpConfigSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0].message,
      code: ErrorCode.VALIDATION,
    };
  }

  try {
    const existing = await getGwpConfigById(prisma, id);
    if (!existing) {
      return {
        success: false,
        error: "Configurazione GWP non trovata",
        code: ErrorCode.NOT_FOUND,
      };
    }

    const config = await updateGwpConfig(prisma, id, parsed.data);

    if (ctx.organizationId) {
      const changes = calculateChanges(
        existing as unknown as Record<string, unknown>,
        config as unknown as Record<string, unknown>,
        AUDITABLE_FIELDS
      );

      const tenantPrisma = getPrismaForTenant(ctx.organizationId);
      await auditUpdate(tenantPrisma, {
        userId: ctx.userId,
        action: "gwp_config.updated",
        entityType: "GwpConfig",
        entityId: String(id),
        changes,
      });
    }

    revalidatePath("/settings/gwp-config");
    return { success: true, data: config };
  } catch (error) {
    if (error instanceof GwpConfigNotFoundError) {
      return {
        success: false,
        error: error.message,
        code: ErrorCode.NOT_FOUND,
      };
    }
    logger.error(
      { error, userId: ctx.userId, id },
      "Failed to update GWP config"
    );
    return {
      success: false,
      error: "Errore nell'aggiornamento della configurazione GWP",
      code: ErrorCode.INTERNAL,
    };
  }
}
