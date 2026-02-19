import { z } from "zod";

// ---------------------------------------------------------------------------
// Import config (CSV parsing options)
// ---------------------------------------------------------------------------

export const kmReadingImportConfigSchema = z.object({
  separator: z.string().default(";"),
  hasHeader: z.boolean().default(true),
  encoding: z.enum(["UTF-8", "ISO-8859-1", "Windows-1252"]).default("UTF-8"),
  numberFormat: z.enum(["IT", "EN"]).default("IT"),
});

export type KmReadingImportConfig = z.infer<typeof kmReadingImportConfigSchema>;

// ---------------------------------------------------------------------------
// Row validation schema for km reading import
// ---------------------------------------------------------------------------

export const kmReadingImportRowSchema = z.object({
  licensePlate: z
    .string()
    .min(1, { error: "La targa e obbligatoria" }),
  date: z
    .string()
    .min(1, { error: "La data rilevamento e obbligatoria" }),
  odometerKm: z
    .string()
    .min(1, { error: "I km rilevati sono obbligatori" }),
  assignee: z.string().optional(),
  source: z.string().optional(),
});

export type KmReadingImportRow = z.infer<typeof kmReadingImportRowSchema>;

// ---------------------------------------------------------------------------
// Validated row ready for DB insertion
// ---------------------------------------------------------------------------

export type ValidatedKmReadingRow = {
  vehicleId: number;
  licensePlate: string;
  date: Date;
  odometerKm: number;
  source: string;
  warnings: string[];
};

// ---------------------------------------------------------------------------
// Import result types
// ---------------------------------------------------------------------------

export type KmReadingImportValidation = {
  rowIndex: number;
  data: Record<string, string>;
  errors: { field: string; message: string }[];
  warnings: string[];
  isValid: boolean;
  resolved?: ValidatedKmReadingRow;
};

export type KmReadingImportResult = {
  totalRows: number;
  validRows: number;
  errorRows: number;
  importedRows: number;
  skippedRows: number;
  durationMs: number;
  errors: KmReadingImportValidation[];
};

// ---------------------------------------------------------------------------
// Import field configuration
// ---------------------------------------------------------------------------

export const KM_READING_IMPORT_FIELDS = [
  { field: "licensePlate", label: "Targa", required: true },
  { field: "date", label: "Data Rilevamento", required: true },
  { field: "odometerKm", label: "Km Rilevati", required: true },
  { field: "assignee", label: "Assegnatario", required: false },
  { field: "source", label: "Fonte", required: false },
] as const;

export const KM_READING_FIELD_LABELS: Record<string, string> = {
  licensePlate: "Targa",
  date: "Data Rilevamento",
  odometerKm: "Km Rilevati",
  assignee: "Assegnatario",
  source: "Fonte",
};

export const KM_READING_IMPORTABLE_FIELDS: string[] =
  KM_READING_IMPORT_FIELDS.map((f) => f.field);

export const KM_READING_REQUIRED_FIELDS: string[] =
  KM_READING_IMPORT_FIELDS.filter((f) => f.required).map((f) => f.field);
