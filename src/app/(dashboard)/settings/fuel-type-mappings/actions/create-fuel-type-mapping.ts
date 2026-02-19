"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/types/action-result";
import { ErrorCode } from "@/types/action-result";
import type { FuelTypeMacroMapping } from "@/generated/prisma/client";
import { createFuelTypeMappingSchema } from "@/lib/schemas/fuel-type-mapping";
import { createFuelTypeMapping } from "@/lib/services/fuel-type-mapping-service";
import { requireAuth, isGlobalAdmin } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db/client";
import { getPrismaForTenant } from "@/lib/db/client";
import { auditCreate } from "@/lib/services/audit-service";
import { logger } from "@/lib/utils/logger";
import { invalidateFuelTypeLabelCache } from "@/lib/utils/fuel-type-label";

export async function createFuelTypeMappingAction(
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

  const parsed = createFuelTypeMappingSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0].message,
      code: ErrorCode.VALIDATION,
    };
  }

  try {
    const mapping = await createFuelTypeMapping(prisma, parsed.data);

    if (ctx.organizationId) {
      const tenantPrisma = getPrismaForTenant(ctx.organizationId);
      await auditCreate(tenantPrisma, {
        userId: ctx.userId,
        action: "fuel_type_mapping.created",
        entityType: "FuelTypeMacroMapping",
        entityId: String(mapping.id),
        data: {
          vehicleFuelType: parsed.data.vehicleFuelType,
          macroFuelTypeId: parsed.data.macroFuelTypeId,
          scope: parsed.data.scope,
        },
      });
    }

    invalidateFuelTypeLabelCache();
    revalidatePath("/settings/fuel-type-mappings");
    return { success: true, data: mapping };
  } catch (error) {
    logger.error(
      { error, userId: ctx.userId },
      "Failed to create fuel type mapping"
    );
    return {
      success: false,
      error: "Errore nella creazione della mappatura carburante",
      code: ErrorCode.INTERNAL,
    };
  }
}
