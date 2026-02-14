"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/types/action-result";
import { ErrorCode } from "@/types/action-result";
import {
  deleteEmissionFactor,
  EmissionFactorNotFoundError,
} from "@/lib/services/emission-factor-service";
import { requireAuth, isGlobalAdmin } from "@/lib/auth/permissions";
import { prisma, getPrismaForTenant } from "@/lib/db/client";
import { auditCreate } from "@/lib/services/audit-service";
import { logger } from "@/lib/utils/logger";

export async function deleteEmissionFactorAction(
  id: string
): Promise<ActionResult<{ id: string }>> {
  const authResult = await requireAuth();
  if (!authResult.success) return authResult;
  const { ctx } = authResult;

  // Only Admin (owner role or isAdmin) can manage emission factors
  const isAdmin =
    ctx.role === "owner" || (await isGlobalAdmin(ctx.userId));
  if (!isAdmin) {
    return {
      success: false,
      error: "Solo gli amministratori possono gestire i fattori di emissione",
      code: ErrorCode.FORBIDDEN,
    };
  }

  try {
    const deleted = await deleteEmissionFactor(prisma, id);

    // Audit trail for deletion
    if (ctx.organizationId) {
      const tenantPrisma = getPrismaForTenant(ctx.organizationId);
      await auditCreate(tenantPrisma, {
        userId: ctx.userId,
        action: "emission_factor.deleted",
        entityType: "EmissionFactor",
        entityId: id,
        data: {
          macroFuelTypeId: deleted.macroFuelTypeId,
          co2: deleted.co2,
          ch4: deleted.ch4,
          n2o: deleted.n2o,
          hfc: deleted.hfc,
          pfc: deleted.pfc,
          sf6: deleted.sf6,
          nf3: deleted.nf3,
          source: deleted.source,
          effectiveDate: deleted.effectiveDate,
        },
      });
    }

    revalidatePath("/settings/emission-factors");
    return { success: true, data: { id } };
  } catch (error) {
    if (error instanceof EmissionFactorNotFoundError) {
      return {
        success: false,
        error: error.message,
        code: ErrorCode.NOT_FOUND,
      };
    }
    logger.error(
      { error, userId: ctx.userId, id },
      "Failed to delete emission factor"
    );
    return {
      success: false,
      error: "Errore nell'eliminazione del fattore di emissione",
      code: ErrorCode.INTERNAL,
    };
  }
}
