"use server";

import type { ActionResult } from "@/types/action-result";
import { ErrorCode } from "@/types/action-result";
import { requireAuth } from "@/lib/auth/permissions";
import { getPrismaForTenant } from "@/lib/db/client";
import { getFuelTypeLabels } from "@/lib/utils/fuel-type-label";

export type FuelTypeOption = {
  value: string;
  label: string;
};

/**
 * Get distinct fuel types from engines of the tenant's fleet vehicles,
 * enriched with labels from FuelTypeMacroMapping.
 */
export async function getFuelTypeOptionsAction(): Promise<
  ActionResult<FuelTypeOption[]>
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

    // Get distinct fuel types from engines of the tenant's vehicles
    const vehicles = await prisma.tenantVehicle.findMany({
      where: { status: "ACTIVE" },
      select: {
        catalogVehicle: {
          select: {
            isHybrid: true,
            engines: {
              select: { fuelType: true },
            },
          },
        },
      },
    });

    const fuelTypes = new Set<string>();
    for (const v of vehicles) {
      // For hybrids, add the composite type
      if (v.catalogVehicle.isHybrid && v.catalogVehicle.engines.length >= 2) {
        const engineTypes = new Set(v.catalogVehicle.engines.map((e) => e.fuelType));
        if (engineTypes.has("ELETTRICO") && engineTypes.has("BENZINA")) {
          fuelTypes.add("IBRIDO_BENZINA");
        }
        if (engineTypes.has("ELETTRICO") && engineTypes.has("DIESEL")) {
          fuelTypes.add("IBRIDO_DIESEL");
        }
      }
      for (const engine of v.catalogVehicle.engines) {
        fuelTypes.add(engine.fuelType);
      }
    }

    // Enrich with labels
    const labelsMap = await getFuelTypeLabels();

    const options: FuelTypeOption[] = Array.from(fuelTypes)
      .sort()
      .map((ft) => ({
        value: ft,
        label: labelsMap.get(ft) ?? ft,
      }));

    return { success: true, data: options };
  } catch {
    return {
      success: false,
      error: "Errore nel caricamento dei tipi carburante",
      code: ErrorCode.INTERNAL,
    };
  }
}
