"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/types/action-result";
import { ErrorCode } from "@/types/action-result";
import { updateKmReadingSchema } from "@/lib/schemas/km-reading";
import {
  updateKmReading,
  OdometerValidationError,
  RecordNotFoundError,
} from "@/lib/services/km-reading-service";
import type { KmReadingWithDetails } from "@/lib/services/km-reading-service";
import { requireAuth, isTenantAdmin } from "@/lib/auth/permissions";
import { getPrismaForTenant } from "@/lib/db/client";
import { logger } from "@/lib/utils/logger";

export async function updateKmReadingAction(
  recordId: number,
  input: unknown
): Promise<ActionResult<KmReadingWithDetails>> {
  const authResult = await requireAuth();
  if (!authResult.success) return authResult;
  const { ctx } = authResult;

  const tenantId = ctx.organizationId;
  if (!tenantId) {
    return {
      success: false,
      error: "Nessun tenant attivo nella sessione",
      code: ErrorCode.FORBIDDEN,
    };
  }

  // Only Fleet Manager (admin) or owner can update km readings
  const canManage = await isTenantAdmin(ctx, tenantId);
  if (!canManage) {
    return {
      success: false,
      error: "Permessi insufficienti per modificare le rilevazioni km",
      code: ErrorCode.FORBIDDEN,
    };
  }

  const parsed = updateKmReadingSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0].message,
      code: ErrorCode.VALIDATION,
    };
  }

  try {
    const prisma = getPrismaForTenant(tenantId);
    const record = await updateKmReading(prisma, recordId, parsed.data, ctx.userId);
    revalidatePath("/km-readings");
    return { success: true, data: record };
  } catch (error) {
    if (error instanceof RecordNotFoundError) {
      return {
        success: false,
        error: error.message,
        code: ErrorCode.NOT_FOUND,
      };
    }
    if (error instanceof OdometerValidationError) {
      return {
        success: false,
        error: error.message,
        code: ErrorCode.VALIDATION,
      };
    }
    logger.error(
      { error, userId: ctx.userId, tenantId, recordId },
      "Failed to update km reading"
    );
    return {
      success: false,
      error: "Errore nell'aggiornamento della rilevazione km",
      code: ErrorCode.INTERNAL,
    };
  }
}
