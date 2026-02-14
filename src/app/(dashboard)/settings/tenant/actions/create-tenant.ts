"use server";

import { ActionResult, ErrorCode } from "@/types/action-result";
import { createTenantSchema } from "@/lib/schemas/tenant";
import { tenantService } from "@/lib/services/tenant-service";
import { requireAdmin } from "@/lib/auth/require-admin";
import { logger } from "@/lib/utils/logger";

type CreateTenantResult = { id: string; name: string; slug: string };

export async function createTenant(
  formData: FormData
): Promise<ActionResult<CreateTenantResult>> {
  const adminCheck = await requireAdmin();
  if (!adminCheck.success) {
    return adminCheck;
  }

  const parsed = createTenantSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
  });

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0].message,
      code: ErrorCode.VALIDATION,
    };
  }

  try {
    const tenant = await tenantService.createTenant(parsed.data);
    return {
      success: true,
      data: { id: tenant.id, name: tenant.name, slug: tenant.slug },
    };
  } catch (error) {
    if (error instanceof Error && error.message === "SLUG_EXISTS") {
      return {
        success: false,
        error: "Slug già in uso",
        code: ErrorCode.CONFLICT,
      };
    }
    logger.error({ error, userId: adminCheck.userId }, "Failed to create tenant");
    return {
      success: false,
      error: "Errore nella creazione della società",
      code: ErrorCode.INTERNAL,
    };
  }
}
