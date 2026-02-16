"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/types/action-result";
import { ErrorCode } from "@/types/action-result";
import type { EmissionFactor } from "@/generated/prisma/client";
import { createEmissionFactorSchema } from "@/lib/schemas/emission-factor";
import { createEmissionFactor } from "@/lib/services/emission-factor-service";
import { requireAuth, isGlobalAdmin } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db/client";
import { getPrismaForTenant } from "@/lib/db/client";
import { auditCreate } from "@/lib/services/audit-service";
import { logger } from "@/lib/utils/logger";

export async function createEmissionFactorAction(
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

  const parsed = createEmissionFactorSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0].message,
      code: ErrorCode.VALIDATION,
    };
  }

  try {
    const factor = await createEmissionFactor(
      prisma,
      parsed.data,
      ctx.userId
    );

    // Audit trail (uses tenant-scoped prisma for audit entries)
    if (ctx.organizationId) {
      const tenantPrisma = getPrismaForTenant(ctx.organizationId);
      await auditCreate(tenantPrisma, {
        userId: ctx.userId,
        action: "emission_factor.created",
        entityType: "EmissionFactor",
        entityId: String(factor.id),
        data: {
          macroFuelTypeId: parsed.data.macroFuelTypeId,
          fuelType: parsed.data.fuelType ?? null,
          co2: parsed.data.co2,
          ch4: parsed.data.ch4,
          n2o: parsed.data.n2o,
          hfc: parsed.data.hfc,
          pfc: parsed.data.pfc,
          sf6: parsed.data.sf6,
          nf3: parsed.data.nf3,
          source: parsed.data.source,
          effectiveDate: parsed.data.effectiveDate,
        },
      });
    }

    revalidatePath("/settings/emission-factors");
    return { success: true, data: factor };
  } catch (error) {
    logger.error(
      { error, userId: ctx.userId },
      "Failed to create emission factor"
    );
    return {
      success: false,
      error: "Errore nella creazione del fattore di emissione",
      code: ErrorCode.INTERNAL,
    };
  }
}
