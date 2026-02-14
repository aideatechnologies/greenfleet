"use server";

import { ActionResult, ErrorCode } from "@/types/action-result";
import { updateTenantSchema } from "@/lib/schemas/tenant";
import { tenantService } from "@/lib/services/tenant-service";
import { requireAdmin } from "@/lib/auth/require-admin";
import { logger } from "@/lib/utils/logger";

type UpdateTenantResult = { id: string; name: string; slug: string };

export async function updateTenant(
  id: string,
  formData: FormData
): Promise<ActionResult<UpdateTenantResult>> {
  const adminCheck = await requireAdmin();
  if (!adminCheck.success) {
    return adminCheck;
  }

  const nameValue = formData.get("name");
  const slugValue = formData.get("slug");

  const parsed = updateTenantSchema.safeParse({
    name:
      typeof nameValue === "string" && nameValue.trim()
        ? nameValue.trim()
        : undefined,
    slug:
      typeof slugValue === "string" && slugValue.trim()
        ? slugValue.trim()
        : undefined,
  });

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0].message,
      code: ErrorCode.VALIDATION,
    };
  }

  try {
    const tenant = await tenantService.updateTenant(id, parsed.data);
    return {
      success: true,
      data: { id: tenant.id, name: tenant.name, slug: tenant.slug },
    };
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "SLUG_EXISTS") {
        return {
          success: false,
          error: "Slug già in uso",
          code: ErrorCode.CONFLICT,
        };
      }
      if (error.message === "NOT_FOUND") {
        return {
          success: false,
          error: "Società non trovata",
          code: ErrorCode.NOT_FOUND,
        };
      }
    }
    logger.error({ error, tenantId: id, userId: adminCheck.userId }, "Failed to update tenant");
    return {
      success: false,
      error: "Errore nell'aggiornamento della società",
      code: ErrorCode.INTERNAL,
    };
  }
}
