import { z } from "zod";

// ---------------------------------------------------------------------------
// Import config (CSV parsing options)
// ---------------------------------------------------------------------------

export const fuelRecordImportConfigSchema = z.object({
  separator: z.string().default(";"),
  hasHeader: z.boolean().default(true),
  encoding: z.enum(["UTF-8", "ISO-8859-1", "Windows-1252"]).default("UTF-8"),
  numberFormat: z.enum(["IT", "EN"]).default("IT"),
});

export type FuelRecordImportConfig = z.infer<
  typeof fuelRecordImportConfigSchema
>;

// ---------------------------------------------------------------------------
// Row validation schema for fuel record import
// ---------------------------------------------------------------------------

export const fuelRecordImportRowSchema = z.object({
  licensePlate: z
    .string()
    .min(1, { error: "La targa e obbligatoria" })
    .max(20, { error: "La targa non puo superare 20 caratteri" }),
  date: z
    .string()
    .min(1, { error: "La data e obbligatoria" }),
  fuelType: z
    .string()
    .min(1, { error: "Il tipo carburante e obbligatorio" }),
  quantityLiters: z
    .string()
    .min(1, { error: "La quantita e obbligatoria" }),
  amountEur: z
    .string()
    .min(1, { error: "L'importo e obbligatorio" }),
  odometerKm: z
    .string()
    .min(1, { error: "Il chilometraggio e obbligatorio" }),
  notes: z
    .string()
    .max(1000, { error: "Le note non possono superare 1000 caratteri" })
    .optional(),
});

export type FuelRecordImportRow = z.infer<typeof fuelRecordImportRowSchema>;

// ---------------------------------------------------------------------------
// Validated row ready for DB insertion
// ---------------------------------------------------------------------------

export type ValidatedFuelRecordRow = {
  vehicleId: number;
  licensePlate: string;
  date: Date;
  fuelType: string;
  quantityLiters: number;
  amountEur: number;
  odometerKm: number;
  notes: string | null;
  warnings: string[];
};

// ---------------------------------------------------------------------------
// Import result types
// ---------------------------------------------------------------------------

export type FuelRecordImportValidation = {
  rowIndex: number;
  data: Record<string, string>;
  errors: { field: string; message: string }[];
  warnings: string[];
  isValid: boolean;
  resolved?: ValidatedFuelRecordRow;
};

export type FuelRecordImportResult = {
  totalRows: number;
  validRows: number;
  errorRows: number;
  importedRows: number;
  skippedRows: number;
  durationMs: number;
  errors: FuelRecordImportValidation[];
};

// ---------------------------------------------------------------------------
// Import field configuration
// ---------------------------------------------------------------------------

export const FUEL_RECORD_IMPORT_FIELDS = [
  { field: "licensePlate", label: "Targa", required: true },
  { field: "date", label: "Data", required: true },
  { field: "fuelType", label: "Tipo Carburante", required: true },
  { field: "quantityLiters", label: "Quantita (L)", required: true },
  { field: "amountEur", label: "Importo (EUR)", required: true },
  { field: "odometerKm", label: "Km", required: true },
  { field: "notes", label: "Note", required: false },
] as const;

export const FUEL_RECORD_FIELD_LABELS: Record<string, string> = {
  licensePlate: "Targa",
  date: "Data",
  fuelType: "Tipo Carburante",
  quantityLiters: "Quantita (L)",
  amountEur: "Importo (EUR)",
  odometerKm: "Km",
  notes: "Note",
};

export const FUEL_RECORD_IMPORTABLE_FIELDS: string[] =
  FUEL_RECORD_IMPORT_FIELDS.map((f) => f.field);

export const FUEL_RECORD_REQUIRED_FIELDS: string[] =
  FUEL_RECORD_IMPORT_FIELDS.filter((f) => f.required).map((f) => f.field);
