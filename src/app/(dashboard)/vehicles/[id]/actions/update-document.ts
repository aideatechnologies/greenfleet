"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/types/action-result";
import { ErrorCode } from "@/types/action-result";
import { updateDocumentSchema } from "@/lib/schemas/vehicle-document";
import {
  getDocumentById,
  updateDocument,
} from "@/lib/services/vehicle-document-service";
import {
  uploadFile,
  validateFile,
  deleteFile,
} from "@/lib/services/file-upload-service";
import { requireAuth, isTenantAdmin } from "@/lib/auth/permissions";
import { getPrismaForTenant } from "@/lib/db/client";
import { logger } from "@/lib/utils/logger";
import type { VehicleDocument } from "@/generated/prisma/client";

export async function updateDocumentAction(
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

  const documentIdRaw = formData.get("documentId");
  const documentId = documentIdRaw ? Number(documentIdRaw) : NaN;
  if (!documentIdRaw || isNaN(documentId)) {
    return {
      success: false,
      error: "ID documento mancante",
      code: ErrorCode.VALIDATION,
    };
  }

  // Validate metadata
  const parsed = updateDocumentSchema.safeParse({
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

  // Get existing document
  const existingDoc = await getDocumentById(prisma, documentId);
  if (!existingDoc) {
    return {
      success: false,
      error: "Documento non trovato",
      code: ErrorCode.NOT_FOUND,
    };
  }

  try {
    // Check if a new file is provided
    const file = formData.get("file") as File | null;
    let fileData:
      | {
          fileName: string;
          fileUrl: string;
          fileMimeType: string;
          fileSize: number;
        }
      | undefined;

    if (file && file instanceof File && file.size > 0) {
      // Validate new file
      const fileValidation = validateFile(file);
      if (!fileValidation.valid) {
        return {
          success: false,
          error: fileValidation.error,
          code: ErrorCode.VALIDATION,
        };
      }

      // Upload new file
      const uploadResult = await uploadFile(
        file,
        tenantId,
        String(existingDoc.vehicleId)
      );
      fileData = uploadResult;

      // Delete old file
      await deleteFile(existingDoc.fileUrl);
    }

    // Update DB record
    const updated = await updateDocument(prisma, documentId, {
      ...parsed.data,
      ...fileData,
    });

    revalidatePath(`/vehicles/${existingDoc.vehicleId}`);
    return { success: true, data: updated };
  } catch (error) {
    logger.error(
      { error, userId: ctx.userId, tenantId, documentId },
      "Failed to update vehicle document"
    );
    return {
      success: false,
      error: "Errore nell'aggiornamento del documento",
      code: ErrorCode.INTERNAL,
    };
  }
}
