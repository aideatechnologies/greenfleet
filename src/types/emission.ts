/**
 * Tipi per il sistema di emissioni multi-gas (7 gas Kyoto).
 */

// ---------------------------------------------------------------------------
// Gas Kyoto Protocol
// ---------------------------------------------------------------------------

export const KYOTO_GASES = [
  "co2",
  "ch4",
  "n2o",
  "hfc",
  "pfc",
  "sf6",
  "nf3",
] as const;

export type KyotoGas = (typeof KYOTO_GASES)[number];

/** Etichette per i gas Kyoto (visualizzazione UI) */
export const KYOTO_GAS_LABELS: Record<KyotoGas, string> = {
  co2: "CO₂",
  ch4: "CH₄",
  n2o: "N₂O",
  hfc: "HFC",
  pfc: "PFC",
  sf6: "SF₆",
  nf3: "NF₃",
};

/** Nomi database (maiuscolo) per i gas */
export const KYOTO_GAS_DB_NAMES: Record<KyotoGas, string> = {
  co2: "CO2",
  ch4: "CH4",
  n2o: "N2O",
  hfc: "HFC",
  pfc: "PFC",
  sf6: "SF6",
  nf3: "NF3",
};

// ---------------------------------------------------------------------------
// Fattori di emissione per-gas
// ---------------------------------------------------------------------------

/** Fattori di emissione per i 7 gas (kg gas / unita) */
export type GasEmissionFactors = Record<KyotoGas, number>;

/** Potenziali di riscaldamento globale (GWP) */
export type GwpValues = Record<KyotoGas, number>;

/** Risultato emissioni per-gas in kgCO2e */
export type PerGasResult = Record<KyotoGas, number>;

// ---------------------------------------------------------------------------
// Scope
// ---------------------------------------------------------------------------

export const EMISSION_SCOPES = [1, 2] as const;
export type EmissionScope = (typeof EMISSION_SCOPES)[number];

export const SCOPE_LABELS: Record<EmissionScope, string> = {
  1: "Scope 1 (Termico)",
  2: "Scope 2 (Elettrico)",
};

// ---------------------------------------------------------------------------
// Contesto emissivo risolto (output di emission-resolution-service)
// ---------------------------------------------------------------------------

export type EmissionContext = {
  macroFuelType: {
    id: number;
    name: string;
    scope: EmissionScope;
    unit: string;
  };
  gasFactors: GasEmissionFactors;
  gwpValues: GwpValues;
};

// ---------------------------------------------------------------------------
// GWP defaults (IPCC AR5)
// ---------------------------------------------------------------------------

export const DEFAULT_GWP_AR5: GwpValues = {
  co2: 1,
  ch4: 28,
  n2o: 265,
  hfc: 1300,
  pfc: 6630,
  sf6: 23500,
  nf3: 16100,
};
