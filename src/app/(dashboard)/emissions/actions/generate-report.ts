"use server";

import type { ActionResult } from "@/types/action-result";
import { ErrorCode } from "@/types/action-result";
import type { ReportResult, VehicleFilters } from "@/types/report";
import { reportParamsSchema } from "@/lib/schemas/report";
import { getAggregatedEmissions } from "@/lib/services/report-service";
import { requireAuth } from "@/lib/auth/permissions";
import { getPrismaForTenant } from "@/lib/db/client";
import { logger } from "@/lib/utils/logger";

// ---------------------------------------------------------------------------
// Input type for the action (dates as ISO strings for serialization)
// ---------------------------------------------------------------------------

type GenerateReportInput = {
  dateRange: { startDate: string; endDate: string };
  aggregationLevel: string;
  periodGranularity?: string;
  carlistId?: string;
  vehicleFilters?: VehicleFilters;
};

// ---------------------------------------------------------------------------
// Server action
// ---------------------------------------------------------------------------

export async function generateReportAction(
  input: GenerateReportInput
): Promise<ActionResult<ReportResult>> {
  // 1. Auth check
  const authResult = await requireAuth();
  if (!authResult.success) return authResult;
  const { ctx } = authResult;

  // 2. RBAC: only owner or admin
  if (ctx.role !== "owner" && ctx.role !== "admin") {
    return {
      success: false,
      error: "Non hai i permessi per generare report emissioni",
      code: ErrorCode.FORBIDDEN,
    };
  }

  const tenantId = ctx.organizationId;
  if (!tenantId) {
    return {
      success: false,
      error: "Nessun tenant attivo nella sessione",
      code: ErrorCode.FORBIDDEN,
    };
  }

  // 3. Validate input
  const parsed = reportParamsSchema.safeParse({
    dateRange: {
      startDate: new Date(input.dateRange.startDate),
      endDate: new Date(input.dateRange.endDate),
    },
    aggregationLevel: input.aggregationLevel,
    periodGranularity: input.periodGranularity,
    carlistId: input.carlistId,
    vehicleFilters: input.vehicleFilters,
  });

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0].message,
      code: ErrorCode.VALIDATION,
    };
  }

  // 4. Generate report
  try {
    const prisma = getPrismaForTenant(tenantId);
    const result = await getAggregatedEmissions(prisma, parsed.data);
    return { success: true, data: result };
  } catch (error) {
    logger.error(
      { error, userId: ctx.userId, tenantId },
      "Failed to generate emission report"
    );
    return {
      success: false,
      error: "Errore nella generazione del report emissioni",
      code: ErrorCode.INTERNAL,
    };
  }
}
