"use server";

import type { ActionResult } from "@/types/action-result";
import { ErrorCode } from "@/types/action-result";
import { requireAuth, isDriver } from "@/lib/auth/permissions";
import { getPrismaForTenant } from "@/lib/db/client";
import type { VehicleOptionItem } from "@/components/forms/VehicleSelector";

function mapVehicles(vehicles: Array<{
  id: number;
  licensePlate: string;
  catalogVehicle: {
    marca: string;
    modello: string;
    allestimento: string | null;
  };
}>): VehicleOptionItem[] {
  return vehicles.map((v) => ({
    id: String(v.id),
    licensePlate: v.licensePlate,
    catalogVehicle: {
      marca: v.catalogVehicle.marca,
      modello: v.catalogVehicle.modello,
      allestimento: v.catalogVehicle.allestimento,
    },
  }));
}

/**
 * Get tenant vehicles for the fuel record form.
 * If the user is a Driver, returns only the vehicle assigned to them.
 */
export async function getTenantVehiclesForFuelAction(): Promise<
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

    // If user is a Driver, we need to find their assigned vehicle
    if (isDriver(ctx)) {
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
        data: mapVehicles(vehicles as unknown as Parameters<typeof mapVehicles>[0]),
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
      data: mapVehicles(vehicles as unknown as Parameters<typeof mapVehicles>[0]),
    };
  } catch {
    return {
      success: false,
      error: "Errore nel caricamento dei veicoli",
      code: ErrorCode.INTERNAL,
    };
  }
}
