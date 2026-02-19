import Papa from "papaparse";
import * as XLSX from "xlsx";
import { contractImportRowSchema } from "@/lib/schemas/contract-import";
import type {
  ContractImportValidation,
  ValidatedContractRow,
} from "@/lib/schemas/contract-import";
import type { ParsedData, ColumnMapping } from "@/types/import";

// ---------------------------------------------------------------------------
// Column aliases for auto-mapping headers
// ---------------------------------------------------------------------------

const COLUMN_ALIASES: Record<string, string[]> = {
  contractNumber: [
    "numero contratto",
    "numero_contratto",
    "contract_number",
    "contract number",
    "nr contratto",
    "n. contratto",
    "codice contratto",
    "contratto",
  ],
  licensePlate: [
    "targa",
    "plate",
    "license_plate",
    "license plate",
    "licenseplate",
    "numero targa",
    "nr targa",
  ],
  contractType: [
    "tipo contratto",
    "tipo_contratto",
    "contract_type",
    "contract type",
    "tipo",
    "tipologia",
  ],
  supplier: [
    "fornitore",
    "supplier",
    "societa noleggio",
    "societa",
    "noleggiatore",
  ],
  startDate: [
    "data inizio",
    "data_inizio",
    "start_date",
    "start date",
    "inizio",
    "dal",
  ],
  endDate: [
    "data fine",
    "data_fine",
    "end_date",
    "end date",
    "fine",
    "al",
    "scadenza",
  ],
  monthlyRate: [
    "canone",
    "canone mensile",
    "monthly_rate",
    "monthly rate",
    "rata",
    "rata mensile",
    "importo mensile",
  ],
  franchiseKm: [
    "km franchigia",
    "km_franchigia",
    "franchise_km",
    "franchise km",
    "franchigia",
    "km inclusi",
    "km contratto",
  ],
};

// ---------------------------------------------------------------------------
// Contract type mapping
// ---------------------------------------------------------------------------

const CONTRACT_TYPE_MAP: Record<string, string> = {
  "lungo termine": "LUNGO_TERMINE",
  lungo_termine: "LUNGO_TERMINE",
  nlt: "LUNGO_TERMINE",
  "noleggio lungo termine": "LUNGO_TERMINE",
  "long term": "LUNGO_TERMINE",
  "breve termine": "BREVE_TERMINE",
  breve_termine: "BREVE_TERMINE",
  nbt: "BREVE_TERMINE",
  "noleggio breve termine": "BREVE_TERMINE",
  "short term": "BREVE_TERMINE",
  proprietario: "PROPRIETARIO",
  proprieta: "PROPRIETARIO",
  "di proprieta": "PROPRIETARIO",
  owned: "PROPRIETARIO",
  "leasing finanziario": "LEASING_FINANZIARIO",
  leasing_finanziario: "LEASING_FINANZIARIO",
  leasing: "LEASING_FINANZIARIO",
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

export function normalizeLicensePlate(plate: string): string {
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

function mapContractType(value: string): string | null {
  const normalized = value.trim().toLowerCase();
  if (normalized in CONTRACT_TYPE_MAP) {
    return CONTRACT_TYPE_MAP[normalized];
  }
  const upperValue = value.trim().toUpperCase().replace(/[\s-]/g, "_");
  const validTypes = [
    "LUNGO_TERMINE",
    "BREVE_TERMINE",
    "PROPRIETARIO",
    "LEASING_FINANZIARIO",
  ];
  if (validTypes.includes(upperValue)) {
    return upperValue;
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
  vehiclePlateMap: Map<string, number>,
  supplierNameMap: Map<string, number>
): ContractImportValidation[] {
  return rows.map((row, rowIndex) => {
    const data: Record<string, string> = {};
    const errors: { field: string; message: string }[] = [];
    const warnings: string[] = [];

    for (const [field, colIndex] of Object.entries(mapping)) {
      const value = row[colIndex]?.trim() ?? "";
      data[field] = value;
    }

    // Step 1: Basic Zod validation
    const zodResult = contractImportRowSchema.safeParse(data);
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

    // Step 3: Map contract type
    const resolvedContractType = mapContractType(data.contractType || "");
    if (!resolvedContractType) {
      errors.push({
        field: "contractType",
        message: `Tipo contratto "${data.contractType}" non riconosciuto. Valori accettati: Lungo Termine, Breve Termine, Proprietario, Leasing Finanziario`,
      });
    }

    // Step 4: Resolve supplier (optional)
    let supplierId: number | null = null;
    const supplierName = data.supplier?.trim() || null;
    if (supplierName) {
      const normalizedName = supplierName.toLowerCase();
      supplierId = supplierNameMap.get(normalizedName) ?? null;
      if (!supplierId) {
        warnings.push(`Fornitore "${supplierName}" non trovato nel sistema`);
      }
    }

    // Step 5: Parse start date
    const parsedStartDate = parseImportDate(data.startDate || "");
    if (!parsedStartDate) {
      errors.push({
        field: "startDate",
        message: `Data inizio "${data.startDate}" non valida. Formati accettati: gg/mm/aaaa, gg-mm-aaaa, aaaa-mm-gg`,
      });
    }

    // Step 6: Parse end date (optional)
    let parsedEndDate: Date | null = null;
    if (data.endDate?.trim()) {
      parsedEndDate = parseImportDate(data.endDate);
      if (!parsedEndDate) {
        errors.push({
          field: "endDate",
          message: `Data fine "${data.endDate}" non valida`,
        });
      } else if (parsedStartDate && parsedEndDate < parsedStartDate) {
        errors.push({
          field: "endDate",
          message: "La data fine non puo essere precedente alla data inizio",
        });
      }
    }

    // Step 7: Parse monthly rate (optional)
    let monthlyRate: number | null = null;
    if (data.monthlyRate?.trim()) {
      monthlyRate = parseNumber(data.monthlyRate, config.numberFormat);
      if (monthlyRate === null || monthlyRate < 0) {
        errors.push({
          field: "monthlyRate",
          message: "Il canone deve essere un numero non negativo",
        });
        monthlyRate = null;
      }
    }

    // Step 8: Parse franchise km (optional)
    let franchiseKm: number | null = null;
    if (data.franchiseKm?.trim()) {
      franchiseKm = parseNumber(data.franchiseKm, config.numberFormat);
      if (franchiseKm === null || franchiseKm < 0) {
        errors.push({
          field: "franchiseKm",
          message: "I km franchigia devono essere un numero non negativo",
        });
        franchiseKm = null;
      } else {
        franchiseKm = Math.round(franchiseKm);
      }
    }

    const isValid = errors.length === 0;

    const resolved: ValidatedContractRow | undefined =
      isValid && vehicleId && resolvedContractType && parsedStartDate
        ? {
            contractNumber: data.contractNumber?.trim() || "",
            vehicleId,
            licensePlate: normalizedPlate,
            contractType: resolvedContractType,
            supplierId,
            supplierName,
            startDate: parsedStartDate,
            endDate: parsedEndDate,
            monthlyRate,
            franchiseKm,
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
