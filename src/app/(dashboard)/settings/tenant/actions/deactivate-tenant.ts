"use server";

import { ActionResult, ErrorCode } from "@/types/action-result";
import { deactivateTenantSchema } from "@/lib/schemas/tenant";
import { tenantService } from "@/lib/services/tenant-service";
import { requireAdmin } from "@/lib/auth/require-admin";
import { logger } from "@/lib/utils/logger";

type DeactivateTenantResult = { id: string };

export async function deactivateTenant(
  formData: FormData
): Promise<ActionResult<DeactivateTenantResult>> {
  const adminCheck = await requireAdmin();
  if (!adminCheck.success) {
    return adminCheck;
  }

  const parsed = deactivateTenantSchema.safeParse({
    id: formData.get("id"),
    reason: formData.get("reason") || undefined,
  });

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0].message,
      code: ErrorCode.VALIDATION,
    };
  }

  try {
    // Guard: demo tenants cannot be deactivated
    const tenant = await tenantService.getTenantById(parsed.data.id);
    if (tenant?.isDemo) {
      return {
        success: false,
        error: "Il tenant demo non può essere disattivato",
        code: ErrorCode.FORBIDDEN,
      };
    }

    await tenantService.deactivateTenant(parsed.data.id, parsed.data.reason);
    return { success: true, data: { id: parsed.data.id } };
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_FOUND") {
      return {
        success: false,
        error: "Società non trovata",
        code: ErrorCode.NOT_FOUND,
      };
    }
    logger.error(
      { error, tenantId: parsed.data.id, userId: adminCheck.userId },
      "Failed to deactivate tenant"
    );
    return {
      success: false,
      error: "Errore nella disattivazione della società",
      code: ErrorCode.INTERNAL,
    };
  }
}
