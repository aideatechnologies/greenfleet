import { z } from "zod";

// ---------------------------------------------------------------------------
// Import config (CSV parsing options)
// ---------------------------------------------------------------------------

export const fuelCardImportConfigSchema = z.object({
  separator: z.string().default(";"),
  hasHeader: z.boolean().default(true),
  encoding: z.enum(["UTF-8", "ISO-8859-1", "Windows-1252"]).default("UTF-8"),
  numberFormat: z.enum(["IT", "EN"]).default("IT"),
});

export type FuelCardImportConfig = z.infer<typeof fuelCardImportConfigSchema>;

// ---------------------------------------------------------------------------
// Row validation schema for fuel card import
// ---------------------------------------------------------------------------

export const fuelCardImportRowSchema = z.object({
  cardNumber: z
    .string()
    .min(1, { error: "Il numero carta e obbligatorio" }),
  supplier: z
    .string()
    .min(1, { error: "Il fornitore e obbligatorio" }),
  expiryDate: z.string().optional(),
  licensePlate: z.string().optional(),
  employeeName: z.string().optional(),
  assignmentType: z.string().optional(),
});

export type FuelCardImportRow = z.infer<typeof fuelCardImportRowSchema>;

// ---------------------------------------------------------------------------
// Validated row ready for DB insertion
// ---------------------------------------------------------------------------

export type ValidatedFuelCardRow = {
  cardNumber: string;
  supplierId: number;
  expiryDate: Date | null;
  assignedVehicleId: number | null;
  assignedEmployeeId: number | null;
  assignmentType: string;
  warnings: string[];
};

// ---------------------------------------------------------------------------
// Import result types
// ---------------------------------------------------------------------------

export type FuelCardImportValidation = {
  rowIndex: number;
  data: Record<string, string>;
  errors: { field: string; message: string }[];
  warnings: string[];
  isValid: boolean;
  resolved?: ValidatedFuelCardRow;
};

export type FuelCardImportResult = {
  totalRows: number;
  validRows: number;
  errorRows: number;
  importedRows: number;
  skippedRows: number;
  durationMs: number;
  errors: FuelCardImportValidation[];
};

// ---------------------------------------------------------------------------
// Import field configuration
// ---------------------------------------------------------------------------

export const FUEL_CARD_IMPORT_FIELDS = [
  { field: "cardNumber", label: "Numero Carta", required: true },
  { field: "supplier", label: "Fornitore", required: true },
  { field: "expiryDate", label: "Data Scadenza", required: false },
  { field: "licensePlate", label: "Targa Assegnata", required: false },
  { field: "employeeName", label: "Dipendente Assegnato", required: false },
  { field: "assignmentType", label: "Tipo Assegnazione", required: false },
] as const;

export const FUEL_CARD_FIELD_LABELS: Record<string, string> = {
  cardNumber: "Numero Carta",
  supplier: "Fornitore",
  expiryDate: "Data Scadenza",
  licensePlate: "Targa Assegnata",
  employeeName: "Dipendente Assegnato",
  assignmentType: "Tipo Assegnazione",
};

export const FUEL_CARD_IMPORTABLE_FIELDS: string[] =
  FUEL_CARD_IMPORT_FIELDS.map((f) => f.field);

export const FUEL_CARD_REQUIRED_FIELDS: string[] =
  FUEL_CARD_IMPORT_FIELDS.filter((f) => f.required).map((f) => f.field);
