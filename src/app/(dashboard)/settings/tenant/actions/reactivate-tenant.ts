"use server";

import { ActionResult, ErrorCode } from "@/types/action-result";
import { tenantService } from "@/lib/services/tenant-service";
import { requireAdmin } from "@/lib/auth/require-admin";
import { logger } from "@/lib/utils/logger";

type ReactivateTenantResult = { id: string };

export async function reactivateTenant(
  id: string
): Promise<ActionResult<ReactivateTenantResult>> {
  const adminCheck = await requireAdmin();
  if (!adminCheck.success) {
    return adminCheck;
  }

  if (!id) {
    return {
      success: false,
      error: "ID tenant richiesto",
      code: ErrorCode.VALIDATION,
    };
  }

  try {
    await tenantService.reactivateTenant(id);
    return { success: true, data: { id } };
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_FOUND") {
      return {
        success: false,
        error: "Società non trovata",
        code: ErrorCode.NOT_FOUND,
      };
    }
    logger.error(
      { error, tenantId: id, userId: adminCheck.userId },
      "Failed to reactivate tenant"
    );
    return {
      success: false,
      error: "Errore nella riattivazione della società",
      code: ErrorCode.INTERNAL,
    };
  }
}
