import Papa from "papaparse";
import * as XLSX from "xlsx";
import { fuelCardImportRowSchema } from "@/lib/schemas/fuel-card-import";
import type {
  FuelCardImportValidation,
  ValidatedFuelCardRow,
} from "@/lib/schemas/fuel-card-import";
import type { ParsedData, ColumnMapping } from "@/types/import";

// ---------------------------------------------------------------------------
// Column aliases for auto-mapping headers
// ---------------------------------------------------------------------------

const COLUMN_ALIASES: Record<string, string[]> = {
  cardNumber: [
    "numero carta",
    "numero_carta",
    "card_number",
    "card number",
    "nr carta",
    "n. carta",
    "codice carta",
    "carta",
  ],
  issuer: [
    "emittente",
    "issuer",
    "circuito",
    "ente emittente",
    "societa emittente",
  ],
  supplier: [
    "fornitore",
    "supplier",
    "societa",
    "compagnia",
  ],
  expiryDate: [
    "data scadenza",
    "data_scadenza",
    "expiry_date",
    "expiry date",
    "scadenza",
  ],
  licensePlate: [
    "targa assegnata",
    "targa_assegnata",
    "targa",
    "plate",
    "license_plate",
    "license plate",
    "veicolo",
  ],
  employeeName: [
    "dipendente assegnato",
    "dipendente_assegnato",
    "dipendente",
    "employee",
    "assegnatario",
    "nome dipendente",
  ],
  assignmentType: [
    "tipo assegnazione",
    "tipo_assegnazione",
    "assignment_type",
    "assignment type",
    "tipo",
  ],
};

// ---------------------------------------------------------------------------
// Assignment type mapping
// ---------------------------------------------------------------------------

const ASSIGNMENT_TYPE_MAP: Record<string, string> = {
  veicolo: "VEHICLE",
  vehicle: "VEHICLE",
  dipendente: "EMPLOYEE",
  employee: "EMPLOYEE",
  jolly: "JOLLY",
  pool: "JOLLY",
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

function mapAssignmentType(value: string): string {
  const normalized = value.trim().toLowerCase();
  return ASSIGNMENT_TYPE_MAP[normalized] ?? "VEHICLE";
}

// ---------------------------------------------------------------------------
// Public: validate import rows
// ---------------------------------------------------------------------------

export function validateImportRows(
  rows: string[][],
  mapping: ColumnMapping,
  _headers: string[],
  existingCardNumbers: Set<string>,
  vehiclePlateMap: Map<string, number>,
  employeeNameMap: Map<string, number>,
  supplierNameMap: Map<string, number>
): FuelCardImportValidation[] {
  const seenCards = new Set<string>();

  return rows.map((row, rowIndex) => {
    const data: Record<string, string> = {};
    const errors: { field: string; message: string }[] = [];
    const warnings: string[] = [];

    for (const [field, colIndex] of Object.entries(mapping)) {
      const value = row[colIndex]?.trim() ?? "";
      data[field] = value;
    }

    // Step 1: Basic Zod validation
    const zodResult = fuelCardImportRowSchema.safeParse(data);
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

    // Step 2: Check duplicate card number
    const normalizedCardNumber = data.cardNumber?.trim().toUpperCase() || "";
    if (existingCardNumbers.has(normalizedCardNumber)) {
      errors.push({
        field: "cardNumber",
        message: `Numero carta "${data.cardNumber}" gia presente nel sistema (duplicato)`,
      });
    }
    if (seenCards.has(normalizedCardNumber)) {
      errors.push({
        field: "cardNumber",
        message: `Numero carta "${data.cardNumber}" duplicato nel file di importazione`,
      });
    }
    seenCards.add(normalizedCardNumber);

    // Step 3: Parse expiry date (optional)
    let expiryDate: Date | null = null;
    if (data.expiryDate?.trim()) {
      expiryDate = parseImportDate(data.expiryDate);
      if (!expiryDate) {
        warnings.push(`Data scadenza "${data.expiryDate}" non valida, verra ignorata`);
      }
    }

    // Step 4: Resolve vehicle (optional)
    let assignedVehicleId: number | null = null;
    if (data.licensePlate?.trim()) {
      const normalizedPlate = normalizeLicensePlate(data.licensePlate);
      assignedVehicleId = vehiclePlateMap.get(normalizedPlate) ?? null;
      if (!assignedVehicleId) {
        warnings.push(`Targa "${data.licensePlate}" non trovata nella flotta`);
      }
    }

    // Step 5: Resolve employee (optional)
    let assignedEmployeeId: number | null = null;
    if (data.employeeName?.trim()) {
      const normalizedName = data.employeeName.trim().toLowerCase();
      assignedEmployeeId = employeeNameMap.get(normalizedName) ?? null;
      if (!assignedEmployeeId) {
        warnings.push(`Dipendente "${data.employeeName}" non trovato nel sistema`);
      }
    }

    // Step 6: Resolve supplier (optional)
    let supplierId: number | null = null;
    if (data.supplier?.trim()) {
      const normalizedSupplier = data.supplier.trim().toLowerCase();
      supplierId = supplierNameMap.get(normalizedSupplier) ?? null;
      if (!supplierId) {
        warnings.push(`Fornitore "${data.supplier}" non trovato nel sistema`);
      }
    }

    // Step 7: Map assignment type
    const assignmentType = data.assignmentType?.trim()
      ? mapAssignmentType(data.assignmentType)
      : assignedVehicleId
        ? "VEHICLE"
        : assignedEmployeeId
          ? "EMPLOYEE"
          : "JOLLY";

    const isValid = errors.length === 0;

    const resolved: ValidatedFuelCardRow | undefined = isValid
      ? {
          cardNumber: data.cardNumber?.trim() || "",
          issuer: data.issuer?.trim() || "",
          supplierId,
          expiryDate,
          assignedVehicleId,
          assignedEmployeeId,
          assignmentType,
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
