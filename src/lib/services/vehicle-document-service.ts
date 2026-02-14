import type { VehicleDocument } from "@/generated/prisma/client";
import type { PrismaClientWithTenant } from "@/lib/db/client";
import type { CreateDocumentInput, UpdateDocumentInput } from "@/lib/schemas/vehicle-document";

// ---------------------------------------------------------------------------
// Expiry status helper
// ---------------------------------------------------------------------------

const EXPIRY_WARNING_DAYS = 30;

export type DocumentExpiryStatus = "expired" | "warning" | "ok";

export function getExpiryStatus(expiryDate: Date): DocumentExpiryStatus {
  const now = new Date();
  const expiry = new Date(expiryDate);
  const diffMs = expiry.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return "expired";
  if (diffDays <= EXPIRY_WARNING_DAYS) return "warning";
  return "ok";
}

// ---------------------------------------------------------------------------
// Get documents by vehicle
// ---------------------------------------------------------------------------

export async function getDocumentsByVehicle(
  prisma: PrismaClientWithTenant,
  vehicleId: string,
  filters?: {
    documentType?: string;
    expiryStatus?: "all" | "expiring" | "expired";
  }
): Promise<VehicleDocument[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: Record<string, any> = { vehicleId };

  if (filters?.documentType) {
    where.documentType = filters.documentType;
  }

  if (filters?.expiryStatus === "expired") {
    where.expiryDate = { lt: new Date() };
  } else if (filters?.expiryStatus === "expiring") {
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() + EXPIRY_WARNING_DAYS);
    where.expiryDate = {
      gte: new Date(),
      lte: thresholdDate,
    };
  }

  const results = await prisma.vehicleDocument.findMany({
    where,
    orderBy: { expiryDate: "asc" },
  });

  return results;
}

// ---------------------------------------------------------------------------
// Get single document by ID
// ---------------------------------------------------------------------------

export async function getDocumentById(
  prisma: PrismaClientWithTenant,
  id: string
): Promise<VehicleDocument | null> {
  return prisma.vehicleDocument.findFirst({
    where: { id },
  });
}

// ---------------------------------------------------------------------------
// Create document
// ---------------------------------------------------------------------------

export type CreateDocumentData = CreateDocumentInput & {
  vehicleId: string;
  fileName: string;
  fileUrl: string;
  fileMimeType: string;
  fileSize: number;
  createdBy: string;
};

export async function createDocument(
  prisma: PrismaClientWithTenant,
  data: CreateDocumentData
): Promise<VehicleDocument> {
  return prisma.vehicleDocument.create({
    data: {
      tenantId: "", // Overwritten by tenant extension
      vehicleId: data.vehicleId,
      documentType: data.documentType,
      description: data.description ?? null,
      expiryDate: data.expiryDate,
      fileName: data.fileName,
      fileUrl: data.fileUrl,
      fileMimeType: data.fileMimeType,
      fileSize: data.fileSize,
      createdBy: data.createdBy,
    },
  });
}

// ---------------------------------------------------------------------------
// Update document
// ---------------------------------------------------------------------------

export type UpdateDocumentData = UpdateDocumentInput & {
  fileName?: string;
  fileUrl?: string;
  fileMimeType?: string;
  fileSize?: number;
};

export async function updateDocument(
  prisma: PrismaClientWithTenant,
  id: string,
  data: UpdateDocumentData
): Promise<VehicleDocument> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateData: Record<string, any> = {
    documentType: data.documentType,
    description: data.description ?? null,
    expiryDate: data.expiryDate,
  };

  // Only update file fields if a new file was provided
  if (data.fileName && data.fileUrl && data.fileMimeType && data.fileSize) {
    updateData.fileName = data.fileName;
    updateData.fileUrl = data.fileUrl;
    updateData.fileMimeType = data.fileMimeType;
    updateData.fileSize = data.fileSize;
  }

  return prisma.vehicleDocument.update({
    where: { id },
    data: updateData,
  });
}

// ---------------------------------------------------------------------------
// Delete document
// ---------------------------------------------------------------------------

export async function deleteDocument(
  prisma: PrismaClientWithTenant,
  id: string
): Promise<VehicleDocument> {
  return prisma.vehicleDocument.delete({
    where: { id },
  });
}

// ---------------------------------------------------------------------------
// Get expiring documents (for dashboard use)
// ---------------------------------------------------------------------------

export async function getExpiringDocuments(
  prisma: PrismaClientWithTenant,
  daysAhead: number = 30
): Promise<VehicleDocument[]> {
  const now = new Date();
  const threshold = new Date();
  threshold.setDate(threshold.getDate() + daysAhead);

  return prisma.vehicleDocument.findMany({
    where: {
      expiryDate: {
        gte: now,
        lte: threshold,
      },
    },
    orderBy: { expiryDate: "asc" },
  });
}

// ---------------------------------------------------------------------------
// Get document counts and expiry summary for a vehicle
// ---------------------------------------------------------------------------

export type DocumentSummary = {
  total: number;
  expired: number;
  expiring: number;
  ok: number;
};

export async function getDocumentSummary(
  prisma: PrismaClientWithTenant,
  vehicleId: string
): Promise<DocumentSummary> {
  const documents = await prisma.vehicleDocument.findMany({
    where: { vehicleId },
    select: { expiryDate: true },
  });

  const summary: DocumentSummary = {
    total: documents.length,
    expired: 0,
    expiring: 0,
    ok: 0,
  };

  for (const doc of documents) {
    const status = getExpiryStatus(doc.expiryDate);
    switch (status) {
      case "expired":
        summary.expired++;
        break;
      case "warning":
        summary.expiring++;
        break;
      case "ok":
        summary.ok++;
        break;
    }
  }

  return summary;
}
