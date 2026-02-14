/**
 * Standard di misurazione emissioni CO2.
 */
export enum Co2Standard {
  WLTP = "WLTP",
  NEDC = "NEDC",
}

export const CO2_STANDARD_VALUES = Object.values(Co2Standard);

/**
 * Stato del veicolo operativo nella flotta del tenant.
 */
export const VehicleStatus = {
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
  DISPOSED: "DISPOSED",
} as const;

export type VehicleStatus = (typeof VehicleStatus)[keyof typeof VehicleStatus];

export const VEHICLE_STATUS_LABELS: Record<VehicleStatus, string> = {
  [VehicleStatus.ACTIVE]: "Attivo",
  [VehicleStatus.INACTIVE]: "Inattivo",
  [VehicleStatus.DISPOSED]: "Dismesso",
};

export const VEHICLE_STATUS_VALUES = Object.values(VehicleStatus) as VehicleStatus[];
