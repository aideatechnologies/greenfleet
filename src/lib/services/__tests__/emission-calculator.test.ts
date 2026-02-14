import { describe, it, expect } from "vitest";
import {
  calculateTheoreticalEmissions,
  calculateRealEmissions,
  calculateDelta,
  calculateVehicleEmissions,
  round2,
} from "@/lib/services/emission-calculator";

// ---------------------------------------------------------------------------
// round2 helper
// ---------------------------------------------------------------------------

describe("round2", () => {
  it("rounds to 2 decimal places", () => {
    expect(round2(1.005)).toBe(1.0);
    expect(round2(1.235)).toBe(1.24);
    expect(round2(1.234)).toBe(1.23);
    expect(round2(0)).toBe(0);
    expect(round2(100)).toBe(100);
  });
});

// ---------------------------------------------------------------------------
// calculateTheoreticalEmissions
// ---------------------------------------------------------------------------

describe("calculateTheoreticalEmissions", () => {
  it("calculates theoretical emissions: co2GKm=150, km=10000 -> 1500.00", () => {
    const result = calculateTheoreticalEmissions(150, 10000);
    expect(result).toBe(1500);
  });

  it("returns 0 when co2GKm is 0", () => {
    const result = calculateTheoreticalEmissions(0, 10000);
    expect(result).toBe(0);
  });

  it("returns 0 when km is 0", () => {
    const result = calculateTheoreticalEmissions(150, 0);
    expect(result).toBe(0);
  });

  it("handles fractional inputs with 2-decimal precision", () => {
    // 123.4 * 5678 = 700,665.2 / 1000 = 700.6652 -> round2 = 700.67
    const result = calculateTheoreticalEmissions(123.4, 5678);
    expect(result).toBe(700.67);
  });

  it("returns a number (not a string)", () => {
    const result = calculateTheoreticalEmissions(150, 10000);
    expect(typeof result).toBe("number");
  });
});

// ---------------------------------------------------------------------------
// calculateRealEmissions
// ---------------------------------------------------------------------------

describe("calculateRealEmissions", () => {
  it("calculates real emissions: litres=500, factor=2.640 -> 1320.00", () => {
    const result = calculateRealEmissions(500, 2.64);
    expect(result).toBe(1320);
  });

  it("returns 0 when fuel litres is 0", () => {
    const result = calculateRealEmissions(0, 2.64);
    expect(result).toBe(0);
  });

  it("returns 0 when emission factor is 0 (electric)", () => {
    const result = calculateRealEmissions(500, 0);
    expect(result).toBe(0);
  });

  it("handles fractional results with 2-decimal precision", () => {
    // 123.45 * 2.345 = 289.49025 -> 289.49
    const result = calculateRealEmissions(123.45, 2.345);
    expect(result).toBe(289.49);
  });
});

// ---------------------------------------------------------------------------
// calculateDelta
// ---------------------------------------------------------------------------

describe("calculateDelta", () => {
  it("calculates negative delta: theoretical=1500, real=1320 -> absolute=-180, percentage=-12.00", () => {
    const result = calculateDelta(1500, 1320);
    expect(result.absolute).toBe(-180);
    expect(result.percentage).toBe(-12);
  });

  it("calculates positive delta: theoretical=1500, real=1635 -> absolute=135, percentage=9.00", () => {
    const result = calculateDelta(1500, 1635);
    expect(result.absolute).toBe(135);
    expect(result.percentage).toBe(9);
  });

  it("calculates zero delta: theoretical=1500, real=1500 -> absolute=0, percentage=0.00", () => {
    const result = calculateDelta(1500, 1500);
    expect(result.absolute).toBe(0);
    expect(result.percentage).toBe(0);
  });

  it("handles theoretical=0 edge case (division by zero): percentage=0", () => {
    const result = calculateDelta(0, 100);
    expect(result.absolute).toBe(100);
    expect(result.percentage).toBe(0);
  });

  it("handles both zero: theoretical=0, real=0 -> absolute=0, percentage=0", () => {
    const result = calculateDelta(0, 0);
    expect(result.absolute).toBe(0);
    expect(result.percentage).toBe(0);
  });

  it("returns numbers with at most 2 decimal places", () => {
    // 1000 / 3 = 333.333... -> delta absolute = -666.67, percentage = -66.67
    const result = calculateDelta(1000, 333.33);
    expect(result.absolute).toBe(-666.67);
    expect(result.percentage).toBe(-66.67);
  });
});

// ---------------------------------------------------------------------------
// calculateVehicleEmissions (orchestrator)
// ---------------------------------------------------------------------------

describe("calculateVehicleEmissions", () => {
  it("orchestrates full calculation with realistic values", () => {
    const result = calculateVehicleEmissions({
      co2GKm: 150,
      kmTravelled: 10000,
      fuelLitres: 500,
      emissionFactorKgCO2ePerL: 2.64,
    });

    expect(result.theoretical).toBe(1500);
    expect(result.real).toBe(1320);
    expect(result.delta.absolute).toBe(-180);
    expect(result.delta.percentage).toBe(-12);
  });

  it("handles zero km (theoretical = 0)", () => {
    const result = calculateVehicleEmissions({
      co2GKm: 150,
      kmTravelled: 0,
      fuelLitres: 500,
      emissionFactorKgCO2ePerL: 2.64,
    });

    expect(result.theoretical).toBe(0);
    expect(result.real).toBe(1320);
    expect(result.delta.absolute).toBe(1320);
    expect(result.delta.percentage).toBe(0); // theoretical=0, division by zero guard
  });

  it("handles zero litres (real = 0)", () => {
    const result = calculateVehicleEmissions({
      co2GKm: 150,
      kmTravelled: 10000,
      fuelLitres: 0,
      emissionFactorKgCO2ePerL: 2.64,
    });

    expect(result.theoretical).toBe(1500);
    expect(result.real).toBe(0);
    expect(result.delta.absolute).toBe(-1500);
    expect(result.delta.percentage).toBe(-100);
  });

  it("handles electric vehicle (factor = 0)", () => {
    const result = calculateVehicleEmissions({
      co2GKm: 0,
      kmTravelled: 10000,
      fuelLitres: 0,
      emissionFactorKgCO2ePerL: 0,
    });

    expect(result.theoretical).toBe(0);
    expect(result.real).toBe(0);
    expect(result.delta.absolute).toBe(0);
    expect(result.delta.percentage).toBe(0);
  });

  it("produces coherent results: delta.absolute = real - theoretical", () => {
    const result = calculateVehicleEmissions({
      co2GKm: 180,
      kmTravelled: 5000,
      fuelLitres: 400,
      emissionFactorKgCO2ePerL: 2.392,
    });

    // theoretical = (180 * 5000) / 1000 = 900
    // real = 400 * 2.392 = 956.80
    expect(result.theoretical).toBe(900);
    expect(result.real).toBe(956.8);
    expect(result.delta.absolute).toBe(round2(result.real - result.theoretical));
  });
});

// ---------------------------------------------------------------------------
// Determinism test (NFR21)
// ---------------------------------------------------------------------------

describe("determinism (NFR21)", () => {
  it("produces identical results over 100 iterations", () => {
    const input = {
      co2GKm: 123.456,
      kmTravelled: 7890,
      fuelLitres: 456.789,
      emissionFactorKgCO2ePerL: 2.345,
    };

    const referenceResult = calculateVehicleEmissions(input);

    for (let i = 0; i < 100; i++) {
      const result = calculateVehicleEmissions(input);
      expect(result.theoretical).toBe(referenceResult.theoretical);
      expect(result.real).toBe(referenceResult.real);
      expect(result.delta.absolute).toBe(referenceResult.delta.absolute);
      expect(result.delta.percentage).toBe(referenceResult.delta.percentage);
    }
  });
});

// ---------------------------------------------------------------------------
// Precision tests
// ---------------------------------------------------------------------------

describe("precision — 2 decimal places", () => {
  it("theoretical emissions have at most 2 decimal places", () => {
    const result = calculateTheoreticalEmissions(123.456, 7890.123);
    const decimals = result.toString().split(".")[1];
    expect(!decimals || decimals.length <= 2).toBe(true);
  });

  it("real emissions have at most 2 decimal places", () => {
    const result = calculateRealEmissions(456.789, 2.345);
    const decimals = result.toString().split(".")[1];
    expect(!decimals || decimals.length <= 2).toBe(true);
  });

  it("delta absolute has at most 2 decimal places", () => {
    const result = calculateDelta(1234.567, 890.123);
    const decimals = result.absolute.toString().split(".")[1];
    expect(!decimals || decimals.length <= 2).toBe(true);
  });

  it("delta percentage has at most 2 decimal places", () => {
    const result = calculateDelta(1234.567, 890.123);
    const decimals = result.percentage.toString().split(".")[1];
    expect(!decimals || decimals.length <= 2).toBe(true);
  });
});
