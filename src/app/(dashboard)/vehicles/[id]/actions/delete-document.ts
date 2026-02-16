"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/types/action-result";
import { ErrorCode } from "@/types/action-result";
import {
  getDocumentById,
  deleteDocument,
} from "@/lib/services/vehicle-document-service";
import { deleteFile } from "@/lib/services/file-upload-service";
import { requireAuth, isTenantAdmin } from "@/lib/auth/permissions";
import { getPrismaForTenant } from "@/lib/db/client";
import { logger } from "@/lib/utils/logger";

export async function deleteDocumentAction(
  documentId: number,
  vehicleId: number
): Promise<ActionResult<{ deleted: true }>> {
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
    // Delete file from storage
    await deleteFile(existingDoc.fileUrl);

    // Delete DB record
    await deleteDocument(prisma, documentId);

    revalidatePath(`/vehicles/${vehicleId}`);
    return { success: true, data: { deleted: true } };
  } catch (error) {
    logger.error(
      { error, userId: ctx.userId, tenantId, documentId },
      "Failed to delete vehicle document"
    );
    return {
      success: false,
      error: "Errore nell'eliminazione del documento",
      code: ErrorCode.INTERNAL,
    };
  }
}
