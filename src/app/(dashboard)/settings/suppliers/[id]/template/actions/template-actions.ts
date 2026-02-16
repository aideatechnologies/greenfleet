"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/types/action-result";
import { ErrorCode } from "@/types/action-result";
import type {
  TemplateConfig,
  MatchingTolerances,
  ExtractionResult,
  XmlTreeNode,
} from "@/types/xml-template";
import {
  createXmlTemplate,
  updateXmlTemplate,
  getXmlTemplateById,
  getXmlTemplatesBySupplier,
  testTemplateExtraction,
  type XmlTemplateWithSupplier,
} from "@/lib/services/xml-template-service";
import {
  getXmlTreeStructure,
  autoDetectSupplierVat,
} from "@/lib/services/xml-parser-service";
import { requireAuth, isTenantAdmin } from "@/lib/auth/permissions";
import { getPrismaForTenant } from "@/lib/db/client";
import { logger } from "@/lib/utils/logger";

// ---------------------------------------------------------------------------
// Read-only actions (no admin check)
// ---------------------------------------------------------------------------

export async function getXmlTemplatesForSupplierAction(
  supplierId: string
): Promise<ActionResult<XmlTemplateWithSupplier[]>> {
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
    const templates = await getXmlTemplatesBySupplier(prisma, supplierId);
    return { success: true, data: templates };
  } catch (error) {
    logger.error(
      { error, userId: ctx.userId, tenantId, supplierId },
      "Failed to get XML templates for supplier"
    );
    return {
      success: false,
      error: "Errore nel recupero dei template XML",
      code: ErrorCode.INTERNAL,
    };
  }
}

export async function getXmlTemplateAction(
  templateId: string
): Promise<ActionResult<XmlTemplateWithSupplier>> {
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
    const template = await getXmlTemplateById(prisma, templateId);
    if (!template) {
      return {
        success: false,
        error: "Template non trovato",
        code: ErrorCode.NOT_FOUND,
      };
    }
    return { success: true, data: template };
  } catch (error) {
    logger.error(
      { error, userId: ctx.userId, tenantId, templateId },
      "Failed to get XML template"
    );
    return {
      success: false,
      error: "Errore nel recupero del template XML",
      code: ErrorCode.INTERNAL,
    };
  }
}

// ---------------------------------------------------------------------------
// Pure computation actions (no prisma, no admin check)
// ---------------------------------------------------------------------------

export async function testExtractionAction(data: {
  templateConfig: TemplateConfig;
  xmlContent: string;
}): Promise<ActionResult<ExtractionResult>> {
  const authResult = await requireAuth();
  if (!authResult.success) return authResult;

  try {
    const result = testTemplateExtraction(data.templateConfig, data.xmlContent);
    return { success: true, data: result };
  } catch (error) {
    logger.error({ error }, "Failed to test XML extraction");
    return {
      success: false,
      error: "Errore nel test di estrazione XML",
      code: ErrorCode.INTERNAL,
    };
  }
}

export async function parseXmlTreeAction(
  xmlContent: string
): Promise<ActionResult<XmlTreeNode[]>> {
  const authResult = await requireAuth();
  if (!authResult.success) return authResult;

  try {
    const tree = getXmlTreeStructure(xmlContent);
    return { success: true, data: tree };
  } catch (error) {
    logger.error({ error }, "Failed to parse XML tree");
    return {
      success: false,
      error: "Errore nel parsing della struttura XML",
      code: ErrorCode.INTERNAL,
    };
  }
}

export async function autoDetectSupplierAction(
  xmlContent: string
): Promise<ActionResult<string | null>> {
  const authResult = await requireAuth();
  if (!authResult.success) return authResult;

  try {
    const vatNumber = autoDetectSupplierVat(xmlContent);
    return { success: true, data: vatNumber };
  } catch (error) {
    logger.error({ error }, "Failed to auto-detect supplier from XML");
    return {
      success: false,
      error: "Errore nel rilevamento automatico del fornitore",
      code: ErrorCode.INTERNAL,
    };
  }
}

// ---------------------------------------------------------------------------
// Mutation actions (require admin)
// ---------------------------------------------------------------------------

export async function saveXmlTemplateAction(data: {
  supplierId: string;
  name: string;
  description?: string;
  templateConfig: TemplateConfig;
  matchingConfig?: MatchingTolerances;
  sampleXml?: string;
}): Promise<ActionResult<XmlTemplateWithSupplier>> {
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
      error: "Permessi insufficienti per gestire i template XML",
      code: ErrorCode.FORBIDDEN,
    };
  }

  try {
    const prisma = getPrismaForTenant(tenantId);
    const template = await createXmlTemplate(prisma, {
      supplierId: data.supplierId,
      name: data.name,
      description: data.description,
      templateConfig: data.templateConfig,
      matchingConfig: data.matchingConfig,
      sampleXml: data.sampleXml,
    });
    revalidatePath("/settings/suppliers");
    return { success: true, data: template };
  } catch (error) {
    logger.error(
      { error, userId: ctx.userId, tenantId, supplierId: data.supplierId },
      "Failed to create XML template"
    );
    return {
      success: false,
      error: "Errore nella creazione del template XML",
      code: ErrorCode.INTERNAL,
    };
  }
}

export async function updateXmlTemplateAction(
  templateId: string,
  data: {
    name?: string;
    description?: string;
    templateConfig?: TemplateConfig;
    matchingConfig?: MatchingTolerances;
    sampleXml?: string;
  }
): Promise<ActionResult<XmlTemplateWithSupplier>> {
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
      error: "Permessi insufficienti per gestire i template XML",
      code: ErrorCode.FORBIDDEN,
    };
  }

  try {
    const prisma = getPrismaForTenant(tenantId);
    const template = await updateXmlTemplate(prisma, templateId, data);
    revalidatePath("/settings/suppliers");
    return { success: true, data: template };
  } catch (error) {
    logger.error(
      { error, userId: ctx.userId, tenantId, templateId },
      "Failed to update XML template"
    );
    return {
      success: false,
      error: "Errore nell'aggiornamento del template XML",
      code: ErrorCode.INTERNAL,
    };
  }
}
