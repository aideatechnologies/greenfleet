import Papa from "papaparse";
import * as XLSX from "xlsx";
import { employeeImportRowSchema } from "@/lib/schemas/employee-import";
import type {
  ParsedData,
  ColumnMapping,
  ImportValidationResult,
} from "@/types/import";

/**
 * Column aliases for auto-mapping headers to Greenfleet fields.
 * Supports both Italian and English column names.
 */
const COLUMN_ALIASES: Record<string, string[]> = {
  firstName: ["nome", "first_name", "firstname", "name", "first name"],
  lastName: ["cognome", "last_name", "lastname", "surname", "last name"],
  email: ["email", "e-mail", "mail", "posta elettronica"],
  fiscalCode: [
    "codice_fiscale",
    "codice fiscale",
    "cf",
    "fiscal_code",
    "tax_code",
  ],
  phone: ["telefono", "phone", "tel", "cellulare", "mobile"],
};

/** Human-readable field labels (Italian) */
export const FIELD_LABELS: Record<string, string> = {
  firstName: "Nome",
  lastName: "Cognome",
  email: "Email",
  fiscalCode: "Codice Fiscale",
  phone: "Telefono",
};

/** All importable fields */
export const IMPORTABLE_FIELDS = [
  "firstName",
  "lastName",
  "email",
  "fiscalCode",
  "phone",
] as const;

/** Required fields for import */
export const REQUIRED_FIELDS = ["firstName", "lastName"] as const;

/**
 * Detect file type from file name extension.
 */
export function detectFileType(fileName: string): "csv" | "excel" {
  const ext = fileName.toLowerCase().split(".").pop();
  if (ext === "xlsx" || ext === "xls") return "excel";
  return "csv";
}

/**
 * Parse CSV file content into headers and rows.
 */
export function parseCSV(
  fileContent: string,
  config: { separator: string; hasHeader: boolean }
): ParsedData {
  const result = Papa.parse<string[]>(fileContent, {
    delimiter: config.separator,
    header: false,
    skipEmptyLines: true,
  });

  if (result.errors.length > 0) {
    throw new Error(
      `Errore nel parsing del CSV: ${result.errors[0].message}`
    );
  }

  const allRows = result.data;

  if (allRows.length === 0) {
    return { headers: [], rows: [] };
  }

  if (config.hasHeader) {
    const headers = allRows[0].map((h) => h.trim());
    const rows = allRows.slice(1);
    return { headers, rows };
  }

  // Generate generic column headers
  const colCount = allRows[0].length;
  const headers = Array.from({ length: colCount }, (_, i) => `Colonna ${i + 1}`);
  return { headers, rows: allRows };
}

/**
 * Parse Excel file (ArrayBuffer) into headers and rows.
 */
export function parseExcel(arrayBuffer: ArrayBuffer): ParsedData {
  const workbook = XLSX.read(arrayBuffer, { type: "array" });
  const firstSheetName = workbook.SheetNames[0];

  if (!firstSheetName) {
    throw new Error("Il file Excel non contiene fogli");
  }

  const worksheet = workbook.Sheets[firstSheetName];
  const jsonData = XLSX.utils.sheet_to_json<string[]>(worksheet, {
    header: 1,
    defval: "",
    raw: false,
  });

  if (jsonData.length === 0) {
    return { headers: [], rows: [] };
  }

  const headers = jsonData[0].map((h: unknown) => String(h ?? "").trim());
  const rows = jsonData.slice(1).map((row) =>
    row.map((cell: unknown) => String(cell ?? "").trim())
  );

  // Remove completely empty rows
  const filteredRows = rows.filter((row) =>
    row.some((cell) => cell.length > 0)
  );

  return { headers, rows: filteredRows };
}

/**
 * Auto-map column headers to Greenfleet fields using the aliases map.
 * Returns a partial mapping — only fields that could be matched.
 */
export function autoMapColumns(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {};

  for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
    const index = headers.findIndex((header) =>
      aliases.includes(header.toLowerCase().trim())
    );
    if (index !== -1) {
      mapping[field] = index;
    }
  }

  return mapping;
}

/**
 * Validate all data rows against the employee import schema.
 * Returns validation results for each row.
 */
export function validateRows(
  rows: string[][],
  mapping: ColumnMapping,
  _headers: string[]
): ImportValidationResult[] {
  return rows.map((row, rowIndex) => {
    const data: Record<string, string> = {};

    // Extract mapped fields from row
    for (const [field, colIndex] of Object.entries(mapping)) {
      const value = row[colIndex]?.trim() ?? "";
      data[field] = value;
    }

    // Validate with Zod
    const result = employeeImportRowSchema.safeParse(data);

    if (result.success) {
      return {
        rowIndex,
        data,
        errors: [],
        isValid: true,
      };
    }

    const errors = result.error.issues.map((issue) => ({
      field: issue.path.join(".") || "generale",
      message: issue.message,
    }));

    return {
      rowIndex,
      data,
      errors,
      isValid: false,
    };
  });
}

/**
 * Check for duplicate fiscal codes within the import data and against
 * existing fiscal codes in the database.
 *
 * Marks rows as invalid if they have a duplicate fiscal code.
 */
export function checkDuplicates(
  validResults: ImportValidationResult[],
  existingFiscalCodes: string[]
): ImportValidationResult[] {
  const existingSet = new Set(
    existingFiscalCodes.map((fc) => fc.toUpperCase())
  );
  const seenInBatch = new Map<string, number>(); // fiscalCode -> first rowIndex

  return validResults.map((result) => {
    const fc = result.data.fiscalCode?.toUpperCase();

    // Skip check if no fiscal code provided
    if (!fc || fc === "") return result;

    const errors = [...result.errors];

    // Check against existing database records
    if (existingSet.has(fc)) {
      errors.push({
        field: "fiscalCode",
        message: "Codice fiscale già presente nel sistema",
      });
    }

    // Check for duplicates within the import batch
    if (seenInBatch.has(fc)) {
      errors.push({
        field: "fiscalCode",
        message: `Codice fiscale duplicato (riga ${seenInBatch.get(fc)! + 1})`,
      });
    } else {
      seenInBatch.set(fc, result.rowIndex);
    }

    return {
      ...result,
      errors,
      isValid: errors.length === 0,
    };
  });
}
