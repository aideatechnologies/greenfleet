"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/types/action-result";
import { ErrorCode } from "@/types/action-result";
import { updateTenantVehicleSchema } from "@/lib/schemas/tenant-vehicle";
import {
  updateTenantVehicle,
  getTenantVehicleById,
} from "@/lib/services/tenant-vehicle-service";
import type { TenantVehicleWithDetails } from "@/lib/services/tenant-vehicle-service";
import { requireAuth, isTenantAdmin } from "@/lib/auth/permissions";
import { getPrismaForTenant } from "@/lib/db/client";
import { logger } from "@/lib/utils/logger";

export async function updateTenantVehicleAction(
  input: unknown
): Promise<ActionResult<TenantVehicleWithDetails>> {
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

  const canManage = await isTenantAdmin(ctx, tenantId);
  if (!canManage) {
    return {
      success: false,
      error: "Permessi insufficienti per gestire i veicoli",
      code: ErrorCode.FORBIDDEN,
    };
  }

  const parsed = updateTenantVehicleSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0].message,
      code: ErrorCode.VALIDATION,
    };
  }

  const { id, ...data } = parsed.data;

  try {
    const prisma = getPrismaForTenant(tenantId);

    // Verifica che il veicolo esista nel tenant
    const existing = await getTenantVehicleById(prisma, id);
    if (!existing) {
      return {
        success: false,
        error: "Veicolo non trovato",
        code: ErrorCode.NOT_FOUND,
      };
    }

    const vehicle = await updateTenantVehicle(prisma, id, data);
    revalidatePath("/vehicles");
    revalidatePath(`/vehicles/${id}`);
    return { success: true, data: vehicle };
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("Unique constraint")
    ) {
      return {
        success: false,
        error: "Esiste gia un veicolo con questa targa nella tua organizzazione",
        code: ErrorCode.CONFLICT,
      };
    }
    logger.error(
      { error, userId: ctx.userId, tenantId, vehicleId: id },
      "Failed to update tenant vehicle"
    );
    return {
      success: false,
      error: "Errore nell'aggiornamento del veicolo",
      code: ErrorCode.INTERNAL,
    };
  }
}
