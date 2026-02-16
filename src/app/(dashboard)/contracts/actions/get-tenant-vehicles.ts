"use server";

import type { ActionResult } from "@/types/action-result";
import { ErrorCode } from "@/types/action-result";
import { requireAuth } from "@/lib/auth/permissions";
import { getPrismaForTenant } from "@/lib/db/client";
import type { VehicleOptionItem } from "@/components/forms/VehicleSelector";

export async function getTenantVehiclesAction(): Promise<
  ActionResult<VehicleOptionItem[]>
> {
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

  try {
    const prisma = getPrismaForTenant(tenantId);
    const vehicles = await prisma.tenantVehicle.findMany({
      where: { status: "ACTIVE" },
      include: { catalogVehicle: true },
      orderBy: { licensePlate: "asc" },
    });

    return {
      success: true,
      data: vehicles.map((v) => ({
        id: String(v.id),
        licensePlate: v.licensePlate,
        catalogVehicle: {
          marca: v.catalogVehicle.marca,
          modello: v.catalogVehicle.modello,
          allestimento: v.catalogVehicle.allestimento,
        },
      })),
    };
  } catch {
    return {
      success: false,
      error: "Errore nel caricamento dei veicoli",
      code: ErrorCode.INTERNAL,
    };
  }
}
