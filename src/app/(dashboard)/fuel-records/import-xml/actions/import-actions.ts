"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/types/action-result";
import { ErrorCode } from "@/types/action-result";
import {
  createImport,
  processImport,
  getImportById,
  getImports,
  confirmLine,
  confirmAllAutoMatched,
  finalizeImport,
  type InvoiceImportWithLines,
} from "@/lib/services/invoice-import-service";
import {
  getXmlTemplateById,
  getActiveXmlTemplates,
  findTemplateBySupplierVat,
  type XmlTemplateWithSupplier,
} from "@/lib/services/xml-template-service";
import {
  autoDetectFatturaPA,
  type FatturaDetection,
} from "@/lib/services/xml-parser-service";
import { resolveTemplatePresets } from "@/lib/services/field-regex-preset-service";
import { requireAuth, isTenantAdmin } from "@/lib/auth/permissions";
import { getPrismaForTenant } from "@/lib/db/client";
import { logger } from "@/lib/utils/logger";

// ---------------------------------------------------------------------------
// Read-only actions (no admin check)
// ---------------------------------------------------------------------------

export async function getActiveTemplatesAction(): Promise<
  ActionResult<XmlTemplateWithSupplier[]>
> {
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

  try {
    const prisma = getPrismaForTenant(tenantId);
    const templates = await getActiveXmlTemplates(prisma);
    return { success: true, data: templates };
  } catch (error) {
    logger.error(
      { error, userId: ctx.userId, tenantId },
      "Failed to get active XML templates"
    );
    return {
      success: false,
      error: "Errore nel recupero dei template XML attivi",
      code: ErrorCode.INTERNAL,
    };
  }
}

export async function getImportAction(
  importId: number
): Promise<ActionResult<InvoiceImportWithLines>> {
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

  try {
    const prisma = getPrismaForTenant(tenantId);
    const importRecord = await getImportById(prisma, importId);
    if (!importRecord) {
      return {
        success: false,
        error: "Importazione non trovata",
        code: ErrorCode.NOT_FOUND,
      };
    }
    return { success: true, data: importRecord };
  } catch (error) {
    logger.error(
      { error, userId: ctx.userId, tenantId, importId },
      "Failed to get import"
    );
    return {
      success: false,
      error: "Errore nel recupero dell'importazione",
      code: ErrorCode.INTERNAL,
    };
  }
}

export async function getImportsListAction(
  filters?: { status?: string; page?: number }
): Promise<
  ActionResult<{
    data: InvoiceImportWithLines[];
    pagination: {
      page: number;
      pageSize: number;
      totalCount: number;
      totalPages: number;
    };
  }>
> {
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

  try {
    const prisma = getPrismaForTenant(tenantId);
    const result = await getImports(prisma, filters);
    return { success: true, data: result };
  } catch (error) {
    logger.error(
      { error, userId: ctx.userId, tenantId, filters },
      "Failed to get imports list"
    );
    return {
      success: false,
      error: "Errore nel recupero della lista importazioni",
      code: ErrorCode.INTERNAL,
    };
  }
}

// ---------------------------------------------------------------------------
// Mutation actions (require admin)
// ---------------------------------------------------------------------------

export async function startImportAction(data: {
  templateId: number;
  fileName: string;
  xmlContent: string;
  requireManualConfirm: boolean;
}): Promise<ActionResult<InvoiceImportWithLines>> {
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
      error: "Permessi insufficienti per importare fatture XML",
      code: ErrorCode.FORBIDDEN,
    };
  }

  try {
    const prisma = getPrismaForTenant(tenantId);

    // 1. Create the import record
    const importRecord = await createImport(prisma, {
      templateId: data.templateId,
      userId: ctx.userId,
      fileName: data.fileName,
      xmlContent: data.xmlContent,
      requireManualConfirm: data.requireManualConfirm,
    });

    // 2. Get the template to retrieve its configs
    const template = await getXmlTemplateById(prisma, data.templateId);
    if (!template) {
      return {
        success: false,
        error: "Template XML non trovato",
        code: ErrorCode.NOT_FOUND,
      };
    }

    // 3. Enrich template with regex presets, then process
    const enrichedConfig = await resolveTemplatePresets(
      prisma,
      template.templateConfig,
      template.supplierId
    );
    const processed = await processImport(
      prisma,
      importRecord.id,
      data.xmlContent,
      enrichedConfig,
      template.matchingConfig ?? undefined
    );

    revalidatePath("/fuel-records/import-xml");
    return { success: true, data: processed };
  } catch (error) {
    logger.error(
      { error, userId: ctx.userId, tenantId, templateId: data.templateId },
      "Failed to start XML import"
    );
    return {
      success: false,
      error: "Errore nell'avvio dell'importazione XML",
      code: ErrorCode.INTERNAL,
    };
  }
}

export async function confirmLineAction(
  lineId: number,
  action: "confirm" | "reject" | "skip"
): Promise<ActionResult<void>> {
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
      error: "Permessi insufficienti per confermare le righe di importazione",
      code: ErrorCode.FORBIDDEN,
    };
  }

  try {
    const prisma = getPrismaForTenant(tenantId);
    await confirmLine(prisma, lineId, action);
    revalidatePath("/fuel-records/import-xml");
    return { success: true, data: undefined };
  } catch (error) {
    logger.error(
      { error, userId: ctx.userId, tenantId, lineId, action },
      "Failed to confirm import line"
    );
    return {
      success: false,
      error: "Errore nella conferma della riga di importazione",
      code: ErrorCode.INTERNAL,
    };
  }
}

export async function confirmAllAutoMatchedAction(
  importId: number
): Promise<ActionResult<number>> {
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
      error: "Permessi insufficienti per confermare le righe di importazione",
      code: ErrorCode.FORBIDDEN,
    };
  }

  try {
    const prisma = getPrismaForTenant(tenantId);
    const count = await confirmAllAutoMatched(prisma, importId);
    revalidatePath("/fuel-records/import-xml");
    return { success: true, data: count };
  } catch (error) {
    logger.error(
      { error, userId: ctx.userId, tenantId, importId },
      "Failed to confirm all auto-matched lines"
    );
    return {
      success: false,
      error: "Errore nella conferma automatica delle righe matchate",
      code: ErrorCode.INTERNAL,
    };
  }
}

export async function finalizeImportAction(
  importId: number
): Promise<ActionResult<InvoiceImportWithLines>> {
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
      error: "Permessi insufficienti per finalizzare l'importazione",
      code: ErrorCode.FORBIDDEN,
    };
  }

  try {
    const prisma = getPrismaForTenant(tenantId);
    const result = await finalizeImport(prisma, importId);
    revalidatePath("/fuel-records/import-xml");
    return { success: true, data: result };
  } catch (error) {
    logger.error(
      { error, userId: ctx.userId, tenantId, importId },
      "Failed to finalize import"
    );
    return {
      success: false,
      error: "Errore nella finalizzazione dell'importazione",
      code: ErrorCode.INTERNAL,
    };
  }
}

// ---------------------------------------------------------------------------
// Auto-detect FatturaPA structure
// ---------------------------------------------------------------------------

export type DetectResult = {
  detection: FatturaDetection;
  suggestedTemplateId: number | null;
  suggestedTemplateName: string | null;
};

export async function detectFatturaAction(
  xmlContent: string
): Promise<ActionResult<DetectResult>> {
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

  try {
    const detection = autoDetectFatturaPA(xmlContent);
    if (!detection) {
      return {
        success: false,
        error: "Impossibile rilevare la struttura FatturaPA nel file XML",
        code: ErrorCode.VALIDATION,
      };
    }

    // Try to find an existing template for this supplier
    let suggestedTemplateId: number | null = null;
    let suggestedTemplateName: string | null = null;

    if (detection.supplierVat) {
      const prisma = getPrismaForTenant(tenantId);
      const template = await findTemplateBySupplierVat(
        prisma,
        detection.supplierVat
      );
      if (template) {
        suggestedTemplateId = template.id;
        suggestedTemplateName = template.name;
      }
    }

    return {
      success: true,
      data: {
        detection,
        suggestedTemplateId,
        suggestedTemplateName,
      },
    };
  } catch (error) {
    logger.error(
      { error, userId: ctx.userId, tenantId },
      "Failed to detect FatturaPA structure"
    );
    return {
      success: false,
      error: "Errore nell'analisi del file XML",
      code: ErrorCode.INTERNAL,
    };
  }
}
