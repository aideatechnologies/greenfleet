"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/types/action-result";
import { ErrorCode } from "@/types/action-result";
import type { MacroFuelType } from "@/generated/prisma/client";
import { createMacroFuelTypeSchema } from "@/lib/schemas/macro-fuel-type";
import { createMacroFuelType } from "@/lib/services/macro-fuel-type-service";
import { requireAuth, isGlobalAdmin } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db/client";
import { getPrismaForTenant } from "@/lib/db/client";
import { auditCreate } from "@/lib/services/audit-service";
import { logger } from "@/lib/utils/logger";

export async function createMacroFuelTypeAction(
  input: unknown
): Promise<ActionResult<MacroFuelType>> {
  const authResult = await requireAuth();
  if (!authResult.success) return authResult;
  const { ctx } = authResult;

  const isAdmin =
    ctx.role === "owner" || (await isGlobalAdmin(ctx.userId));
  if (!isAdmin) {
    return {
      success: false,
      error: "Solo gli amministratori possono gestire i macro tipi carburante",
      code: ErrorCode.FORBIDDEN,
    };
  }

  const parsed = createMacroFuelTypeSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0].message,
      code: ErrorCode.VALIDATION,
    };
  }

  try {
    const macroFuelType = await createMacroFuelType(prisma, parsed.data);

    if (ctx.organizationId) {
      const tenantPrisma = getPrismaForTenant(ctx.organizationId);
      await auditCreate(tenantPrisma, {
        userId: ctx.userId,
        action: "macro_fuel_type.created",
        entityType: "MacroFuelType",
        entityId: macroFuelType.id,
        data: {
          name: parsed.data.name,
          scope: parsed.data.scope,
          unit: parsed.data.unit,
          sortOrder: parsed.data.sortOrder,
        },
      });
    }

    revalidatePath("/settings/macro-fuel-types");
    return { success: true, data: macroFuelType };
  } catch (error) {
    logger.error(
      { error, userId: ctx.userId },
      "Failed to create macro fuel type"
    );
    return {
      success: false,
      error: "Errore nella creazione del macro tipo carburante",
      code: ErrorCode.INTERNAL,
    };
  }
}
