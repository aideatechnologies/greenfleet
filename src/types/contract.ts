export const ContractType = {
  PROPRIETARIO: "PROPRIETARIO",
  BREVE_TERMINE: "BREVE_TERMINE",
  LUNGO_TERMINE: "LUNGO_TERMINE",
  LEASING_FINANZIARIO: "LEASING_FINANZIARIO",
} as const;
export type ContractType = (typeof ContractType)[keyof typeof ContractType];

export const CONTRACT_TYPE_VALUES = Object.values(ContractType);

export const CONTRACT_TYPE_LABELS: Record<ContractType, string> = {
  PROPRIETARIO: "Proprietario",
  BREVE_TERMINE: "Breve Termine",
  LUNGO_TERMINE: "Lungo Termine",
  LEASING_FINANZIARIO: "Leasing Finanziario",
};

export const CONTRACT_TYPE_DESCRIPTIONS: Record<ContractType, string> = {
  PROPRIETARIO: "Veicolo di proprieta dell'azienda",
  BREVE_TERMINE: "Noleggio a breve termine con canone giornaliero",
  LUNGO_TERMINE: "Noleggio a lungo termine con canone mensile",
  LEASING_FINANZIARIO: "Leasing finanziario con opzione di riscatto",
};

export const ContractStatus = {
  ACTIVE: "ACTIVE",
  CLOSED: "CLOSED",
} as const;
export type ContractStatus =
  (typeof ContractStatus)[keyof typeof ContractStatus];

export const CONTRACT_STATUS_VALUES = Object.values(ContractStatus);

export const CONTRACT_STATUS_LABELS: Record<ContractStatus, string> = {
  ACTIVE: "Attivo",
  CLOSED: "Chiuso",
};
