"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/types/action-result";
import { ErrorCode } from "@/types/action-result";
import { createDocumentSchema } from "@/lib/schemas/vehicle-document";
import { createDocument } from "@/lib/services/vehicle-document-service";
import { uploadFile, validateFile } from "@/lib/services/file-upload-service";
import { requireAuth, isTenantAdmin } from "@/lib/auth/permissions";
import { getPrismaForTenant } from "@/lib/db/client";
import { getTenantVehicleById } from "@/lib/services/tenant-vehicle-service";
import { logger } from "@/lib/utils/logger";
import type { VehicleDocument } from "@/generated/prisma/client";

export async function createDocumentAction(
  formData: FormData
): Promise<ActionResult<VehicleDocument>> {
  const authResult = await requireAuth();
  if (!authResult.success) return authResult;
  const { ctx } = authResult;

  const tenantId = ctx.organizationId;
  if (!tenantId) {
    return {
      success: false,
      error: "Nessun tenant attivo nella sessione",
      code: ErrorCode.FORBIDDEN,
    };
  }

  const canManage = await isTenantAdmin(ctx, tenantId);
  if (!canManage) {
    return {
      success: false,
      error: "Permessi insufficienti per gestire i documenti",
      code: ErrorCode.FORBIDDEN,
    };
  }

  // Extract form fields
  const vehicleIdRaw = formData.get("vehicleId");
  const vehicleId = vehicleIdRaw ? Number(vehicleIdRaw) : NaN;
  const file = formData.get("file") as File | null;

  if (!vehicleIdRaw || isNaN(vehicleId)) {
    return {
      success: false,
      error: "ID veicolo mancante",
      code: ErrorCode.VALIDATION,
    };
  }

  if (!file || !(file instanceof File) || file.size === 0) {
    return {
      success: false,
      error: "Il file e obbligatorio",
      code: ErrorCode.VALIDATION,
    };
  }

  // Validate file
  const fileValidation = validateFile(file);
  if (!fileValidation.valid) {
    return {
      success: false,
      error: fileValidation.error,
      code: ErrorCode.VALIDATION,
    };
  }

  // Validate metadata
  const parsed = createDocumentSchema.safeParse({
    documentType: formData.get("documentType"),
    description: formData.get("description") || undefined,
    expiryDate: formData.get("expiryDate"),
  });

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0].message,
      code: ErrorCode.VALIDATION,
    };
  }

  const prisma = getPrismaForTenant(tenantId);

  // Verify vehicle exists in this tenant
  const vehicle = await getTenantVehicleById(prisma, vehicleId);
  if (!vehicle) {
    return {
      success: false,
      error: "Veicolo non trovato",
      code: ErrorCode.NOT_FOUND,
    };
  }

  try {
    // Upload file
    const uploadResult = await uploadFile(file, tenantId, String(vehicleId));

    // Create DB record
    const document = await createDocument(prisma, {
      vehicleId,
      documentType: parsed.data.documentType,
      description: parsed.data.description,
      expiryDate: parsed.data.expiryDate,
      fileName: uploadResult.fileName,
      fileUrl: uploadResult.fileUrl,
      fileMimeType: uploadResult.fileMimeType,
      fileSize: uploadResult.fileSize,
      createdBy: ctx.userId,
    });

    revalidatePath(`/vehicles/${vehicleId}`);
    return { success: true, data: document };
  } catch (error) {
    logger.error(
      { error, userId: ctx.userId, tenantId, vehicleId },
      "Failed to create vehicle document"
    );
    return {
      success: false,
      error: "Errore nel caricamento del documento",
      code: ErrorCode.INTERNAL,
    };
  }
}
