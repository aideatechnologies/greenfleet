"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/types/action-result";
import { ErrorCode } from "@/types/action-result";
import type { FuelTypeMacroMapping } from "@/generated/prisma/client";
import { updateFuelTypeMappingSchema } from "@/lib/schemas/fuel-type-mapping";
import {
  updateFuelTypeMapping,
  FuelTypeMappingNotFoundError,
} from "@/lib/services/fuel-type-mapping-service";
import { requireAuth, isGlobalAdmin } from "@/lib/auth/permissions";
import { prisma, getPrismaForTenant } from "@/lib/db/client";
import { auditUpdate, calculateChanges } from "@/lib/services/audit-service";
import { logger } from "@/lib/utils/logger";

const AUDITABLE_FIELDS = ["macroFuelTypeId", "description"];

export async function updateFuelTypeMappingAction(
  id: number,
  input: unknown
): Promise<ActionResult<FuelTypeMacroMapping>> {
  const authResult = await requireAuth();
  if (!authResult.success) return authResult;
  const { ctx } = authResult;

  const isAdmin =
    ctx.role === "owner" || (await isGlobalAdmin(ctx.userId));
  if (!isAdmin) {
    return {
      success: false,
      error: "Solo gli amministratori possono gestire le mappature carburanti",
      code: ErrorCode.FORBIDDEN,
    };
  }

  const parsed = updateFuelTypeMappingSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0].message,
      code: ErrorCode.VALIDATION,
    };
  }

  try {
    // Fetch existing for audit diff
    const existing = await prisma.fuelTypeMacroMapping.findUnique({
      where: { id },
    });
    if (!existing) {
      return {
        success: false,
        error: "Mappatura carburante non trovata",
        code: ErrorCode.NOT_FOUND,
      };
    }

    const mapping = await updateFuelTypeMapping(prisma, id, parsed.data);

    if (ctx.organizationId) {
      const changes = calculateChanges(
        existing as unknown as Record<string, unknown>,
        mapping as unknown as Record<string, unknown>,
        AUDITABLE_FIELDS
      );

      const tenantPrisma = getPrismaForTenant(ctx.organizationId);
      await auditUpdate(tenantPrisma, {
        userId: ctx.userId,
        action: "fuel_type_mapping.updated",
        entityType: "FuelTypeMacroMapping",
        entityId: String(id),
        changes,
      });
    }

    revalidatePath("/settings/fuel-type-mappings");
    return { success: true, data: mapping };
  } catch (error) {
    if (error instanceof FuelTypeMappingNotFoundError) {
      return {
        success: false,
        error: error.message,
        code: ErrorCode.NOT_FOUND,
      };
    }
    logger.error(
      { error, userId: ctx.userId, id },
      "Failed to update fuel type mapping"
    );
    return {
      success: false,
      error: "Errore nell'aggiornamento della mappatura carburante",
      code: ErrorCode.INTERNAL,
    };
  }
}
