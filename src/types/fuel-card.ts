export const FuelCardStatus = {
  ACTIVE: "ACTIVE",
  EXPIRED: "EXPIRED",
  SUSPENDED: "SUSPENDED",
} as const;
export type FuelCardStatus =
  (typeof FuelCardStatus)[keyof typeof FuelCardStatus];

export const FUEL_CARD_STATUS_VALUES = Object.values(FuelCardStatus);

export const FUEL_CARD_STATUS_LABELS: Record<FuelCardStatus, string> = {
  ACTIVE: "Attiva",
  EXPIRED: "Scaduta",
  SUSPENDED: "Sospesa",
};

export const FuelCardAssignmentType = {
  VEHICLE: "VEHICLE",
  EMPLOYEE: "EMPLOYEE",
  JOLLY: "JOLLY",
} as const;
export type FuelCardAssignmentType =
  (typeof FuelCardAssignmentType)[keyof typeof FuelCardAssignmentType];

export const FUEL_CARD_ASSIGNMENT_TYPE_VALUES = Object.values(
  FuelCardAssignmentType
);

export const FUEL_CARD_ASSIGNMENT_TYPE_LABELS: Record<
  FuelCardAssignmentType,
  string
> = {
  VEHICLE: "Veicolo",
  EMPLOYEE: "Dipendente",
  JOLLY: "Jolly",
};
