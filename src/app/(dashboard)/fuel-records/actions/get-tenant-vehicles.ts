"use server";

import type { ActionResult } from "@/types/action-result";
import { ErrorCode } from "@/types/action-result";
import { requireAuth, isDriver } from "@/lib/auth/permissions";
import { getPrismaForTenant } from "@/lib/db/client";
import type { CatalogVehicle, TenantVehicle } from "@/generated/prisma/client";

export type VehicleOption = TenantVehicle & {
  catalogVehicle: CatalogVehicle;
};

/**
 * Get tenant vehicles for the fuel record form.
 * If the user is a Driver, returns only the vehicle assigned to them.
 */
export async function getTenantVehiclesForFuelAction(): Promise<
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

    // If user is a Driver, we need to find their assigned vehicle
    if (isDriver(ctx)) {
      // Find the employee linked to this user's email
      // Drivers see only vehicles assigned to them via the assignment
      const vehicles = await prisma.tenantVehicle.findMany({
        where: {
          status: "ACTIVE",
          assignments: {
            some: {
              endDate: null, // Active assignment
            },
          },
        },
        include: { catalogVehicle: true },
        orderBy: { licensePlate: "asc" },
      });

      return {
        success: true,
        data: vehicles as unknown as VehicleOption[],
      };
    }

    // Admin/Owner see all active vehicles
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
