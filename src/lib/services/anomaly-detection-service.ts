import type { PrismaClientWithTenant } from "@/lib/db/client";

// ---------------------------------------------------------------------------
// Anomaly types
// ---------------------------------------------------------------------------

export type AnomalySeverity = "warning" | "critical";

export type AnomalyType =
  | "consumption_too_high"
  | "consumption_too_low"
  | "suspicious_quantity"
  | "negative_km";

export type FuelAnomaly = {
  fuelRecordId: number;
  type: AnomalyType;
  message: string;
  severity: AnomalySeverity;
  calculatedConsumption?: number;
  expectedConsumption?: number;
};

// ---------------------------------------------------------------------------
// Thresholds
// ---------------------------------------------------------------------------

const HIGH_CONSUMPTION_MULTIPLIER = 2.0;
const LOW_CONSUMPTION_MULTIPLIER = 0.3;
const SUSPICIOUS_QUANTITY_LITERS = 200;

// ---------------------------------------------------------------------------
// Single record anomaly check
// ---------------------------------------------------------------------------

type FuelRecordForAnomaly = {
  id: number;
  odometerKm: number;
  quantityLiters: number;
  date: Date;
};

/**
 * Check a single fuel record for anomalies, given the previous record
 * and an optional reference consumption from the vehicle catalog (L/100km).
 */
export function checkFuelRecordAnomaly(
  record: FuelRecordForAnomaly,
  previousRecord: FuelRecordForAnomaly | null,
  vehicleConsumptionRef: number | null
): FuelAnomaly[] {
  const anomalies: FuelAnomaly[] = [];

  // Check suspicious quantity
  if (record.quantityLiters > SUSPICIOUS_QUANTITY_LITERS) {
    anomalies.push({
      fuelRecordId: record.id,
      type: "suspicious_quantity",
      message: `Quantita sospetta: ${new Intl.NumberFormat("it-IT", { minimumFractionDigits: 2 }).format(record.quantityLiters)} L supera il limite di ${SUSPICIOUS_QUANTITY_LITERS} L`,
      severity: "warning",
    });
  }

  // Check negative km (regression compared to previous)
  if (previousRecord && record.odometerKm < previousRecord.odometerKm) {
    anomalies.push({
      fuelRecordId: record.id,
      type: "negative_km",
      message: `Chilometraggio negativo: ${new Intl.NumberFormat("it-IT").format(record.odometerKm)} km e inferiore al precedente ${new Intl.NumberFormat("it-IT").format(previousRecord.odometerKm)} km`,
      severity: "critical",
    });
  }

  // Check consumption vs catalog reference
  if (previousRecord && vehicleConsumptionRef && vehicleConsumptionRef > 0) {
    const deltaKm = record.odometerKm - previousRecord.odometerKm;

    if (deltaKm > 0) {
      const calculatedConsumption =
        (record.quantityLiters / deltaKm) * 100; // L/100km

      if (calculatedConsumption > vehicleConsumptionRef * HIGH_CONSUMPTION_MULTIPLIER) {
        anomalies.push({
          fuelRecordId: record.id,
          type: "consumption_too_high",
          message: `Consumo troppo alto: ${new Intl.NumberFormat("it-IT", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(calculatedConsumption)} L/100km (atteso ~${new Intl.NumberFormat("it-IT", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(vehicleConsumptionRef)} L/100km)`,
          severity: "warning",
          calculatedConsumption,
          expectedConsumption: vehicleConsumptionRef,
        });
      }

      if (calculatedConsumption < vehicleConsumptionRef * LOW_CONSUMPTION_MULTIPLIER) {
        anomalies.push({
          fuelRecordId: record.id,
          type: "consumption_too_low",
          message: `Consumo troppo basso: ${new Intl.NumberFormat("it-IT", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(calculatedConsumption)} L/100km (atteso ~${new Intl.NumberFormat("it-IT", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(vehicleConsumptionRef)} L/100km)`,
          severity: "warning",
          calculatedConsumption,
          expectedConsumption: vehicleConsumptionRef,
        });
      }
    }
  }

  return anomalies;
}

// ---------------------------------------------------------------------------
// Detect anomalies for all fuel records of a vehicle
// ---------------------------------------------------------------------------

/**
 * Iterates through all fuel records for a vehicle and detects anomalies.
 * Returns an array of FuelAnomaly items.
 */
export async function detectFuelAnomalies(
  prisma: PrismaClientWithTenant,
  vehicleId: number,
  tenantId: string
): Promise<FuelAnomaly[]> {
  // Fetch all fuel records for the vehicle, ordered by date ASC
  const records = await prisma.fuelRecord.findMany({
    where: { vehicleId },
    orderBy: [{ date: "asc" }, { odometerKm: "asc" }],
    select: {
      id: true,
      odometerKm: true,
      quantityLiters: true,
      date: true,
    },
  });

  if (records.length === 0) {
    return [];
  }

  // Fetch the catalog consumption reference for the vehicle
  const vehicle = await prisma.tenantVehicle.findFirst({
    where: { id: vehicleId },
    include: {
      catalogVehicle: {
        include: {
          engines: {
            select: { consumptionL100Km: true },
            take: 1,
          },
        },
      },
    },
  });

  // Suppress unused variable warning -- tenantId used for context in future
  void tenantId;

  const consumptionRef =
    vehicle?.catalogVehicle?.engines?.[0]?.consumptionL100Km ?? null;

  const allAnomalies: FuelAnomaly[] = [];

  for (let i = 0; i < records.length; i++) {
    const current = records[i];
    const previous = i > 0 ? records[i - 1] : null;

    const anomalies = checkFuelRecordAnomaly(
      current,
      previous,
      consumptionRef
    );
    allAnomalies.push(...anomalies);
  }

  return allAnomalies;
}
