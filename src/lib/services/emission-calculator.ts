// ---------------------------------------------------------------------------
// Emission Calculator — Pure calculation functions (NO database dependencies)
// ---------------------------------------------------------------------------
// This module is the core business logic for Greenfleet emission calculations.
// All functions are pure: no side effects, no database/framework imports.
// Deterministic: same input = same output, always (NFR21).
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Types (co-located)
// ---------------------------------------------------------------------------

export type VehicleEmissionInput = {
  co2GKm: number; // gCO2e/km from InfocarData catalog (Engine.co2GKm)
  kmTravelled: number; // km driven in the period
  fuelLitres: number; // total litres refuelled in the period
  emissionFactorKgCO2ePerL: number; // emission factor for fuel type (kgCO2e/L)
};

export type VehicleEmissionResult = {
  theoretical: number; // kgCO2e
  real: number; // kgCO2e
  delta: {
    absolute: number; // kgCO2e (real - theoretical)
    percentage: number; // % ((real - theoretical) / theoretical * 100)
  };
};

// ---------------------------------------------------------------------------
// V2 Types — Per-gas, multi-scope emission calculation
// ---------------------------------------------------------------------------

import type { KyotoGas, GasEmissionFactors, GwpValues, PerGasResult } from "@/types/emission";
import { KYOTO_GASES } from "@/types/emission";

export type ScopedEmissionInput = {
  quantity: number;          // litres (scope 1) or kWh (scope 2)
  gasFactors: GasEmissionFactors;  // kg gas per unit from EmissionFactor
  gwpValues: GwpValues;            // GWP multipliers from GwpConfig
};

export type VehicleEmissionInputV2 = {
  co2GKm: number;
  kmTravelled: number;
  scopes: ScopedEmissionInput[];   // 1 for pure fuels, 2 for hybrids
};

export type ScopedEmissionResult = {
  totalCO2e: number;
  perGas: PerGasResult;
};

export type VehicleEmissionResultV2 = {
  theoretical: number;         // kgCO2e
  real: number;               // kgCO2e
  realPerGas: PerGasResult;   // kgCO2e per gas
  realByScope: number[];      // kgCO2e per scope [scope1, scope2]
  delta: {
    absolute: number;
    percentage: number;
  };
};

// ---------------------------------------------------------------------------
// Deterministic rounding helper
// ---------------------------------------------------------------------------

/**
 * Rounds a number to exactly 2 decimal places using deterministic arithmetic.
 * Uses Math.round (NOT toFixed) to avoid floating-point string conversion issues.
 */
export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ---------------------------------------------------------------------------
// Theoretical emissions (FR32)
// ---------------------------------------------------------------------------

/**
 * Calculates theoretical CO2 emissions based on catalog data and km driven.
 *
 * Formula: (co2GKm * kmTravelled) / 1000
 * - co2GKm: gCO2e/km WLTP value from InfocarData
 * - kmTravelled: km driven in the period
 * - Division by 1000: converts gCO2e to kgCO2e
 *
 * @returns kgCO2e rounded to 2 decimal places
 */
export function calculateTheoreticalEmissions(
  co2GKm: number,
  kmTravelled: number
): number {
  return round2((co2GKm * kmTravelled) / 1000);
}

// ---------------------------------------------------------------------------
// Real emissions (FR33)
// ---------------------------------------------------------------------------

/**
 * Calculates real CO2 emissions based on actual fuel consumption.
 *
 * Formula: fuelLitres * emissionFactorKgCO2ePerL
 * - fuelLitres: total litres refuelled in the period
 * - emissionFactorKgCO2ePerL: kgCO2e per litre for the fuel type (from EmissionFactor table)
 *
 * @returns kgCO2e rounded to 2 decimal places
 */
export function calculateRealEmissions(
  fuelLitres: number,
  emissionFactorKgCO2ePerL: number
): number {
  return round2(fuelLitres * emissionFactorKgCO2ePerL);
}

// ---------------------------------------------------------------------------
// Delta calculation (FR34)
// ---------------------------------------------------------------------------

/**
 * Calculates the delta between theoretical and real emissions.
 *
 * - absolute: real - theoretical (positive = real > theoretical, i.e. worse)
 * - percentage: ((real - theoretical) / theoretical) * 100
 *
 * Edge case: if theoretical is 0, percentage is 0 to avoid division by zero.
 *
 * @returns { absolute: kgCO2e, percentage: % } both rounded to 2 decimals
 */
export function calculateDelta(
  theoretical: number,
  real: number
): { absolute: number; percentage: number } {
  const absolute = round2(real - theoretical);
  const percentage =
    theoretical === 0 ? 0 : round2(((real - theoretical) / theoretical) * 100);

  return { absolute, percentage };
}

// ---------------------------------------------------------------------------
// Orchestrator: calculate all vehicle emissions at once
// ---------------------------------------------------------------------------

/**
 * Orchestrates the full emission calculation for a single vehicle/period.
 * Calls calculateTheoreticalEmissions, calculateRealEmissions, and calculateDelta.
 *
 * @returns VehicleEmissionResult with theoretical, real, and delta values
 */
export function calculateVehicleEmissions(
  input: VehicleEmissionInput
): VehicleEmissionResult {
  const theoretical = calculateTheoreticalEmissions(
    input.co2GKm,
    input.kmTravelled
  );
  const real = calculateRealEmissions(
    input.fuelLitres,
    input.emissionFactorKgCO2ePerL
  );
  const delta = calculateDelta(theoretical, real);

  return { theoretical, real, delta };
}

// ---------------------------------------------------------------------------
// Target progress calculation (FR37)
// ---------------------------------------------------------------------------

import type {
  TargetProgress,
  TargetStatus,
  Milestone,
  TargetPeriod,
} from "@/types/emission-target";

/**
 * Calculates the progress toward an emission target.
 *
 * - percentage: (currentEmissions / targetValue) * 100
 * - remaining: targetValue - currentEmissions
 * - Linear projection: (currentEmissions / daysElapsed) * totalDays
 * - Status:
 *   - completed: endDate < now
 *   - on-track: projection <= targetValue
 *   - at-risk: projection <= targetValue * 1.15
 *   - off-track: projection > targetValue * 1.15
 * - Milestones: Q1/Q2/Q3/Q4 for Annual targets, none for Monthly
 *
 * @param targetValue kgCO2e target
 * @param currentEmissions kgCO2e emitted so far
 * @param startDate target start date
 * @param endDate target end date
 * @param now current date (default: new Date())
 * @param period target period (default: "Annual")
 * @returns TargetProgress with status, milestones, etc.
 */
export function calculateTargetProgress(
  targetValue: number,
  currentEmissions: number,
  startDate: Date,
  endDate: Date,
  now: Date = new Date(),
  period: TargetPeriod = "Annual"
): TargetProgress {
  const percentage = targetValue === 0 ? 0 : round2((currentEmissions / targetValue) * 100);
  const remaining = round2(targetValue - currentEmissions);

  // Calculate status based on linear projection
  const totalMs = endDate.getTime() - startDate.getTime();
  const elapsedMs = now.getTime() - startDate.getTime();
  const totalDays = Math.max(totalMs / (1000 * 60 * 60 * 24), 1);
  const daysElapsed = Math.max(elapsedMs / (1000 * 60 * 60 * 24), 0.01);

  let status: TargetStatus;

  if (now >= endDate) {
    status = "completed";
  } else {
    const projection = (currentEmissions / daysElapsed) * totalDays;

    if (projection <= targetValue) {
      status = "on-track";
    } else if (projection <= targetValue * 1.15) {
      status = "at-risk";
    } else {
      status = "off-track";
    }
  }

  // Generate milestones for Annual targets
  const milestones: Milestone[] = [];

  if (period === "Annual") {
    const quarterLabels = ["Q1", "Q2", "Q3", "Q4"];
    const quarterPcts = [0.25, 0.5, 0.75, 1.0];

    for (let i = 0; i < 4; i++) {
      const milestoneDate = new Date(
        startDate.getTime() + totalMs * quarterPcts[i]
      );
      const expectedValue = round2(targetValue * quarterPcts[i]);
      const achieved = now >= milestoneDate;
      // onTrack: at the milestone date, the expected emissions should be <= expectedValue
      const onTrack = achieved
        ? currentEmissions <= expectedValue
        : percentage <= quarterPcts[i] * 100;

      milestones.push({
        label: quarterLabels[i],
        date: milestoneDate,
        expectedValue,
        achieved,
        onTrack,
      });
    }
  }

  return {
    targetValue,
    currentValue: currentEmissions,
    percentage,
    remaining,
    status,
    milestones,
  };
}

// ---------------------------------------------------------------------------
// V2: Per-gas CO2e calculation (multi-gas, multi-scope)
// ---------------------------------------------------------------------------

/**
 * Calculates CO2 equivalent for a single gas.
 * Formula: quantity × emissionFactor × GWP
 */
export function calculateGasCO2e(
  quantity: number,
  emissionFactorKgPerUnit: number,
  gwp: number
): number {
  return round2(quantity * emissionFactorKgPerUnit * gwp);
}

/**
 * Calculates total real emissions for a single scope.
 * Sums CO2e across all 7 Kyoto gases.
 */
export function calculateScopedEmissions(
  input: ScopedEmissionInput
): ScopedEmissionResult {
  const perGas: PerGasResult = {
    co2: 0, ch4: 0, n2o: 0, hfc: 0, pfc: 0, sf6: 0, nf3: 0,
  };
  let totalCO2e = 0;

  for (const gas of KYOTO_GASES) {
    const co2e = calculateGasCO2e(
      input.quantity,
      input.gasFactors[gas],
      input.gwpValues[gas]
    );
    perGas[gas] = co2e;
    totalCO2e += co2e;
  }

  return { totalCO2e: round2(totalCO2e), perGas };
}

/**
 * V2 orchestrator: calculates emissions for a vehicle with multiple scopes.
 * Pure fuels: 1 scope. Hybrids: 2 scopes (scope 1 thermal + scope 2 electric).
 * Total real = sum of all scopes.
 */
export function calculateVehicleEmissionsV2(
  input: VehicleEmissionInputV2
): VehicleEmissionResultV2 {
  const theoretical = calculateTheoreticalEmissions(
    input.co2GKm,
    input.kmTravelled
  );

  const mergedPerGas: PerGasResult = {
    co2: 0, ch4: 0, n2o: 0, hfc: 0, pfc: 0, sf6: 0, nf3: 0,
  };
  const realByScope: number[] = [];
  let totalReal = 0;

  for (const scope of input.scopes) {
    const result = calculateScopedEmissions(scope);
    realByScope.push(result.totalCO2e);
    totalReal += result.totalCO2e;
    for (const gas of KYOTO_GASES) {
      mergedPerGas[gas] = round2(mergedPerGas[gas] + result.perGas[gas]);
    }
  }

  totalReal = round2(totalReal);
  const delta = calculateDelta(theoretical, totalReal);

  return {
    theoretical,
    real: totalReal,
    realPerGas: mergedPerGas,
    realByScope,
    delta,
  };
}
