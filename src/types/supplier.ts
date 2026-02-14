export const SupplierType = {
  NLT: "NLT",
  CARBURANTE: "CARBURANTE",
  ALTRO: "ALTRO",
} as const;
export type SupplierType = (typeof SupplierType)[keyof typeof SupplierType];

export const SUPPLIER_TYPE_VALUES = Object.values(SupplierType);

export const SUPPLIER_TYPE_LABELS: Record<SupplierType, string> = {
  NLT: "Noleggio Lungo Termine",
  CARBURANTE: "Carburante",
  ALTRO: "Altro",
};
