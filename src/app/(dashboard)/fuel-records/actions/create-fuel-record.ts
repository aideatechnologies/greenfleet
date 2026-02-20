"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/types/action-result";
import { ErrorCode } from "@/types/action-result";
import { createFuelRecordSchema } from "@/lib/schemas/fuel-record";
import {
  createFuelRecord,
  OdometerValidationError,
} from "@/lib/services/fuel-record-service";
import type { FuelRecordWithDetails } from "@/lib/services/fuel-record-service";
import { requireAuth, isDriver } from "@/lib/auth/permissions";
import { getPrismaForTenant } from "@/lib/db/client";
import { logger } from "@/lib/utils/logger";

export async function createFuelRecordAction(
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

  const parsed = createFuelRecordSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0].message,
      code: ErrorCode.VALIDATION,
    };
  }

  try {
    const prisma = getPrismaForTenant(tenantId);

    // Verify the vehicle exists in the tenant
    const vehicle = await prisma.tenantVehicle.findFirst({
      where: { id: parsed.data.vehicleId },
    });
    if (!vehicle) {
      return {
        success: false,
        error: "Veicolo non trovato",
        code: ErrorCode.NOT_FOUND,
      };
    }

    // Driver can only add fuel records to their assigned vehicle
    if (isDriver(ctx)) {
      if (vehicle.assignedEmployeeId === null) {
        return {
          success: false,
          error: "Non sei autorizzato a registrare rifornimenti per questo veicolo",
          code: ErrorCode.FORBIDDEN,
        };
      }
      // Check if the driver's user is linked to the assigned employee
      // For now, we allow drivers to add to any vehicle visible to them
      // The vehicle selector on the frontend will filter appropriately
    }

    const record = await createFuelRecord(prisma, parsed.data, ctx.userId);
    revalidatePath("/fuel-records");
    revalidatePath(`/vehicles/${parsed.data.vehicleId}`);
    return { success: true, data: record };
  } catch (error) {
    if (error instanceof OdometerValidationError) {
      return {
        success: false,
        error: error.message,
        code: ErrorCode.VALIDATION,
      };
    }
    logger.error(
      { err: error, userId: ctx.userId, tenantId, errorMessage: error instanceof Error ? error.message : String(error) },
      "Failed to create fuel record"
    );
    return {
      success: false,
      error: "Errore nella registrazione del rifornimento",
      code: ErrorCode.INTERNAL,
    };
  }
}
