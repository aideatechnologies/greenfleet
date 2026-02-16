"use server";

import { z } from "zod";
import type { ActionResult } from "@/types/action-result";
import { ErrorCode } from "@/types/action-result";
import type { TargetProgress, TargetScope } from "@/types/emission-target";
import { getTargetProgressForDashboard } from "@/lib/services/report-service";
import { requireAuth } from "@/lib/auth/permissions";
import { getPrismaForTenant } from "@/lib/db/client";
import { logger } from "@/lib/utils/logger";

// ---------------------------------------------------------------------------
// Validation schema
// ---------------------------------------------------------------------------

const targetProgressSchema = z.object({
  scope: z.union([z.literal("Fleet"), z.literal("Carlist")]),
  scopeId: z.number().nullable(),
  startDate: z.string({ error: "La data di inizio e obbligatoria" }),
  endDate: z.string({ error: "La data di fine e obbligatoria" }),
});

// ---------------------------------------------------------------------------
// Result type
// ---------------------------------------------------------------------------

export type TargetProgressResult = {
  target: {
    id: number;
    description: string | null;
    scope: string;
    period: string;
    targetValue: number;
    startDate: string;
    endDate: string;
  };
  progress: TargetProgress;
};

// ---------------------------------------------------------------------------
// Server action
// ---------------------------------------------------------------------------

export async function getTargetProgressAction(
  scope: string,
  scopeId: number | null,
  startDate: string,
  endDate: string
): Promise<ActionResult<TargetProgressResult | null>> {
  // 1. Auth
  const authResult = await requireAuth();
  if (!authResult.success) return authResult;
  const { ctx } = authResult;

  // 2. RBAC: owner/admin only
  if (ctx.role !== "owner" && ctx.role !== "admin") {
    return {
      success: false,
      error: "Non hai i permessi per visualizzare il target emissioni",
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
  const parsed = targetProgressSchema.safeParse({
    scope,
    scopeId,
    startDate,
    endDate,
  });
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0].message,
      code: ErrorCode.VALIDATION,
    };
  }

  const dateRange = {
    startDate: new Date(parsed.data.startDate),
    endDate: new Date(parsed.data.endDate),
  };

  try {
    const prisma = getPrismaForTenant(tenantId);
    const result = await getTargetProgressForDashboard(
      prisma,
      parsed.data.scope as TargetScope,
      parsed.data.scopeId ?? undefined,
      dateRange
    );

    if (!result) {
      return { success: true, data: null };
    }

    return {
      success: true,
      data: {
        target: {
          ...result.target,
          startDate: result.target.startDate.toISOString(),
          endDate: result.target.endDate.toISOString(),
        },
        progress: result.progress,
      },
    };
  } catch (error) {
    logger.error(
      { error, userId: ctx.userId, tenantId, scope, scopeId },
      "Failed to load target progress"
    );
    return {
      success: false,
      error: "Errore nel caricamento del target emissioni",
      code: ErrorCode.INTERNAL,
    };
  }
}
