"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/types/action-result";
import { ErrorCode } from "@/types/action-result";
import {
  deleteFuelTypeMapping,
  FuelTypeMappingNotFoundError,
} from "@/lib/services/fuel-type-mapping-service";
import { requireAuth, isGlobalAdmin } from "@/lib/auth/permissions";
import { prisma, getPrismaForTenant } from "@/lib/db/client";
import { auditCreate } from "@/lib/services/audit-service";
import { logger } from "@/lib/utils/logger";

export async function deleteFuelTypeMappingAction(
  id: string
): Promise<ActionResult<{ id: string }>> {
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

  try {
    const deleted = await deleteFuelTypeMapping(prisma, id);

    if (ctx.organizationId) {
      const tenantPrisma = getPrismaForTenant(ctx.organizationId);
      await auditCreate(tenantPrisma, {
        userId: ctx.userId,
        action: "fuel_type_mapping.deleted",
        entityType: "FuelTypeMacroMapping",
        entityId: id,
        data: {
          vehicleFuelType: deleted.vehicleFuelType,
          macroFuelTypeId: deleted.macroFuelTypeId,
          scope: deleted.scope,
        },
      });
    }

    revalidatePath("/settings/fuel-type-mappings");
    return { success: true, data: { id } };
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
      "Failed to delete fuel type mapping"
    );
    return {
      success: false,
      error: "Errore nell'eliminazione della mappatura carburante",
      code: ErrorCode.INTERNAL,
    };
  }
}
