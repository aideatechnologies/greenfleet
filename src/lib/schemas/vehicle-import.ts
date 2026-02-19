import { z } from "zod";

// ---------------------------------------------------------------------------
// Import config (CSV parsing options)
// ---------------------------------------------------------------------------

export const vehicleImportConfigSchema = z.object({
  separator: z.string().default(";"),
  hasHeader: z.boolean().default(true),
  encoding: z.enum(["UTF-8", "ISO-8859-1", "Windows-1252"]).default("UTF-8"),
  numberFormat: z.enum(["IT", "EN"]).default("IT"),
});

export type VehicleImportConfig = z.infer<typeof vehicleImportConfigSchema>;

// ---------------------------------------------------------------------------
// Row validation schema for vehicle import
// ---------------------------------------------------------------------------

export const vehicleImportRowSchema = z.object({
  licensePlate: z
    .string()
    .min(1, { error: "La targa e obbligatoria" })
    .max(20, { error: "La targa non puo superare 20 caratteri" }),
  marca: z
    .string()
    .min(1, { error: "La marca e obbligatoria" }),
  modello: z
    .string()
    .min(1, { error: "Il modello e obbligatorio" }),
  allestimento: z.string().optional(),
  vin: z
    .string()
    .max(17, { error: "Il telaio non puo superare 17 caratteri" })
    .optional(),
  registrationDate: z
    .string()
    .min(1, { error: "La data immatricolazione e obbligatoria" }),
  fuelType: z
    .string()
    .min(1, { error: "Il tipo alimentazione e obbligatorio" }),
  status: z.string().optional(),
});

export type VehicleImportRow = z.infer<typeof vehicleImportRowSchema>;

// ---------------------------------------------------------------------------
// Validated row ready for DB insertion
// ---------------------------------------------------------------------------

export type ValidatedVehicleRow = {
  licensePlate: string;
  marca: string;
  modello: string;
  allestimento: string | null;
  vin: string | null;
  registrationDate: Date;
  fuelType: string;
  status: string;
  warnings: string[];
};

// ---------------------------------------------------------------------------
// Import result types
// ---------------------------------------------------------------------------

export type VehicleImportValidation = {
  rowIndex: number;
  data: Record<string, string>;
  errors: { field: string; message: string }[];
  warnings: string[];
  isValid: boolean;
  resolved?: ValidatedVehicleRow;
};

export type VehicleImportResult = {
  totalRows: number;
  validRows: number;
  errorRows: number;
  importedRows: number;
  skippedRows: number;
  durationMs: number;
  errors: VehicleImportValidation[];
};

// ---------------------------------------------------------------------------
// Import field configuration
// ---------------------------------------------------------------------------

export const VEHICLE_IMPORT_FIELDS = [
  { field: "licensePlate", label: "Targa", required: true },
  { field: "marca", label: "Marca", required: true },
  { field: "modello", label: "Modello", required: true },
  { field: "allestimento", label: "Allestimento", required: false },
  { field: "vin", label: "Telaio", required: false },
  { field: "registrationDate", label: "Data Immatricolazione", required: true },
  { field: "fuelType", label: "Tipo Alimentazione", required: true },
  { field: "status", label: "Stato", required: false },
] as const;

export const VEHICLE_FIELD_LABELS: Record<string, string> = {
  licensePlate: "Targa",
  marca: "Marca",
  modello: "Modello",
  allestimento: "Allestimento",
  vin: "Telaio",
  registrationDate: "Data Immatricolazione",
  fuelType: "Tipo Alimentazione",
  status: "Stato",
};

export const VEHICLE_IMPORTABLE_FIELDS: string[] =
  VEHICLE_IMPORT_FIELDS.map((f) => f.field);

export const VEHICLE_REQUIRED_FIELDS: string[] =
  VEHICLE_IMPORT_FIELDS.filter((f) => f.required).map((f) => f.field);
