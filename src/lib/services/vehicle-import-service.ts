import Papa from "papaparse";
import * as XLSX from "xlsx";
import { vehicleImportRowSchema } from "@/lib/schemas/vehicle-import";
import type {
  VehicleImportValidation,
  ValidatedVehicleRow,
} from "@/lib/schemas/vehicle-import";
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
  marca: [
    "marca",
    "brand",
    "make",
    "costruttore",
    "casa",
  ],
  modello: [
    "modello",
    "model",
    "denominazione",
    "nome modello",
  ],
  allestimento: [
    "allestimento",
    "trim",
    "versione",
    "variante",
    "allest",
  ],
  vin: [
    "telaio",
    "vin",
    "numero telaio",
    "nr telaio",
    "chassis",
    "frame",
  ],
  registrationDate: [
    "data immatricolazione",
    "data_immatricolazione",
    "immatricolazione",
    "registration_date",
    "registration date",
    "data registrazione",
    "data",
    "date",
  ],
  fuelType: [
    "tipo alimentazione",
    "tipo_alimentazione",
    "alimentazione",
    "fuel_type",
    "fuel type",
    "fueltype",
    "carburante",
    "tipo carburante",
  ],
  status: [
    "stato",
    "status",
    "state",
  ],
};

// ---------------------------------------------------------------------------
// Fuel type mapping (flexible, case-insensitive, Italian variants)
// ---------------------------------------------------------------------------

const FUEL_TYPE_MAP: Record<string, string> = {
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
  gasolio: "DIESEL",
  nafta: "DIESEL",
  "gas naturale": "METANO",
  cng: "METANO",
  elettrica: "ELETTRICO",
  "ibrido benzina": "IBRIDO_BENZINA",
  "ibrida benzina": "IBRIDO_BENZINA",
  "ibrido diesel": "IBRIDO_DIESEL",
  "ibrida diesel": "IBRIDO_DIESEL",
  "bifuel benzina gpl": "BIFUEL_BENZINA_GPL",
  "benzina/gpl": "BIFUEL_BENZINA_GPL",
  "benzina gpl": "BIFUEL_BENZINA_GPL",
  "bifuel benzina metano": "BIFUEL_BENZINA_METANO",
  "benzina/metano": "BIFUEL_BENZINA_METANO",
  "benzina metano": "BIFUEL_BENZINA_METANO",
  petrol: "BENZINA",
  gasoline: "BENZINA",
  lpg: "GPL",
  "natural gas": "METANO",
  electric: "ELETTRICO",
  hydrogen: "IDROGENO",
};

// ---------------------------------------------------------------------------
// Vehicle status mapping
// ---------------------------------------------------------------------------

const VEHICLE_STATUS_MAP: Record<string, string> = {
  attivo: "ACTIVE",
  active: "ACTIVE",
  inattivo: "INACTIVE",
  inactive: "INACTIVE",
  dismesso: "DISPOSED",
  disposed: "DISPOSED",
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
// Public: normalize license plate for matching
// ---------------------------------------------------------------------------

export function normalizeLicensePlate(plate: string): string {
  return plate.trim().toUpperCase().replace(/[\s\-]/g, "");
}

// ---------------------------------------------------------------------------
// Parse date from various Italian formats
// ---------------------------------------------------------------------------

export function parseImportDate(value: string): Date | null {
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

// ---------------------------------------------------------------------------
// Map fuel type from string
// ---------------------------------------------------------------------------

export function mapImportFuelType(value: string): string | null {
  const normalized = value.trim().toLowerCase();

  if (normalized in FUEL_TYPE_MAP) {
    return FUEL_TYPE_MAP[normalized];
  }

  const upperValue = value.trim().toUpperCase().replace(/[\s-]/g, "_");
  if (Object.values(FUEL_TYPE_MAP).includes(upperValue)) {
    return upperValue;
  }

  return null;
}

// ---------------------------------------------------------------------------
// Map vehicle status from string
// ---------------------------------------------------------------------------

function mapVehicleStatus(value: string): string {
  const normalized = value.trim().toLowerCase();
  return VEHICLE_STATUS_MAP[normalized] ?? "ACTIVE";
}

// ---------------------------------------------------------------------------
// Public: validate import rows
// ---------------------------------------------------------------------------

export function validateImportRows(
  rows: string[][],
  mapping: ColumnMapping,
  _headers: string[],
  existingPlates: Set<string>
): VehicleImportValidation[] {
  const seenPlates = new Set<string>();

  return rows.map((row, rowIndex) => {
    const data: Record<string, string> = {};
    const errors: { field: string; message: string }[] = [];
    const warnings: string[] = [];

    // Extract mapped fields from row
    for (const [field, colIndex] of Object.entries(mapping)) {
      const value = row[colIndex]?.trim() ?? "";
      data[field] = value;
    }

    // Step 1: Basic Zod validation
    const zodResult = vehicleImportRowSchema.safeParse(data);
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

    // Step 2: Check duplicate license plate in tenant
    const normalizedPlate = normalizeLicensePlate(data.licensePlate || "");
    if (existingPlates.has(normalizedPlate)) {
      errors.push({
        field: "licensePlate",
        message: `Targa "${data.licensePlate}" gia presente nella flotta (duplicato)`,
      });
    }

    // Step 3: Check duplicate within import file
    if (seenPlates.has(normalizedPlate)) {
      errors.push({
        field: "licensePlate",
        message: `Targa "${data.licensePlate}" duplicata nel file di importazione`,
      });
    }
    seenPlates.add(normalizedPlate);

    // Step 4: Parse and validate registration date
    const parsedDate = parseImportDate(data.registrationDate || "");
    if (!parsedDate) {
      errors.push({
        field: "registrationDate",
        message: `Data "${data.registrationDate}" non valida. Formati accettati: gg/mm/aaaa, gg-mm-aaaa, aaaa-mm-gg`,
      });
    } else if (parsedDate > new Date()) {
      warnings.push("La data di immatricolazione e nel futuro");
    }

    // Step 5: Validate fuel type
    const resolvedFuelType = mapImportFuelType(data.fuelType || "");
    if (!resolvedFuelType) {
      errors.push({
        field: "fuelType",
        message: `Tipo alimentazione "${data.fuelType}" non riconosciuto`,
      });
    }

    // Step 6: Map status
    const resolvedStatus = data.status
      ? mapVehicleStatus(data.status)
      : "ACTIVE";

    // Build result
    const isValid = errors.length === 0;

    const resolved: ValidatedVehicleRow | undefined =
      isValid && parsedDate && resolvedFuelType
        ? {
            licensePlate: normalizedPlate,
            marca: data.marca?.trim() || "",
            modello: data.modello?.trim() || "",
            allestimento: data.allestimento?.trim() || null,
            vin: data.vin?.trim() || null,
            registrationDate: parsedDate,
            fuelType: resolvedFuelType,
            status: resolvedStatus,
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
