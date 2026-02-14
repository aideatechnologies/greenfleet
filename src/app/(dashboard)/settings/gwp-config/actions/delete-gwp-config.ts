"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/types/action-result";
import { ErrorCode } from "@/types/action-result";
import {
  deleteGwpConfig,
  GwpConfigNotFoundError,
} from "@/lib/services/gwp-config-service";
import { requireAuth, isGlobalAdmin } from "@/lib/auth/permissions";
import { prisma, getPrismaForTenant } from "@/lib/db/client";
import { auditCreate } from "@/lib/services/audit-service";
import { logger } from "@/lib/utils/logger";

export async function deleteGwpConfigAction(
  id: string
): Promise<ActionResult<{ id: string }>> {
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

  try {
    const deleted = await deleteGwpConfig(prisma, id);

    if (ctx.organizationId) {
      const tenantPrisma = getPrismaForTenant(ctx.organizationId);
      await auditCreate(tenantPrisma, {
        userId: ctx.userId,
        action: "gwp_config.deleted",
        entityType: "GwpConfig",
        entityId: id,
        data: {
          gasName: deleted.gasName,
          gwpValue: deleted.gwpValue,
          source: deleted.source,
        },
      });
    }

    revalidatePath("/settings/gwp-config");
    return { success: true, data: { id } };
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
      "Failed to delete GWP config"
    );
    return {
      success: false,
      error: "Errore nell'eliminazione della configurazione GWP",
      code: ErrorCode.INTERNAL,
    };
  }
}
