import Papa from "papaparse";
import * as XLSX from "xlsx";
import { fuelRecordImportRowSchema } from "@/lib/schemas/fuel-record-import";
import type {
  FuelRecordImportConfig,
  FuelRecordImportValidation,
  ValidatedFuelRecordRow,
} from "@/lib/schemas/fuel-record-import";
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
    "data",
    "date",
    "data rifornimento",
    "data_rifornimento",
    "giorno",
  ],
  fuelType: [
    "tipo carburante",
    "tipo_carburante",
    "carburante",
    "fuel_type",
    "fuel type",
    "fueltype",
    "alimentazione",
    "tipo",
  ],
  quantityLiters: [
    "quantita",
    "quantità",
    "litri",
    "quantity",
    "quantity_liters",
    "quantita (l)",
    "quantità (l)",
    "lt",
    "liters",
    "litres",
  ],
  amountEur: [
    "importo",
    "importo (eur)",
    "importo eur",
    "amount",
    "amount_eur",
    "costo",
    "prezzo",
    "totale",
    "euro",
    "eur",
  ],
  odometerKm: [
    "km",
    "chilometri",
    "odometro",
    "odometer",
    "odometer_km",
    "kilometri",
    "contachilometri",
    "mileage",
  ],
  notes: [
    "note",
    "notes",
    "commenti",
    "commento",
    "osservazioni",
    "descrizione",
  ],
};

// ---------------------------------------------------------------------------
// Fuel type mapping (flexible, case-insensitive, Italian variants)
// ---------------------------------------------------------------------------

const FUEL_TYPE_MAP: Record<string, string> = {
  // Direct matches (lowercase)
  benzina: "BENZINA",
  diesel: "DIESEL",
  gpl: "GPL",
  metano: "METANO",
  elettrico: "ELETTRICO",
  ibrido_benzina: "IBRIDO_BENZINA",
  ibrido_diesel: "IBRIDO_DIESEL",
  idrogeno: "IDROGENO",
  bifuel_benzina_gpl: "BIFUEL_BENZINA_GPL",
  bifuel_benzina_metano: "BIFUEL_BENZINA_METANO",

  // Italian variants
  gasolio: "DIESEL",
  nafta: "DIESEL",
  "gas naturale": "METANO",
  cng: "METANO",
  "gas metano": "METANO",
  elettrica: "ELETTRICO",
  elettr: "ELETTRICO",
  "ibrido benzina": "IBRIDO_BENZINA",
  "ibrida benzina": "IBRIDO_BENZINA",
  "hybrid petrol": "IBRIDO_BENZINA",
  "ibrido diesel": "IBRIDO_DIESEL",
  "ibrida diesel": "IBRIDO_DIESEL",
  "hybrid diesel": "IBRIDO_DIESEL",
  "bifuel benzina gpl": "BIFUEL_BENZINA_GPL",
  "benzina/gpl": "BIFUEL_BENZINA_GPL",
  "benzina gpl": "BIFUEL_BENZINA_GPL",
  "bifuel benzina metano": "BIFUEL_BENZINA_METANO",
  "benzina/metano": "BIFUEL_BENZINA_METANO",
  "benzina metano": "BIFUEL_BENZINA_METANO",

  // English variants
  petrol: "BENZINA",
  gasoline: "BENZINA",
  lpg: "GPL",
  "natural gas": "METANO",
  electric: "ELETTRICO",
  hydrogen: "IDROGENO",
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
  const headers = Array.from(
    { length: colCount },
    (_, i) => `Colonna ${i + 1}`
  );
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

  // Remove completely empty rows
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
// Public: suggest separator from file content
// ---------------------------------------------------------------------------

export function suggestSeparator(
  content: string
): ";" | "," | "\t" {
  // Check first few lines (up to 5)
  const lines = content.split("\n").slice(0, 5);
  const counts = { ";": 0, ",": 0, "\t": 0 };

  for (const line of lines) {
    counts[";"] += (line.match(/;/g) || []).length;
    counts[","] += (line.match(/,/g) || []).length;
    counts["\t"] += (line.match(/\t/g) || []).length;
  }

  // Prefer semicolon for Italian locale if counts are equal or close
  if (counts[";"] >= counts[","] && counts[";"] > 0) return ";";
  if (counts[","] > counts[";"] && counts[","] > 0) return ",";
  if (counts["\t"] > 0) return "\t";

  return ";"; // Default for Italian CSV
}

// ---------------------------------------------------------------------------
// Public: map fuel type from string
// ---------------------------------------------------------------------------

export function mapImportFuelType(value: string): string | null {
  const normalized = value.trim().toLowerCase();

  // Direct lookup in map
  if (normalized in FUEL_TYPE_MAP) {
    return FUEL_TYPE_MAP[normalized];
  }

  // Try matching the value directly (case-insensitive, uppercase with underscores)
  const upperValue = value.trim().toUpperCase().replace(/[\s-]/g, "_");
  if (Object.values(FUEL_TYPE_MAP).includes(upperValue)) {
    return upperValue;
  }

  return null;
}

// ---------------------------------------------------------------------------
// Public: normalize license plate for matching
// ---------------------------------------------------------------------------

export function normalizeLicensePlate(plate: string): string {
  return plate.trim().toUpperCase().replace(/[\s\-]/g, "");
}

// ---------------------------------------------------------------------------
// Parse Italian/English number format
// ---------------------------------------------------------------------------

export function parseNumber(
  value: string,
  format: "IT" | "EN"
): number | null {
  const trimmed = value.trim();
  if (trimmed === "") return null;

  let normalized: string;

  if (format === "IT") {
    // Italian: 1.234,56 -> 1234.56
    // Remove thousands separator (.)
    // Replace decimal separator (,) with .
    normalized = trimmed.replace(/\./g, "").replace(",", ".");
  } else {
    // English: 1,234.56 -> 1234.56
    // Remove thousands separator (,)
    normalized = trimmed.replace(/,/g, "");
  }

  const num = Number(normalized);
  return isNaN(num) ? null : num;
}

// ---------------------------------------------------------------------------
// Parse date from various Italian formats
// ---------------------------------------------------------------------------

export function parseImportDate(value: string): Date | null {
  const trimmed = value.trim();
  if (trimmed === "") return null;

  // Try dd/mm/yyyy or dd-mm-yyyy
  const dmyMatch = trimmed.match(
    /^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/
  );
  if (dmyMatch) {
    const [, day, month, year] = dmyMatch;
    const d = new Date(Number(year), Number(month) - 1, Number(day));
    if (!isNaN(d.getTime())) return d;
  }

  // Try yyyy-mm-dd (ISO)
  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    const d = new Date(Number(year), Number(month) - 1, Number(day));
    if (!isNaN(d.getTime())) return d;
  }

  // Try dd/mm/yy
  const dmyShortMatch = trimmed.match(
    /^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2})$/
  );
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

// ---------------------------------------------------------------------------
// Public: validate import rows
// ---------------------------------------------------------------------------

export function validateImportRows(
  rows: string[][],
  mapping: ColumnMapping,
  _headers: string[],
  config: { numberFormat: "IT" | "EN" },
  vehiclePlateMap: Map<string, number> // normalized plate -> vehicleId
): FuelRecordImportValidation[] {
  return rows.map((row, rowIndex) => {
    const data: Record<string, string> = {};
    const errors: { field: string; message: string }[] = [];
    const warnings: string[] = [];

    // Extract mapped fields from row
    for (const [field, colIndex] of Object.entries(mapping)) {
      const value = row[colIndex]?.trim() ?? "";
      data[field] = value;
    }

    // Step 1: Basic Zod validation (checks required fields)
    const zodResult = fuelRecordImportRowSchema.safeParse(data);
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

    // Step 2: Resolve license plate to vehicleId
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

    // Step 4: Parse and validate fuel type
    const resolvedFuelType = mapImportFuelType(data.fuelType || "");
    if (!resolvedFuelType) {
      errors.push({
        field: "fuelType",
        message: `Tipo carburante "${data.fuelType}" non riconosciuto`,
      });
    }

    // Step 5: Parse and validate quantity
    const quantityLiters = parseNumber(
      data.quantityLiters || "",
      config.numberFormat
    );
    if (quantityLiters === null || quantityLiters <= 0) {
      errors.push({
        field: "quantityLiters",
        message: "La quantita deve essere un numero positivo",
      });
    } else if (quantityLiters > 200) {
      warnings.push(
        `Quantita elevata: ${quantityLiters} litri (verificare il valore)`
      );
    }

    // Step 6: Parse and validate amount
    const amountEur = parseNumber(data.amountEur || "", config.numberFormat);
    if (amountEur === null || amountEur <= 0) {
      errors.push({
        field: "amountEur",
        message: "L'importo deve essere un numero positivo",
      });
    } else if (amountEur > 500) {
      warnings.push(
        `Importo elevato: ${amountEur} EUR (verificare il valore)`
      );
    }

    // Step 7: Parse and validate odometer
    const odometerKm = parseNumber(data.odometerKm || "", config.numberFormat);
    if (odometerKm === null || odometerKm < 0) {
      errors.push({
        field: "odometerKm",
        message: "Il chilometraggio deve essere un numero non negativo",
      });
    } else if (!Number.isInteger(odometerKm)) {
      errors.push({
        field: "odometerKm",
        message: "Il chilometraggio deve essere un numero intero",
      });
    }

    // Build result
    const isValid = errors.length === 0;

    const resolved: ValidatedFuelRecordRow | undefined =
      isValid && vehicleId && parsedDate && resolvedFuelType && quantityLiters && amountEur && odometerKm !== null
        ? {
            vehicleId,
            licensePlate: normalizedPlate,
            date: parsedDate,
            fuelType: resolvedFuelType,
            quantityLiters,
            amountEur,
            odometerKm: Math.round(odometerKm),
            notes: data.notes?.trim() || null,
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
