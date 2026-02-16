import type { ContractType } from "./contract";

// ---------------------------------------------------------------------------
// Expiry status — used to classify contract expiration state
// ---------------------------------------------------------------------------

export const ExpiryStatus = {
  NO_CONTRACT: "NO_CONTRACT",
  EXPIRED: "EXPIRED",
  EXPIRING_30: "EXPIRING_30",
  EXPIRING_60: "EXPIRING_60",
  EXPIRING_90: "EXPIRING_90",
  OK: "OK",
} as const;
export type ExpiryStatus = (typeof ExpiryStatus)[keyof typeof ExpiryStatus];

/** Italian labels for ExpiryStatus values */
export const EXPIRY_STATUS_LABELS: Record<ExpiryStatus, string> = {
  NO_CONTRACT: "Nessun contratto",
  EXPIRED: "Scaduto",
  EXPIRING_30: "Scade entro 30gg",
  EXPIRING_60: "Scade entro 60gg",
  EXPIRING_90: "Scade entro 90gg",
  OK: "In regola",
};

/** Expiry thresholds in days */
export const EXPIRY_THRESHOLDS = {
  CRITICAL: 30,
  WARNING: 60,
  NOTICE: 90,
} as const;

// ---------------------------------------------------------------------------
// ContractStatusRow — row shape for contract status overview table
// ---------------------------------------------------------------------------

export type ContractStatusRow = {
  vehicle: {
    id: number;
    licensePlate: string;
    make: string;
    model: string;
    trim?: string;
  };
  activeContract: {
    id: number;
    type: ContractType;
    startDate: Date | null;
    endDate: Date | null;
    supplierName: string | null;
    supplierId: number | null;
    monthlyRate: number | null;
    dailyRate: number | null;
    purchasePrice: number | null;
  } | null;
  expiryStatus: ExpiryStatus;
  daysToExpiry: number | null;
};

// ---------------------------------------------------------------------------
// KPI summary shape for contract status page
// ---------------------------------------------------------------------------

export type ContractStatusKpi = {
  totalVehicles: number;
  withContract: number;
  noContract: number;
  expired: number;
  expiring30: number;
  expiring60: number;
  expiring90: number;
};
