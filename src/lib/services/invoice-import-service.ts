import { createHash } from "crypto";
import type { PrismaClientWithTenant } from "@/lib/db/client";
import type {
  TemplateConfig,
  MatchingTolerances,
  ExtractionResult,
} from "@/types/xml-template";
import { DEFAULT_MATCHING_CONFIG } from "@/types/xml-template";
import { extractLinesFromXml } from "./xml-parser-service";
import {
  matchInvoiceLines,
  type MatchingResult,
} from "./invoice-matching-service";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type InvoiceImportWithLines = {
  id: string;
  tenantId: string;
  templateId: string;
  userId: string;
  fileName: string;
  fileHash: string | null;
  supplierVatNumber: string | null;
  invoiceNumber: string | null;
  invoiceDate: Date | null;
  status: string;
  totalLinesExtracted: number;
  totalLinesMatched: number;
  totalLinesCreated: number;
  totalLinesSkipped: number;
  totalLinesError: number;
  requireManualConfirm: boolean;
  processingLog: string | null;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
  template: {
    id: string;
    name: string;
    supplier: { id: string; name: string };
  };
  lines: ImportLineWithMatch[];
};

export type ImportLineWithMatch = {
  id: string;
  lineNumber: number;
  licensePlate: string | null;
  date: Date | null;
  fuelType: string | null;
  quantity: number | null;
  amount: number | null;
  cardNumber: string | null;
  odometerKm: number | null;
  description: string | null;
  matchStatus: string;
  matchedFuelRecordId: string | null;
  createdFuelRecordId: string | null;
  matchScore: number | null;
  matchDetails: string | null;
  resolvedVehicleId: string | null;
  extractionErrors: string | null;
};

// ---------------------------------------------------------------------------
// Prisma include pattern for import queries
// ---------------------------------------------------------------------------

const IMPORT_INCLUDE = {
  template: {
    select: {
      id: true,
      name: true,
      supplier: { select: { id: true, name: true } },
    },
  },
  lines: {
    orderBy: { lineNumber: "asc" as const },
  },
};

// ---------------------------------------------------------------------------
// Helper: parse a date string to a Date object (best-effort)
// ---------------------------------------------------------------------------

function parseDateString(value: string | null | undefined): Date | null {
  if (!value) return null;

  // Try ISO format first (yyyy-MM-dd or full ISO)
  const isoDate = new Date(value);
  if (!isNaN(isoDate.getTime())) return isoDate;

  // Try dd/MM/yyyy
  const ddMmYyyy = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (ddMmYyyy) {
    const [, dd, mm, yyyy] = ddMmYyyy;
    const parsed = new Date(`${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}T00:00:00`);
    if (!isNaN(parsed.getTime())) return parsed;
  }

  // Try dd-MM-yyyy
  const ddMmYyyyDash = value.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (ddMmYyyyDash) {
    const [, dd, mm, yyyy] = ddMmYyyyDash;
    const parsed = new Date(`${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}T00:00:00`);
    if (!isNaN(parsed.getTime())) return parsed;
  }

  // Try dd.MM.yy (ESSO format)
  const ddMmYy = value.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2})$/);
  if (ddMmYy) {
    const [, dd, mm, yy] = ddMmYy;
    const year = parseInt(yy, 10) >= 70 ? `19${yy}` : `20${yy}`;
    const parsed = new Date(`${year}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}T00:00:00`);
    if (!isNaN(parsed.getTime())) return parsed;
  }

  // Try dd.MM.yyyy
  const ddMmYyyyDot = value.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (ddMmYyyyDot) {
    const [, dd, mm, yyyy] = ddMmYyyyDot;
    const parsed = new Date(`${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}T00:00:00`);
    if (!isNaN(parsed.getTime())) return parsed;
  }

  return null;
}

// ---------------------------------------------------------------------------
// Helper: truncate string to max length (safety against DB column overflow)
// ---------------------------------------------------------------------------

function truncate(value: string | null | undefined, maxLen: number): string | null {
  if (!value) return null;
  return value.length > maxLen ? value.slice(0, maxLen) : value;
}

// ---------------------------------------------------------------------------
// Helper: map Prisma row to typed result
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toImportWithLines(row: any): InvoiceImportWithLines {
  return {
    id: row.id,
    tenantId: row.tenantId,
    templateId: row.templateId,
    userId: row.userId,
    fileName: row.fileName,
    fileHash: row.fileHash,
    supplierVatNumber: row.supplierVatNumber,
    invoiceNumber: row.invoiceNumber,
    invoiceDate: row.invoiceDate,
    status: row.status,
    totalLinesExtracted: row.totalLinesExtracted,
    totalLinesMatched: row.totalLinesMatched,
    totalLinesCreated: row.totalLinesCreated,
    totalLinesSkipped: row.totalLinesSkipped,
    totalLinesError: row.totalLinesError,
    requireManualConfirm: row.requireManualConfirm,
    processingLog: row.processingLog,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    completedAt: row.completedAt,
    template: row.template,
    lines: (row.lines ?? []).map(toImportLine),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toImportLine(row: any): ImportLineWithMatch {
  return {
    id: row.id,
    lineNumber: row.lineNumber,
    licensePlate: row.licensePlate,
    date: row.date,
    fuelType: row.fuelType,
    quantity: row.quantity,
    amount: row.amount,
    cardNumber: row.cardNumber,
    odometerKm: row.odometerKm,
    description: row.description,
    matchStatus: row.matchStatus,
    matchedFuelRecordId: row.matchedFuelRecordId,
    createdFuelRecordId: row.createdFuelRecordId,
    matchScore: row.matchScore,
    matchDetails: row.matchDetails,
    resolvedVehicleId: row.resolvedVehicleId,
    extractionErrors: row.extractionErrors,
  };
}

// ---------------------------------------------------------------------------
// 1. createImport
// ---------------------------------------------------------------------------

export async function createImport(
  prisma: PrismaClientWithTenant,
  data: {
    templateId: string;
    userId: string;
    fileName: string;
    xmlContent: string;
    requireManualConfirm?: boolean;
  }
): Promise<InvoiceImportWithLines> {
  const fileHash = createHash("sha256").update(data.xmlContent).digest("hex");

  const result = await prisma.invoiceImport.create({
    data: {
      tenantId: "", // Overwritten by tenant extension
      templateId: data.templateId,
      userId: data.userId,
      fileName: data.fileName,
      fileHash,
      status: "PENDING",
      requireManualConfirm: data.requireManualConfirm ?? false,
    },
    include: IMPORT_INCLUDE,
  });

  return toImportWithLines(result);
}

// ---------------------------------------------------------------------------
// 2. processImport
// ---------------------------------------------------------------------------

export async function processImport(
  prisma: PrismaClientWithTenant,
  importId: string,
  xmlContent: string,
  templateConfig: TemplateConfig,
  matchingConfig?: MatchingTolerances
): Promise<InvoiceImportWithLines> {
  const config = matchingConfig ?? DEFAULT_MATCHING_CONFIG;

  // Step 1: Extract lines from XML
  const extraction: ExtractionResult = extractLinesFromXml(
    xmlContent,
    templateConfig
  );

  const processingLog: string[] = [];

  if (!extraction.success) {
    processingLog.push(
      `Estrazione fallita: ${extraction.errors.join("; ")}`
    );

    const result = await prisma.invoiceImport.update({
      where: { id: importId },
      data: {
        status: "ERROR",
        totalLinesExtracted: 0,
        processingLog: processingLog.join("\n"),
      },
      include: IMPORT_INCLUDE,
    });

    return toImportWithLines(result);
  }

  if (extraction.errors.length > 0) {
    processingLog.push(
      `Avvisi estrazione: ${extraction.errors.join("; ")}`
    );
  }

  processingLog.push(
    `Estratte ${extraction.lines.length} righe (${extraction.filteredLines} filtrate)`
  );

  // Update invoice metadata if available
  const metadataUpdate: Record<string, unknown> = {};
  if (extraction.invoiceMetadata?.supplierVatNumber) {
    metadataUpdate.supplierVatNumber =
      extraction.invoiceMetadata.supplierVatNumber;
  }
  if (extraction.invoiceMetadata?.invoiceNumber) {
    metadataUpdate.invoiceNumber = extraction.invoiceMetadata.invoiceNumber;
  }
  if (extraction.invoiceMetadata?.invoiceDate) {
    const parsedDate = parseDateString(
      extraction.invoiceMetadata.invoiceDate
    );
    if (parsedDate) {
      metadataUpdate.invoiceDate = parsedDate;
    }
  }

  // Step 2: Retrieve the import to check requireManualConfirm
  const importRecord = await prisma.invoiceImport.findFirst({
    where: { id: importId },
    select: { requireManualConfirm: true },
  });
  const requireManualConfirm = importRecord?.requireManualConfirm ?? false;

  // Step 3: Run matching against existing fuel records
  const matchingResult: MatchingResult = await matchInvoiceLines(
    prisma,
    extraction.lines,
    config,
    requireManualConfirm
  );

  processingLog.push(
    `Matching completato: ${matchingResult.summary.autoMatched} auto-match, ${matchingResult.summary.suggested} suggeriti, ${matchingResult.summary.unmatched} non matchati`
  );

  // Step 4: Create InvoiceImportLine records for each result
  for (const match of matchingResult.results) {
    const lineDate = parseDateString(match.extractedLine.date);

    await prisma.invoiceImportLine.create({
      data: {
        tenantId: "", // Overwritten by tenant extension
        importId,
        lineNumber: match.lineNumber,
        licensePlate: truncate(match.extractedLine.licensePlate, 50),
        date: lineDate,
        fuelType: truncate(match.extractedLine.fuelType, 50),
        quantity: match.extractedLine.quantity ?? null,
        amount: match.extractedLine.amount ?? null,
        cardNumber: truncate(match.extractedLine.cardNumber, 50),
        odometerKm: match.extractedLine.odometerKm ?? null,
        description: truncate(match.extractedLine.description, 500),
        matchStatus: match.matchStatus,
        matchedFuelRecordId: match.matchedFuelRecordId ?? null,
        matchScore: match.matchScore ?? null,
        matchDetails: match.matchDetails ? JSON.stringify(match.matchDetails) : null,
        resolvedVehicleId: match.resolvedVehicleId ?? null,
        extractionErrors: match.error ? JSON.stringify([match.error]) : null,
      },
    });
  }

  // Step 5: Update InvoiceImport with totals and status
  const result = await prisma.invoiceImport.update({
    where: { id: importId },
    data: {
      ...metadataUpdate,
      status: "PROCESSED",
      totalLinesExtracted: extraction.lines.length,
      totalLinesMatched: matchingResult.summary.autoMatched + matchingResult.summary.suggested,
      totalLinesError: matchingResult.summary.errors,
      processingLog: processingLog.join("\n"),
    },
    include: IMPORT_INCLUDE,
  });

  return toImportWithLines(result);
}

// ---------------------------------------------------------------------------
// 3. getImportById
// ---------------------------------------------------------------------------

export async function getImportById(
  prisma: PrismaClientWithTenant,
  id: string
): Promise<InvoiceImportWithLines | null> {
  const result = await prisma.invoiceImport.findFirst({
    where: { id },
    include: IMPORT_INCLUDE,
  });

  if (!result) return null;
  return toImportWithLines(result);
}

// ---------------------------------------------------------------------------
// 4. getImports (paginated list)
// ---------------------------------------------------------------------------

export async function getImports(
  prisma: PrismaClientWithTenant,
  filters?: {
    status?: string;
    page?: number;
    pageSize?: number;
  }
): Promise<{
  data: InvoiceImportWithLines[];
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
  };
}> {
  const page = filters?.page ?? 1;
  const pageSize = filters?.pageSize ?? 20;
  const skip = (page - 1) * pageSize;

  const where: Record<string, unknown> = {};
  if (filters?.status) {
    where.status = filters.status;
  }

  const [totalCount, rows] = await Promise.all([
    prisma.invoiceImport.count({ where }),
    prisma.invoiceImport.findMany({
      where,
      include: IMPORT_INCLUDE,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
  ]);

  const totalPages = Math.ceil(totalCount / pageSize);

  return {
    data: rows.map(toImportWithLines),
    pagination: {
      page,
      pageSize,
      totalCount,
      totalPages,
    },
  };
}

// ---------------------------------------------------------------------------
// 5. confirmLine
// ---------------------------------------------------------------------------

export async function confirmLine(
  prisma: PrismaClientWithTenant,
  lineId: string,
  action: "confirm" | "reject" | "skip"
): Promise<void> {
  switch (action) {
    case "confirm":
      await prisma.invoiceImportLine.update({
        where: { id: lineId },
        data: { matchStatus: "CONFIRMED" },
      });
      break;

    case "reject":
      await prisma.invoiceImportLine.update({
        where: { id: lineId },
        data: {
          matchStatus: "REJECTED",
          matchedFuelRecordId: null,
        },
      });
      break;

    case "skip":
      await prisma.invoiceImportLine.update({
        where: { id: lineId },
        data: { matchStatus: "SKIPPED" },
      });
      break;
  }
}

// ---------------------------------------------------------------------------
// 6. confirmAllAutoMatched
// ---------------------------------------------------------------------------

export async function confirmAllAutoMatched(
  prisma: PrismaClientWithTenant,
  importId: string
): Promise<number> {
  const result = await prisma.invoiceImportLine.updateMany({
    where: {
      importId,
      matchStatus: "AUTO_MATCHED",
    },
    data: {
      matchStatus: "CONFIRMED",
    },
  });

  return result.count;
}

// ---------------------------------------------------------------------------
// 7. finalizeImport
// ---------------------------------------------------------------------------

export async function finalizeImport(
  prisma: PrismaClientWithTenant,
  importId: string
): Promise<InvoiceImportWithLines> {
  // Count lines by status for final totals
  const lines = await prisma.invoiceImportLine.findMany({
    where: { importId },
    select: { matchStatus: true, createdFuelRecordId: true },
  });

  const totalLinesMatched = lines.filter(
    (l) =>
      l.matchStatus === "CONFIRMED" || l.matchStatus === "AUTO_MATCHED"
  ).length;

  const totalLinesCreated = lines.filter(
    (l) => l.createdFuelRecordId !== null
  ).length;

  const totalLinesSkipped = lines.filter(
    (l) => l.matchStatus === "SKIPPED" || l.matchStatus === "REJECTED"
  ).length;

  const totalLinesError = lines.filter(
    (l) => l.matchStatus === "ERROR"
  ).length;

  const result = await prisma.invoiceImport.update({
    where: { id: importId },
    data: {
      status: "COMPLETED",
      completedAt: new Date(),
      totalLinesMatched,
      totalLinesCreated,
      totalLinesSkipped,
      totalLinesError,
    },
    include: IMPORT_INCLUDE,
  });

  return toImportWithLines(result);
}
