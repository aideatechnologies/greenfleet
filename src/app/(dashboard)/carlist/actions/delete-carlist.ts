"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/types/action-result";
import { ErrorCode } from "@/types/action-result";
import { deleteCarlist } from "@/lib/services/carlist-service";
import { requireAuth, isTenantAdmin } from "@/lib/auth/permissions";
import { getPrismaForTenant } from "@/lib/db/client";
import { logger } from "@/lib/utils/logger";

export async function deleteCarlistAction(
  id: number
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

  const canManage = await isTenantAdmin(ctx, tenantId);
  if (!canManage) {
    return {
      success: false,
      error: "Permessi insufficienti per gestire le carlist",
      code: ErrorCode.FORBIDDEN,
    };
  }

  try {
    const prisma = getPrismaForTenant(tenantId);
    const result = await deleteCarlist(prisma, id);

    if (result.success) {
      revalidatePath("/carlist");
    }

    return result;
  } catch (error) {
    logger.error(
      { error, userId: ctx.userId, tenantId },
      "Failed to delete carlist"
    );
    return {
      success: false,
      error: "Errore nell'eliminazione della carlist",
      code: ErrorCode.INTERNAL,
    };
  }
}
