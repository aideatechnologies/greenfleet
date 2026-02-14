"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/types/action-result";
import { ErrorCode } from "@/types/action-result";
import {
  deleteFuelRecord,
  RecordNotFoundError,
} from "@/lib/services/fuel-record-service";
import { requireAuth, isTenantAdmin } from "@/lib/auth/permissions";
import { getPrismaForTenant } from "@/lib/db/client";
import { logger } from "@/lib/utils/logger";

export async function deleteFuelRecordAction(
  recordId: string
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

  // Only Fleet Manager (admin) or owner can delete fuel records
  const canManage = await isTenantAdmin(ctx, tenantId);
  if (!canManage) {
    return {
      success: false,
      error: "Permessi insufficienti per eliminare i rifornimenti",
      code: ErrorCode.FORBIDDEN,
    };
  }

  try {
    const prisma = getPrismaForTenant(tenantId);
    await deleteFuelRecord(prisma, recordId, ctx.userId);
    revalidatePath("/fuel-records");
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
      "Failed to delete fuel record"
    );
    return {
      success: false,
      error: "Errore nell'eliminazione del rifornimento",
      code: ErrorCode.INTERNAL,
    };
  }
}
