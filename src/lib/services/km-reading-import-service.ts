import Papa from "papaparse";
import * as XLSX from "xlsx";
import { kmReadingImportRowSchema } from "@/lib/schemas/km-reading-import";
import type {
  KmReadingImportValidation,
  ValidatedKmReadingRow,
} from "@/lib/schemas/km-reading-import";
import type { ParsedData, ColumnMapping } from "@/types/import";

// ---------------------------------------------------------------------------
// Column aliases for auto-mapping headers
// ---------------------------------------------------------------------------

const COLUMN_ALIASES: Record<string, string[]> = {
  licensePlate: [
    "targa",
    "plate",
    "license_plate",
    "license plate",
    "licenseplate",
    "numero targa",
    "nr targa",
  ],
  date: [
    "data rilevamento",
    "data_rilevamento",
    "data rilevazione",
    "data",
    "date",
    "giorno",
    "data lettura",
  ],
  odometerKm: [
    "km rilevati",
    "km_rilevati",
    "km",
    "chilometri",
    "odometro",
    "odometer",
    "odometer_km",
    "contachilometri",
    "mileage",
    "lettura km",
    "kilometri",
  ],
  assignee: [
    "assegnatario",
    "dipendente",
    "employee",
    "rilevatore",
    "operatore",
  ],
  source: [
    "fonte",
    "source",
    "origine",
    "provenienza",
    "tipo rilevazione",
  ],
};

// ---------------------------------------------------------------------------
// Source mapping
// ---------------------------------------------------------------------------

const SOURCE_MAP: Record<string, string> = {
  manuale: "MANUAL",
  manual: "MANUAL",
  gps: "GPS",
  telematica: "TELEMATICA",
  telematics: "TELEMATICA",
  fattura: "FATTURA",
  invoice: "FATTURA",
  import: "IMPORT_CSV",
  import_csv: "IMPORT_CSV",
  csv: "IMPORT_CSV",
};

// ---------------------------------------------------------------------------
// Public: detect file type
// ---------------------------------------------------------------------------

export function detectFileType(fileName: string): "csv" | "excel" {
  const ext = fileName.toLowerCase().split(".").pop();
  if (ext === "xlsx" || ext === "xls") return "excel";
  return "csv";
}

// ---------------------------------------------------------------------------
// Public: parse CSV content
// ---------------------------------------------------------------------------

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

  const colCount = allRows[0].length;
  const headers = Array.from({ length: colCount }, (_, i) => `Colonna ${i + 1}`);
  return { headers, rows: allRows };
}

// ---------------------------------------------------------------------------
// Public: parse Excel file
// ---------------------------------------------------------------------------

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
  const rows = jsonData
    .slice(1)
    .map((row) => row.map((cell: unknown) => String(cell ?? "").trim()));

  const filteredRows = rows.filter((row) =>
    row.some((cell) => cell.length > 0)
  );

  return { headers, rows: filteredRows };
}

// ---------------------------------------------------------------------------
// Public: auto-map columns
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Parse helpers
// ---------------------------------------------------------------------------

function normalizeLicensePlate(plate: string): string {
  return plate.trim().toUpperCase().replace(/[\s\-]/g, "");
}

function parseImportDate(value: string): Date | null {
  const trimmed = value.trim();
  if (trimmed === "") return null;

  const dmyMatch = trimmed.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
  if (dmyMatch) {
    const [, day, month, year] = dmyMatch;
    const d = new Date(Number(year), Number(month) - 1, Number(day));
    if (!isNaN(d.getTime())) return d;
  }

  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    const d = new Date(Number(year), Number(month) - 1, Number(day));
    if (!isNaN(d.getTime())) return d;
  }

  const dmyShortMatch = trimmed.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2})$/);
  if (dmyShortMatch) {
    const [, day, month, shortYear] = dmyShortMatch;
    const fullYear =
      Number(shortYear) > 50
        ? 1900 + Number(shortYear)
        : 2000 + Number(shortYear);
    const d = new Date(fullYear, Number(month) - 1, Number(day));
    if (!isNaN(d.getTime())) return d;
  }

  return null;
}

function parseNumber(value: string, format: "IT" | "EN"): number | null {
  const trimmed = value.trim();
  if (trimmed === "") return null;

  let normalized: string;
  if (format === "IT") {
    normalized = trimmed.replace(/\./g, "").replace(",", ".");
  } else {
    normalized = trimmed.replace(/,/g, "");
  }

  const num = Number(normalized);
  return isNaN(num) ? null : num;
}

function mapSource(value: string): string {
  const normalized = value.trim().toLowerCase();
  return SOURCE_MAP[normalized] ?? "IMPORT_CSV";
}

// ---------------------------------------------------------------------------
// Public: validate import rows
// ---------------------------------------------------------------------------

export function validateImportRows(
  rows: string[][],
  mapping: ColumnMapping,
  _headers: string[],
  config: { numberFormat: "IT" | "EN" },
  vehiclePlateMap: Map<string, number>
): KmReadingImportValidation[] {
  return rows.map((row, rowIndex) => {
    const data: Record<string, string> = {};
    const errors: { field: string; message: string }[] = [];
    const warnings: string[] = [];

    for (const [field, colIndex] of Object.entries(mapping)) {
      const value = row[colIndex]?.trim() ?? "";
      data[field] = value;
    }

    // Step 1: Basic Zod validation
    const zodResult = kmReadingImportRowSchema.safeParse(data);
    if (!zodResult.success) {
      const zodErrors = zodResult.error.issues.map((issue) => ({
        field: issue.path.join(".") || "generale",
        message: issue.message,
      }));
      return {
        rowIndex,
        data,
        errors: zodErrors,
        warnings: [],
        isValid: false,
      };
    }

    // Step 2: Resolve license plate
    const normalizedPlate = normalizeLicensePlate(data.licensePlate || "");
    const vehicleId = vehiclePlateMap.get(normalizedPlate);
    if (!vehicleId) {
      errors.push({
        field: "licensePlate",
        message: `Targa "${data.licensePlate}" non trovata nella flotta`,
      });
    }

    // Step 3: Parse and validate date
    const parsedDate = parseImportDate(data.date || "");
    if (!parsedDate) {
      errors.push({
        field: "date",
        message: `Data "${data.date}" non valida. Formati accettati: gg/mm/aaaa, gg-mm-aaaa, aaaa-mm-gg`,
      });
    } else if (parsedDate > new Date()) {
      errors.push({
        field: "date",
        message: "La data non puo essere nel futuro",
      });
    }

    // Step 4: Parse and validate odometer
    const odometerKm = parseNumber(data.odometerKm || "", config.numberFormat);
    if (odometerKm === null || odometerKm < 0) {
      errors.push({
        field: "odometerKm",
        message: "I km rilevati devono essere un numero non negativo",
      });
    } else if (!Number.isInteger(odometerKm)) {
      errors.push({
        field: "odometerKm",
        message: "I km rilevati devono essere un numero intero",
      });
    } else if (odometerKm > 999999) {
      warnings.push(`Km molto elevati: ${odometerKm} (verificare il valore)`);
    }

    // Step 5: Map source
    const resolvedSource = data.source?.trim()
      ? mapSource(data.source)
      : "IMPORT_CSV";

    const isValid = errors.length === 0;

    const resolved: ValidatedKmReadingRow | undefined =
      isValid && vehicleId && parsedDate && odometerKm !== null
        ? {
            vehicleId,
            licensePlate: normalizedPlate,
            date: parsedDate,
            odometerKm: Math.round(odometerKm),
            source: resolvedSource,
            warnings,
          }
        : undefined;

    return {
      rowIndex,
      data,
      errors,
      warnings,
      isValid,
      resolved,
    };
  });
}
