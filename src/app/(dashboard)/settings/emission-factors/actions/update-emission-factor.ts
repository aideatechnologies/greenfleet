"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/types/action-result";
import { ErrorCode } from "@/types/action-result";
import type { EmissionFactor } from "@/generated/prisma/client";
import { updateEmissionFactorSchema } from "@/lib/schemas/emission-factor";
import {
  updateEmissionFactor,
  getEmissionFactorById,
  EmissionFactorNotFoundError,
} from "@/lib/services/emission-factor-service";
import { requireAuth, isGlobalAdmin } from "@/lib/auth/permissions";
import { prisma, getPrismaForTenant } from "@/lib/db/client";
import { auditUpdate, calculateChanges } from "@/lib/services/audit-service";
import { logger } from "@/lib/utils/logger";

const AUDITABLE_FIELDS = [
  "macroFuelTypeId",
  "fuelType",
  "co2",
  "ch4",
  "n2o",
  "hfc",
  "pfc",
  "sf6",
  "nf3",
  "source",
  "effectiveDate",
];

export async function updateEmissionFactorAction(
  id: number,
  input: unknown
): Promise<ActionResult<EmissionFactor>> {
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

  const parsed = updateEmissionFactorSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0].message,
      code: ErrorCode.VALIDATION,
    };
  }

  try {
    // Fetch existing for audit diff
    const existing = await getEmissionFactorById(prisma, id);
    if (!existing) {
      return {
        success: false,
        error: "Fattore di emissione non trovato",
        code: ErrorCode.NOT_FOUND,
      };
    }

    const factor = await updateEmissionFactor(prisma, id, parsed.data);

    // Audit trail with diff
    if (ctx.organizationId) {
      const changes = calculateChanges(
        existing as unknown as Record<string, unknown>,
        factor as unknown as Record<string, unknown>,
        AUDITABLE_FIELDS
      );

      const tenantPrisma = getPrismaForTenant(ctx.organizationId);
      await auditUpdate(tenantPrisma, {
        userId: ctx.userId,
        action: "emission_factor.updated",
        entityType: "EmissionFactor",
        entityId: String(id),
        changes,
      });
    }

    revalidatePath("/settings/emission-factors");
    return { success: true, data: factor };
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
      "Failed to update emission factor"
    );
    return {
      success: false,
      error: "Errore nell'aggiornamento del fattore di emissione",
      code: ErrorCode.INTERNAL,
    };
  }
}
