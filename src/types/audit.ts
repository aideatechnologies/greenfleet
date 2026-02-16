// ---------------------------------------------------------------------------
// Audit Action types — all possible audit trail actions
// ---------------------------------------------------------------------------

export type AuditAction =
  | "fuel_record.created"
  | "fuel_record.updated"
  | "fuel_record.deleted"
  | "km_reading.created"
  | "km_reading.updated"
  | "km_reading.deleted"
  | "emission_factor.created"
  | "emission_factor.updated"
  | "emission_factor.deleted"
  | "vehicle.created"
  | "vehicle.updated"
  | "vehicle.deleted"
  | "contract.created"
  | "contract.updated"
  | "contract.deleted"
  | "employee.created"
  | "employee.updated"
  | "employee.deleted"
  | "emission_target.created"
  | "emission_target.updated"
  | "emission_target.deleted"
  | "macro_fuel_type.created"
  | "macro_fuel_type.updated"
  | "macro_fuel_type.deleted"
  | "fuel_type_mapping.created"
  | "fuel_type_mapping.updated"
  | "fuel_type_mapping.deleted"
  | "gwp_config.created"
  | "gwp_config.updated"
  | "gwp_config.deleted";

// ---------------------------------------------------------------------------
// Change tracking
// ---------------------------------------------------------------------------

export interface AuditChange {
  field: string;
  old: unknown;
  new: unknown;
}

// ---------------------------------------------------------------------------
// AuditEntry (full audit log entry, deserialized)
// ---------------------------------------------------------------------------

export interface AuditLogEntry {
  id: number;
  action: AuditAction;
  entityType: string;
  entityId: string;
  tenantId: string;
  userId: string;
  userName: string;
  timestamp: Date;
  changes: AuditChange[];
  metadata?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Entity type labels (for UI display)
// ---------------------------------------------------------------------------

export const ENTITY_TYPE_OPTIONS = [
  "Vehicle",
  "FuelRecord",
  "KmReading",
  "EmissionFactor",
  "Contract",
  "Employee",
  "EmissionTarget",
  "MacroFuelType",
  "FuelTypeMacroMapping",
  "GwpConfig",
] as const;

export type EntityType = (typeof ENTITY_TYPE_OPTIONS)[number];

export const ENTITY_TYPE_LABELS: Record<string, string> = {
  Vehicle: "Veicolo",
  FuelRecord: "Rifornimento",
  KmReading: "Rilevazione Km",
  EmissionFactor: "Fattore Emissione",
  Contract: "Contratto",
  Employee: "Dipendente",
  EmissionTarget: "Target Emissioni",
  MacroFuelType: "Macro Tipo Carburante",
  FuelTypeMacroMapping: "Mappatura Carburante",
  GwpConfig: "Configurazione GWP",
};

// ---------------------------------------------------------------------------
// Action type labels (for UI display)
// ---------------------------------------------------------------------------

export const ACTION_TYPE_OPTIONS = ["created", "updated", "deleted"] as const;
export type ActionType = (typeof ACTION_TYPE_OPTIONS)[number];

export const ACTION_TYPE_LABELS: Record<string, string> = {
  created: "Creazione",
  updated: "Modifica",
  deleted: "Eliminazione",
};

// ---------------------------------------------------------------------------
// Audit log filters
// ---------------------------------------------------------------------------

export interface AuditLogFilters {
  entityType?: string;
  userId?: string;
  actionType?: string;
  dateFrom?: Date;
  dateTo?: Date;
  page: number;
  pageSize: number;
}
