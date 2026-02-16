"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/types/action-result";
import { ErrorCode } from "@/types/action-result";
import { updateFuelRecordSchema } from "@/lib/schemas/fuel-record";
import {
  updateFuelRecord,
  OdometerValidationError,
  RecordNotFoundError,
} from "@/lib/services/fuel-record-service";
import type { FuelRecordWithDetails } from "@/lib/services/fuel-record-service";
import { requireAuth, isTenantAdmin } from "@/lib/auth/permissions";
import { getPrismaForTenant } from "@/lib/db/client";
import { logger } from "@/lib/utils/logger";

export async function updateFuelRecordAction(
  recordId: number,
  input: unknown
): Promise<ActionResult<FuelRecordWithDetails>> {
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

  // Only Fleet Manager (admin) or owner can update fuel records
  const canManage = await isTenantAdmin(ctx, tenantId);
  if (!canManage) {
    return {
      success: false,
      error: "Permessi insufficienti per modificare i rifornimenti",
      code: ErrorCode.FORBIDDEN,
    };
  }

  const parsed = updateFuelRecordSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0].message,
      code: ErrorCode.VALIDATION,
    };
  }

  try {
    const prisma = getPrismaForTenant(tenantId);
    const record = await updateFuelRecord(prisma, recordId, parsed.data, ctx.userId);
    revalidatePath("/fuel-records");
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
      "Failed to update fuel record"
    );
    return {
      success: false,
      error: "Errore nell'aggiornamento del rifornimento",
      code: ErrorCode.INTERNAL,
    };
  }
}
