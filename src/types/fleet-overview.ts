import type { ContractType } from "./contract";

// ---------------------------------------------------------------------------
// Vehicle status union (mirrors TenantVehicle.status column)
// ---------------------------------------------------------------------------

export const FleetVehicleStatus = {
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
  DISPOSED: "DISPOSED",
} as const;
export type FleetVehicleStatus =
  (typeof FleetVehicleStatus)[keyof typeof FleetVehicleStatus];

export const FLEET_VEHICLE_STATUS_LABELS: Record<FleetVehicleStatus, string> = {
  ACTIVE: "Attivo",
  INACTIVE: "Inattivo",
  DISPOSED: "Dismesso",
};

// ---------------------------------------------------------------------------
// Assignment status — derived from assignedEmployeeId presence
// ---------------------------------------------------------------------------

export const AssignmentStatus = {
  ASSIGNED: "ASSIGNED",
  UNASSIGNED: "UNASSIGNED",
  POOL: "POOL",
} as const;
export type AssignmentStatus =
  (typeof AssignmentStatus)[keyof typeof AssignmentStatus];

export const ASSIGNMENT_STATUS_LABELS: Record<AssignmentStatus, string> = {
  ASSIGNED: "Assegnato",
  UNASSIGNED: "Non assegnato",
  POOL: "Pool",
};

// ---------------------------------------------------------------------------
// Contract status for overview — derived from active contract presence
// ---------------------------------------------------------------------------

export const FleetContractStatus = {
  HAS_CONTRACT: "HAS_CONTRACT",
  NO_CONTRACT: "NO_CONTRACT",
  EXPIRING: "EXPIRING",
} as const;
export type FleetContractStatus =
  (typeof FleetContractStatus)[keyof typeof FleetContractStatus];

export const FLEET_CONTRACT_STATUS_LABELS: Record<FleetContractStatus, string> = {
  HAS_CONTRACT: "Con contratto",
  NO_CONTRACT: "Senza contratto",
  EXPIRING: "In scadenza",
};

// ---------------------------------------------------------------------------
// FleetVehicleOverview — one row in the fleet vehicle overview table
// ---------------------------------------------------------------------------

export type FleetVehicleOverview = {
  id: number;
  licensePlate: string;
  make: string;
  model: string;
  trim?: string;
  vehicleStatus: FleetVehicleStatus;
  assignmentStatus: AssignmentStatus;
  assignedEmployee: {
    id: number;
    firstName: string;
    lastName: string;
    isPool: boolean;
  } | null;
  activeContract: {
    id: number;
    type: ContractType;
    endDate: Date | null;
  } | null;
  documentCount: number;
  expiredDocumentCount: number;
};

// ---------------------------------------------------------------------------
// Employee status for overview
// ---------------------------------------------------------------------------

export const EmployeeOverviewStatus = {
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
} as const;
export type EmployeeOverviewStatus =
  (typeof EmployeeOverviewStatus)[keyof typeof EmployeeOverviewStatus];

export const EMPLOYEE_OVERVIEW_STATUS_LABELS: Record<EmployeeOverviewStatus, string> = {
  ACTIVE: "Attivo",
  INACTIVE: "Inattivo",
};

// ---------------------------------------------------------------------------
// FleetEmployeeOverview — one row in the fleet employee overview table
// ---------------------------------------------------------------------------

export type FleetEmployeeOverview = {
  id: number;
  firstName: string;
  lastName: string;
  email: string | null;
  isPool: boolean;
  isActive: boolean;
  assignedVehicle: {
    id: number;
    licensePlate: string;
    make: string;
    model: string;
  } | null;
};

// ---------------------------------------------------------------------------
// FleetSummaryKPIs — aggregate KPIs for the entire fleet
// ---------------------------------------------------------------------------

export type FleetSummaryKPIs = {
  totalVehicles: number;
  activeVehicles: number;
  assignedVehicles: number;
  freeVehicles: number;
  activeContracts: number;
  expiringContracts: number;
  expiredDocuments: number;
  totalEmployees: number;
  activeEmployees: number;
  unassignedEmployees: number;
};
