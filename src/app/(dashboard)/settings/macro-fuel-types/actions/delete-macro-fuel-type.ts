"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/types/action-result";
import { ErrorCode } from "@/types/action-result";
import {
  deleteMacroFuelType,
  MacroFuelTypeNotFoundError,
  MacroFuelTypeInUseError,
} from "@/lib/services/macro-fuel-type-service";
import { requireAuth, isGlobalAdmin } from "@/lib/auth/permissions";
import { prisma, getPrismaForTenant } from "@/lib/db/client";
import { auditCreate } from "@/lib/services/audit-service";
import { logger } from "@/lib/utils/logger";

export async function deleteMacroFuelTypeAction(
  id: number
): Promise<ActionResult<{ id: number }>> {
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

  try {
    const deleted = await deleteMacroFuelType(prisma, id);

    if (ctx.organizationId) {
      const tenantPrisma = getPrismaForTenant(ctx.organizationId);
      await auditCreate(tenantPrisma, {
        userId: ctx.userId,
        action: "macro_fuel_type.deleted",
        entityType: "MacroFuelType",
        entityId: String(id),
        data: {
          name: deleted.name,
          scope: deleted.scope,
          unit: deleted.unit,
          sortOrder: deleted.sortOrder,
        },
      });
    }

    revalidatePath("/settings/macro-fuel-types");
    return { success: true, data: { id } };
  } catch (error) {
    if (error instanceof MacroFuelTypeNotFoundError) {
      return {
        success: false,
        error: error.message,
        code: ErrorCode.NOT_FOUND,
      };
    }
    if (error instanceof MacroFuelTypeInUseError) {
      return {
        success: false,
        error: error.message,
        code: ErrorCode.CONFLICT,
      };
    }
    logger.error(
      { error, userId: ctx.userId, id },
      "Failed to delete macro fuel type"
    );
    return {
      success: false,
      error: "Errore nell'eliminazione del macro tipo carburante",
      code: ErrorCode.INTERNAL,
    };
  }
}
