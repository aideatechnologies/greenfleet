// ---------------------------------------------------------------------------
// Target Data Loader — Loads real emissions for target progress calculation
// ---------------------------------------------------------------------------
// Uses tenant-scoped Prisma client for all queries.
// ---------------------------------------------------------------------------

import type { PrismaClientWithTenant } from "@/lib/db/client";
import type { PrismaClient } from "@/generated/prisma/client";
import type { EmissionTarget } from "@/generated/prisma/client";
import { getEffectiveEmissionFactor } from "@/lib/services/emission-factor-service";
import { calculateRealEmissions, round2 } from "@/lib/services/emission-calculator";
import { logger } from "@/lib/utils/logger";

// ---------------------------------------------------------------------------
// getTargetCurrentEmissions
// ---------------------------------------------------------------------------

/**
 * Calculates the total real emissions (kgCO2e) for a given target.
 *
 * - If scope = Fleet: sums all tenant vehicle fuel records in the date range,
 *   multiplied by the effective emission factor for each fuel type.
 * - If scope = Carlist: sums only vehicles belonging to the specified carlist.
 *
 * @param prisma - Prisma client (base or tenant-scoped)
 * @param target - The EmissionTarget record
 * @returns Total kgCO2e as number
 */
export async function getTargetCurrentEmissions(
  prisma: PrismaClientWithTenant,
  target: EmissionTarget
): Promise<number> {
  try {
    // Build the query filter for fuel records in the target date range
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, any> = {
      date: {
        gte: target.startDate,
        lte: target.endDate,
      },
    };

    // If scope = Carlist, restrict to vehicles in the carlist
    if (target.scope === "Carlist" && target.carlistId) {
      const carlistVehicles = await prisma.carlistVehicle.findMany({
        where: { carlistId: target.carlistId },
        select: { catalogVehicleId: true },
      });

      const catalogVehicleIds = carlistVehicles.map((cv) => cv.catalogVehicleId);

      if (catalogVehicleIds.length === 0) {
        return 0;
      }

      // Resolve TenantVehicle IDs from catalog vehicle IDs
      const tenantVehicles = await prisma.tenantVehicle.findMany({
        where: { catalogVehicleId: { in: catalogVehicleIds } },
        select: { id: true },
      });

      if (tenantVehicles.length === 0) {
        return 0;
      }

      where.vehicleId = { in: tenantVehicles.map((v) => v.id) };
    }

    // Fetch all fuel records matching the criteria
    const fuelRecords = await prisma.fuelRecord.findMany({
      where,
      select: {
        quantityLiters: true,
        fuelType: true,
        date: true,
      },
    });

    if (fuelRecords.length === 0) {
      return 0;
    }

    // Group by fuel type for emission factor lookup
    const fuelByType = new Map<string, number>();
    for (const record of fuelRecords) {
      const current = fuelByType.get(record.fuelType) ?? 0;
      fuelByType.set(record.fuelType, current + record.quantityLiters);
    }

    // Calculate emissions per fuel type using median date for emission factor
    const medianDate = new Date(
      (target.startDate.getTime() + target.endDate.getTime()) / 2
    );

    let totalKgCO2e = 0;

    for (const [fuelType, totalLitres] of fuelByType) {
      try {
        // EmissionFactor is a global model — cast is safe
        const factor = await getEffectiveEmissionFactor(
          prisma as unknown as PrismaClient,
          fuelType,
          medianDate
        );
        totalKgCO2e += calculateRealEmissions(totalLitres, factor.value ?? 0);
      } catch {
        // No emission factor for this fuel type: log and skip
        logger.warn(
          { fuelType, targetId: target.id },
          "No emission factor found for fuel type in target period"
        );
      }
    }

    return round2(totalKgCO2e);
  } catch (error) {
    logger.error(
      { error, targetId: target.id },
      "Failed to calculate target current emissions"
    );
    return 0;
  }
}
