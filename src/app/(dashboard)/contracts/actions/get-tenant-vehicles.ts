"use server";

import type { ActionResult } from "@/types/action-result";
import { ErrorCode } from "@/types/action-result";
import { requireAuth } from "@/lib/auth/permissions";
import { getPrismaForTenant } from "@/lib/db/client";
import type { CatalogVehicle, TenantVehicle } from "@/generated/prisma/client";

export type VehicleOption = TenantVehicle & {
  catalogVehicle: CatalogVehicle;
};

export async function getTenantVehiclesAction(): Promise<
  ActionResult<VehicleOption[]>
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
      data: vehicles as unknown as VehicleOption[],
    };
  } catch {
    return {
      success: false,
      error: "Errore nel caricamento dei veicoli",
      code: ErrorCode.INTERNAL,
    };
  }
}
