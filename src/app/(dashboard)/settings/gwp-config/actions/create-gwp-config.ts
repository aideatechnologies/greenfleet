"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/types/action-result";
import { ErrorCode } from "@/types/action-result";
import type { GwpConfig } from "@/generated/prisma/client";
import { createGwpConfigSchema } from "@/lib/schemas/gwp-config";
import { createGwpConfig } from "@/lib/services/gwp-config-service";
import { requireAuth, isGlobalAdmin } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db/client";
import { getPrismaForTenant } from "@/lib/db/client";
import { auditCreate } from "@/lib/services/audit-service";
import { logger } from "@/lib/utils/logger";

export async function createGwpConfigAction(
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

  const parsed = createGwpConfigSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0].message,
      code: ErrorCode.VALIDATION,
    };
  }

  try {
    const config = await createGwpConfig(prisma, parsed.data);

    if (ctx.organizationId) {
      const tenantPrisma = getPrismaForTenant(ctx.organizationId);
      await auditCreate(tenantPrisma, {
        userId: ctx.userId,
        action: "gwp_config.created",
        entityType: "GwpConfig",
        entityId: config.id,
        data: {
          gasName: parsed.data.gasName,
          gwpValue: parsed.data.gwpValue,
          source: parsed.data.source,
        },
      });
    }

    revalidatePath("/settings/gwp-config");
    return { success: true, data: config };
  } catch (error) {
    logger.error(
      { error, userId: ctx.userId },
      "Failed to create GWP config"
    );
    return {
      success: false,
      error: "Errore nella creazione della configurazione GWP",
      code: ErrorCode.INTERNAL,
    };
  }
}
