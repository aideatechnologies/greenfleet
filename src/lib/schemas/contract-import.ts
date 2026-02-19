import { z } from "zod";

// ---------------------------------------------------------------------------
// Import config (CSV parsing options)
// ---------------------------------------------------------------------------

export const contractImportConfigSchema = z.object({
  separator: z.string().default(";"),
  hasHeader: z.boolean().default(true),
  encoding: z.enum(["UTF-8", "ISO-8859-1", "Windows-1252"]).default("UTF-8"),
  numberFormat: z.enum(["IT", "EN"]).default("IT"),
});

export type ContractImportConfig = z.infer<typeof contractImportConfigSchema>;

// ---------------------------------------------------------------------------
// Row validation schema for contract import
// ---------------------------------------------------------------------------

export const contractImportRowSchema = z.object({
  contractNumber: z
    .string()
    .min(1, { error: "Il numero contratto e obbligatorio" }),
  licensePlate: z
    .string()
    .min(1, { error: "La targa e obbligatoria" }),
  contractType: z
    .string()
    .min(1, { error: "Il tipo contratto e obbligatorio" }),
  supplier: z.string().optional(),
  startDate: z
    .string()
    .min(1, { error: "La data inizio e obbligatoria" }),
  endDate: z.string().optional(),
  monthlyRate: z.string().optional(),
  franchiseKm: z.string().optional(),
});

export type ContractImportRow = z.infer<typeof contractImportRowSchema>;

// ---------------------------------------------------------------------------
// Validated row ready for DB insertion
// ---------------------------------------------------------------------------

export type ValidatedContractRow = {
  contractNumber: string;
  vehicleId: number;
  licensePlate: string;
  contractType: string;
  supplierId: number | null;
  supplierName: string | null;
  startDate: Date;
  endDate: Date | null;
  monthlyRate: number | null;
  franchiseKm: number | null;
  warnings: string[];
};

// ---------------------------------------------------------------------------
// Import result types
// ---------------------------------------------------------------------------

export type ContractImportValidation = {
  rowIndex: number;
  data: Record<string, string>;
  errors: { field: string; message: string }[];
  warnings: string[];
  isValid: boolean;
  resolved?: ValidatedContractRow;
};

export type ContractImportResult = {
  totalRows: number;
  validRows: number;
  errorRows: number;
  importedRows: number;
  skippedRows: number;
  durationMs: number;
  errors: ContractImportValidation[];
};

// ---------------------------------------------------------------------------
// Import field configuration
// ---------------------------------------------------------------------------

export const CONTRACT_IMPORT_FIELDS = [
  { field: "contractNumber", label: "Numero Contratto", required: true },
  { field: "licensePlate", label: "Targa", required: true },
  { field: "contractType", label: "Tipo Contratto", required: true },
  { field: "supplier", label: "Fornitore", required: false },
  { field: "startDate", label: "Data Inizio", required: true },
  { field: "endDate", label: "Data Fine", required: false },
  { field: "monthlyRate", label: "Canone", required: false },
  { field: "franchiseKm", label: "Km Franchigia", required: false },
] as const;

export const CONTRACT_FIELD_LABELS: Record<string, string> = {
  contractNumber: "Numero Contratto",
  licensePlate: "Targa",
  contractType: "Tipo Contratto",
  supplier: "Fornitore",
  startDate: "Data Inizio",
  endDate: "Data Fine",
  monthlyRate: "Canone",
  franchiseKm: "Km Franchigia",
};

export const CONTRACT_IMPORTABLE_FIELDS: string[] =
  CONTRACT_IMPORT_FIELDS.map((f) => f.field);

export const CONTRACT_REQUIRED_FIELDS: string[] =
  CONTRACT_IMPORT_FIELDS.filter((f) => f.required).map((f) => f.field);
