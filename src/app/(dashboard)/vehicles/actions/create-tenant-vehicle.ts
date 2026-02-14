"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/types/action-result";
import { ErrorCode } from "@/types/action-result";
import { createTenantVehicleSchema } from "@/lib/schemas/tenant-vehicle";
import { createTenantVehicle } from "@/lib/services/tenant-vehicle-service";
import type { TenantVehicleWithDetails } from "@/lib/services/tenant-vehicle-service";
import { requireAuth, isTenantAdmin } from "@/lib/auth/permissions";
import { getPrismaForTenant, prisma as basePrisma } from "@/lib/db/client";
import { UNCATALOGED_VEHICLE_ID } from "@/lib/utils/constants";
import { logger } from "@/lib/utils/logger";

export async function createTenantVehicleAction(
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

  const parsed = createTenantVehicleSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0].message,
      code: ErrorCode.VALIDATION,
    };
  }

  // Verifica che il veicolo catalogo esista (skip per sentinel)
  if (parsed.data.catalogVehicleId !== UNCATALOGED_VEHICLE_ID) {
    const catalogVehicle = await basePrisma.catalogVehicle.findUnique({
      where: { id: parsed.data.catalogVehicleId },
    });
    if (!catalogVehicle) {
      return {
        success: false,
        error: "Veicolo da catalogo non trovato",
        code: ErrorCode.NOT_FOUND,
      };
    }
  }

  try {
    const prisma = getPrismaForTenant(tenantId);
    const vehicle = await createTenantVehicle(prisma, parsed.data);
    revalidatePath("/vehicles");
    return { success: true, data: vehicle };
  } catch (error) {
    // Controlla violazione vincolo di unicita (targa duplicata nel tenant)
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
      { error, userId: ctx.userId, tenantId },
      "Failed to create tenant vehicle"
    );
    return {
      success: false,
      error: "Errore nella creazione del veicolo",
      code: ErrorCode.INTERNAL,
    };
  }
}
