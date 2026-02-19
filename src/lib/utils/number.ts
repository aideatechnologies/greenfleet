// ---------------------------------------------------------------------------
// Emission-specific number formatting helpers (IT locale)
// ---------------------------------------------------------------------------

const fmt2 = new Intl.NumberFormat("it-IT", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const fmtSign2 = new Intl.NumberFormat("it-IT", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  signDisplay: "exceptZero",
});

// ---------------------------------------------------------------------------
// formatEmission
// ---------------------------------------------------------------------------

/**
 * Formats an emission value in kgCO2e with IT locale and 2 decimal places.
 *
 * Examples:
 *   formatEmission(1320)    -> "1.320,00 kgCO2e"
 *   formatEmission(0)       -> "0,00 kgCO2e"
 *   formatEmission(1500.5)  -> "1.500,50 kgCO2e"
 *
 * For values >= 1000, you can optionally request tCO2e display via `asTonnes`.
 *   formatEmission(1500, true) -> "1,50 tCO2e"
 */
export function formatEmission(value: number, asTonnes?: boolean): string {
  if (asTonnes && Math.abs(value) >= 1000) {
    return `${fmt2.format(value / 1000)} tCO2e`;
  }
  return `${fmt2.format(value)} kgCO2e`;
}

// ---------------------------------------------------------------------------
// formatTheoreticalEmission (CO2 puro, non CO2e)
// ---------------------------------------------------------------------------

/**
 * Formats a theoretical emission value in kgCO2 (pure CO2 from WLTP catalog).
 * Theoretical emissions use CO2, NOT CO2e, because WLTP test only measures CO2.
 *
 * Examples:
 *   formatTheoreticalEmission(1320)    -> "1.320,00 kgCO2"
 *   formatTheoreticalEmission(1500, true) -> "1,50 tCO2"
 */
export function formatTheoreticalEmission(value: number, asTonnes?: boolean): string {
  if (asTonnes && Math.abs(value) >= 1000) {
    return `${fmt2.format(value / 1000)} tCO2`;
  }
  return `${fmt2.format(value)} kgCO2`;
}

// ---------------------------------------------------------------------------
// formatDeltaPercentage
// ---------------------------------------------------------------------------

/**
 * Formats a delta percentage with explicit sign and IT locale (2 decimals).
 *
 * Examples:
 *   formatDeltaPercentage(9)     -> "+9,00%"
 *   formatDeltaPercentage(-12)   -> "-12,00%"
 *   formatDeltaPercentage(0)     -> "0,00%"
 */
export function formatDeltaPercentage(value: number): string {
  return `${fmtSign2.format(value)}%`;
}

// ---------------------------------------------------------------------------
// Additional formatters (Story 6.4)
// ---------------------------------------------------------------------------

const fmtKm = new Intl.NumberFormat("it-IT", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const fmtFuel = new Intl.NumberFormat("it-IT", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const fmtPctSign1 = new Intl.NumberFormat("it-IT", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
  signDisplay: "exceptZero",
});

/**
 * Formats a km value with IT locale.
 *
 * Examples:
 *   formatKm(12345) -> "12.345 km"
 *   formatKm(0)     -> "0 km"
 */
export function formatKm(value: number): string {
  return `${fmtKm.format(value)} km`;
}

/**
 * Formats a fuel quantity in litres with IT locale (1 decimal).
 *
 * Examples:
 *   formatFuel(1234.5) -> "1.234,5 L"
 *   formatFuel(0)      -> "0,0 L"
 */
export function formatFuel(value: number): string {
  return `${fmtFuel.format(value)} L`;
}

/**
 * Formats a percentage with explicit sign and IT locale (1 decimal).
 *
 * Examples:
 *   formatPercentage(5.23)  -> "+5,2%"
 *   formatPercentage(-3.1)  -> "-3,1%"
 *   formatPercentage(0)     -> "0,0%"
 */
export function formatPercentage(value: number): string {
  return `${fmtPctSign1.format(value)}%`;
}

/**
 * Formats fuel consumption showing L, kWh, or both (for hybrids).
 *
 * Examples:
 *   formatFuelConsumption(1234.5, 0)     -> "1.234,5 L"
 *   formatFuelConsumption(0, 450.2)      -> "450,2 kWh"
 *   formatFuelConsumption(500, 120)      -> "500,0 L + 120,0 kWh"
 */
/**
 * Formats a CO2 intensity value in gCO2e/km with IT locale (1 decimal).
 *
 * Examples:
 *   formatCO2Intensity(142.3) -> "142,3 gCO2e/km"
 *   formatCO2Intensity(0)     -> "0,0 gCO2e/km"
 */
export function formatCO2Intensity(value: number): string {
  return `${fmtFuel.format(value)} gCO2e/km`;
}

export function formatFuelConsumption(litres: number, kwh: number): string {
  if (litres > 0 && kwh > 0)
    return `${fmtFuel.format(litres)} L + ${fmtFuel.format(kwh)} kWh`;
  if (kwh > 0) return `${fmtFuel.format(kwh)} kWh`;
  return `${fmtFuel.format(litres)} L`;
}
