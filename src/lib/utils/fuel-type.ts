// ---------------------------------------------------------------------------
// Fuel Type Utilities — Hybrid-aware vehicle fuel type resolution
// ---------------------------------------------------------------------------
// Centralizes the logic for determining a vehicle's effective fuel type,
// handling dual-engine hybrids imported from InfocarData where separate
// Engine records (BENZINA + ELETTRICO) exist instead of a single
// IBRIDO_BENZINA entry.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type EngineInfo = { fuelType: string };
type FuelRecordInfo = { fuelType: string };
type CatalogVehicleInfo = {
  isHybrid: boolean;
  engines: EngineInfo[];
};

// ---------------------------------------------------------------------------
// getEffectiveFuelType
// ---------------------------------------------------------------------------

/**
 * Determines the effective FuelType for a vehicle, correctly handling hybrids.
 *
 * Priority:
 * 1. If `isHybrid=true` and engines contain a thermal + ELETTRICO pair,
 *    return the composite hybrid type (IBRIDO_BENZINA / IBRIDO_DIESEL).
 * 2. If fuel records exist, use the most common fuelType from records.
 * 3. Fall back to the first engine's fuelType.
 * 4. Return null if no information is available.
 */
export function getEffectiveFuelType(
  catalogVehicle: CatalogVehicleInfo,
  fuelRecords?: FuelRecordInfo[]
): string | null {
  // 1. Hybrid detection from isHybrid flag + engine composition
  if (catalogVehicle.isHybrid && catalogVehicle.engines.length >= 2) {
    const engineFuelTypes = new Set(
      catalogVehicle.engines.map((e) => e.fuelType)
    );

    if (engineFuelTypes.has("ELETTRICO")) {
      if (engineFuelTypes.has("BENZINA"))
        return "IBRIDO_BENZINA";
      if (engineFuelTypes.has("DIESEL")) return "IBRIDO_DIESEL";
    }
  }

  // 2. Most common fuel type from fuel records
  if (fuelRecords && fuelRecords.length > 0) {
    const counts = new Map<string, number>();
    for (const record of fuelRecords) {
      counts.set(record.fuelType, (counts.get(record.fuelType) ?? 0) + 1);
    }
    let maxType = fuelRecords[0].fuelType;
    let maxCount = 0;
    for (const [type, count] of counts) {
      if (count > maxCount) {
        maxCount = count;
        maxType = type;
      }
    }
    return maxType;
  }

  // 3. First engine fallback
  if (catalogVehicle.engines.length > 0) {
    return catalogVehicle.engines[0].fuelType;
  }

  return null;
}

// ---------------------------------------------------------------------------
// getCombinedCo2GKm
// ---------------------------------------------------------------------------

/**
 * Returns the effective co2GKm for a vehicle.
 *
 * For hybrids, the WLTP co2GKm on the primary (non-electric) engine
 * represents the combined cycle value. The electric engine has co2GKm = 0.
 * For regular vehicles, returns the first engine's co2GKm.
 */
export function getCombinedCo2GKm(
  engines: Array<{ fuelType: string; co2GKm: number | null }>,
  isHybrid: boolean
): number {
  if (engines.length === 0) return 0;

  if (isHybrid) {
    // Return co2GKm from the non-electric engine (the WLTP combined value)
    const thermalEngine = engines.find(
      (e) => e.fuelType !== "ELETTRICO"
    );
    return thermalEngine?.co2GKm ?? engines[0].co2GKm ?? 0;
  }

  return engines[0].co2GKm ?? 0;
}
