// Default supplier type codes (seeded per tenant, but extensible)
export const DEFAULT_SUPPLIER_TYPE_CODES = {
  NLT: "NLT",
  CARBURANTE: "CARBURANTE",
  ALTRO: "ALTRO",
} as const;

export const DEFAULT_SUPPLIER_TYPE_LABELS: Record<string, string> = {
  NLT: "Noleggio Lungo Termine",
  CARBURANTE: "Carburante",
  ALTRO: "Altro",
};
