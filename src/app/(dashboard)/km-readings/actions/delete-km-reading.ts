"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/types/action-result";
import { ErrorCode } from "@/types/action-result";
import {
  deleteKmReading,
  RecordNotFoundError,
} from "@/lib/services/km-reading-service";
import { requireAuth, isTenantAdmin } from "@/lib/auth/permissions";
import { getPrismaForTenant } from "@/lib/db/client";
import { logger } from "@/lib/utils/logger";

export async function deleteKmReadingAction(
  recordId: number
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

  // Only Fleet Manager (admin) or owner can delete km readings
  const canManage = await isTenantAdmin(ctx, tenantId);
  if (!canManage) {
    return {
      success: false,
      error: "Permessi insufficienti per eliminare le rilevazioni km",
      code: ErrorCode.FORBIDDEN,
    };
  }

  try {
    const prisma = getPrismaForTenant(tenantId);
    await deleteKmReading(prisma, recordId, ctx.userId);
    revalidatePath("/km-readings");
    return { success: true, data: { id: recordId } };
  } catch (error) {
    if (error instanceof RecordNotFoundError) {
      return {
        success: false,
        error: error.message,
        code: ErrorCode.NOT_FOUND,
      };
    }
    logger.error(
      { error, userId: ctx.userId, tenantId, recordId },
      "Failed to delete km reading"
    );
    return {
      success: false,
      error: "Errore nell'eliminazione della rilevazione km",
      code: ErrorCode.INTERNAL,
    };
  }
}
