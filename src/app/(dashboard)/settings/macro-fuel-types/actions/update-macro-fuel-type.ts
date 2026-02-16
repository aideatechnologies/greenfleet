"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/types/action-result";
import { ErrorCode } from "@/types/action-result";
import type { MacroFuelType } from "@/generated/prisma/client";
import { updateMacroFuelTypeSchema } from "@/lib/schemas/macro-fuel-type";
import {
  updateMacroFuelType,
  getMacroFuelTypeById,
  MacroFuelTypeNotFoundError,
} from "@/lib/services/macro-fuel-type-service";
import { requireAuth, isGlobalAdmin } from "@/lib/auth/permissions";
import { prisma, getPrismaForTenant } from "@/lib/db/client";
import { auditUpdate, calculateChanges } from "@/lib/services/audit-service";
import { logger } from "@/lib/utils/logger";

const AUDITABLE_FIELDS = ["name", "scope", "unit", "color", "sortOrder", "isActive"];

export async function updateMacroFuelTypeAction(
  id: number,
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

  const parsed = updateMacroFuelTypeSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0].message,
      code: ErrorCode.VALIDATION,
    };
  }

  try {
    const existing = await getMacroFuelTypeById(prisma, id);
    if (!existing) {
      return {
        success: false,
        error: "Macro tipo carburante non trovato",
        code: ErrorCode.NOT_FOUND,
      };
    }

    const macroFuelType = await updateMacroFuelType(prisma, id, parsed.data);

    if (ctx.organizationId) {
      const changes = calculateChanges(
        existing as unknown as Record<string, unknown>,
        macroFuelType as unknown as Record<string, unknown>,
        AUDITABLE_FIELDS
      );

      const tenantPrisma = getPrismaForTenant(ctx.organizationId);
      await auditUpdate(tenantPrisma, {
        userId: ctx.userId,
        action: "macro_fuel_type.updated",
        entityType: "MacroFuelType",
        entityId: String(id),
        changes,
      });
    }

    revalidatePath("/settings/macro-fuel-types");
    return { success: true, data: macroFuelType };
  } catch (error) {
    if (error instanceof MacroFuelTypeNotFoundError) {
      return {
        success: false,
        error: error.message,
        code: ErrorCode.NOT_FOUND,
      };
    }
    logger.error(
      { error, userId: ctx.userId, id },
      "Failed to update macro fuel type"
    );
    return {
      success: false,
      error: "Errore nell'aggiornamento del macro tipo carburante",
      code: ErrorCode.INTERNAL,
    };
  }
}
