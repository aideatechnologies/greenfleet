// ---------------------------------------------------------------------------
// Emission Data Loader — Database layer for emission calculations
// ---------------------------------------------------------------------------
// Separates data access from pure calculation logic (emission-calculator.ts).
// Uses tenant-scoped Prisma client for all queries.
//
// V2: Resolves multi-gas, multi-scope emission contexts via
//     emission-resolution-service instead of a single scalar factor.
// ---------------------------------------------------------------------------

import type { PrismaClient } from "@/generated/prisma/client";
import type {
  VehicleEmissionInputV2,
  ScopedEmissionInput,
} from "@/lib/services/emission-calculator";
import { resolveEmissionContexts } from "@/lib/services/emission-resolution-service";
import { getEffectiveFuelType, getCombinedCo2GKm } from "@/lib/utils/fuel-type";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type VehicleEmissionData =
  | {
      status: "ok";
      input: VehicleEmissionInputV2;
      fuelType: string;
    }
  | {
      status: "insufficient_data";
      reason: string;
    };

// ---------------------------------------------------------------------------
// getVehicleEmissionData
// ---------------------------------------------------------------------------

/**
 * Loads all data needed to calculate emissions for a vehicle in a given period.
 *
 * Retrieves:
 * - co2GKm from Engine (primary fuel type engine matching refuelled fuel type)
 * - kmTravelled from KmReading + FuelRecord odometer differences (first and last)
 * - Scoped emission inputs via resolveEmissionContexts (multi-gas, multi-scope)
 *   - Scope 1 (thermal): quantity = fuelLitres (sum of quantityLiters)
 *   - Scope 2 (electric): quantity = fuelKwh (sum of quantityKwh)
 *
 * Edge cases:
 * - No fuel records in period: real emissions = 0 (empty scopes)
 * - No km readings in period: returns "insufficient_data"
 * - No fuel type mapping: returns empty scopes (real emissions = 0)
 *
 * @param prisma - Prisma client (tenant-scoped or global depending on context)
 * @param vehicleId - TenantVehicle ID
 * @param periodStart - Start of calculation period (inclusive)
 * @param periodEnd - End of calculation period (inclusive)
 */
export async function getVehicleEmissionData(
  prisma: PrismaClient,
  vehicleId: number,
  periodStart: Date,
  periodEnd: Date
): Promise<VehicleEmissionData> {
  // 1. Get the vehicle with its catalog vehicle and engines
  const vehicle = await prisma.tenantVehicle.findUnique({
    where: { id: vehicleId },
    include: {
      catalogVehicle: {
        include: {
          engines: true,
        },
      },
    },
  });

  if (!vehicle) {
    return {
      status: "insufficient_data",
      reason: "Veicolo non trovato",
    };
  }

  // 2. Get fuel records in the period
  const fuelRecords = await prisma.fuelRecord.findMany({
    where: {
      vehicleId,
      date: { gte: periodStart, lte: periodEnd },
    },
    orderBy: { date: "asc" },
  });

  // 3. Get km readings in the period (from both KmReading and FuelRecord odometers)
  const kmReadings = await prisma.kmReading.findMany({
    where: {
      vehicleId,
      date: { gte: periodStart, lte: periodEnd },
    },
    orderBy: { date: "asc" },
    select: { odometerKm: true, date: true },
  });

  // Merge all odometer readings from fuel records and km readings
  const allOdometerReadings = [
    ...fuelRecords.map((fr) => ({
      odometerKm: fr.odometerKm,
      date: fr.date,
    })),
    ...kmReadings.map((kr) => ({
      odometerKm: kr.odometerKm,
      date: kr.date,
    })),
  ].sort((a, b) => a.date.getTime() - b.date.getTime());

  // Need at least 2 readings to calculate km travelled
  if (allOdometerReadings.length < 2) {
    return {
      status: "insufficient_data",
      reason:
        "Dati chilometrici insufficienti: servono almeno due rilevazioni nel periodo",
    };
  }

  const firstReading = allOdometerReadings[0];
  const lastReading = allOdometerReadings[allOdometerReadings.length - 1];
  const kmTravelled = lastReading.odometerKm - firstReading.odometerKm;

  // 4. Sum fuel litres and kWh
  const fuelLitres = fuelRecords.reduce(
    (sum, fr) => sum + fr.quantityLiters,
    0
  );
  const fuelKwh = fuelRecords.reduce(
    (sum, fr) => sum + (fr.quantityKwh ?? 0),
    0
  );

  // 5. Determine the primary fuel type (hybrid-aware)
  const fuelType = getEffectiveFuelType(vehicle.catalogVehicle, fuelRecords);

  if (!fuelType) {
    return {
      status: "insufficient_data",
      reason: "Tipo carburante non determinabile: nessun rifornimento e nessun motore associato",
    };
  }

  // 6. Get co2GKm (hybrid-aware: uses non-electric engine for hybrids)
  const co2GKm = getCombinedCo2GKm(
    vehicle.catalogVehicle.engines,
    vehicle.catalogVehicle.isHybrid
  );

  // 7. Resolve multi-gas, multi-scope emission contexts
  // Use the median date of the period as reference date
  const medianDate = new Date(
    (periodStart.getTime() + periodEnd.getTime()) / 2
  );

  const contexts = await resolveEmissionContexts(prisma, fuelType, medianDate);

  // Build scoped emission inputs from resolved contexts
  // Scope 1 (thermal) uses fuelLitres, Scope 2 (electric) uses fuelKwh
  const scopes: ScopedEmissionInput[] = contexts.map((ctx) => ({
    quantity: ctx.macroFuelType.scope === 1 ? fuelLitres : fuelKwh,
    gasFactors: ctx.gasFactors,
    gwpValues: ctx.gwpValues,
  }));

  return {
    status: "ok",
    input: {
      co2GKm,
      kmTravelled,
      scopes,
    },
    fuelType,
  };
}

