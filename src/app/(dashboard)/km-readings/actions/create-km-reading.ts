"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/types/action-result";
import { ErrorCode } from "@/types/action-result";
import { createKmReadingSchema } from "@/lib/schemas/km-reading";
import {
  createKmReading,
  OdometerValidationError,
} from "@/lib/services/km-reading-service";
import type { KmReadingWithDetails } from "@/lib/services/km-reading-service";
import { requireAuth, isDriver } from "@/lib/auth/permissions";
import { getPrismaForTenant } from "@/lib/db/client";
import { logger } from "@/lib/utils/logger";

export async function createKmReadingAction(
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

  const parsed = createKmReadingSchema.safeParse(input);
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

    // Driver can only add km readings to their assigned vehicle
    if (isDriver(ctx)) {
      if (vehicle.assignedEmployeeId === null) {
        return {
          success: false,
          error: "Non sei autorizzato a registrare rilevazioni per questo veicolo",
          code: ErrorCode.FORBIDDEN,
        };
      }
    }

    const record = await createKmReading(prisma, parsed.data, ctx.userId);
    revalidatePath("/km-readings");
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
      { error, userId: ctx.userId, tenantId },
      "Failed to create km reading"
    );
    return {
      success: false,
      error: "Errore nella registrazione della rilevazione km",
      code: ErrorCode.INTERNAL,
    };
  }
}
