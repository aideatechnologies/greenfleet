import type { PrismaClientWithTenant } from "@/lib/db/client";
import type { TemplateConfig, MatchingTolerances, ExtractionResult } from "@/types/xml-template";
import { extractLinesFromXml } from "./xml-parser-service";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type XmlTemplateWithSupplier = {
  id: string;
  tenantId: string;
  supplierId: string;
  name: string;
  description: string | null;
  templateConfig: TemplateConfig;
  matchingConfig: MatchingTolerances | null;
  sampleXml: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  supplier: {
    id: string;
    name: string;
    vatNumber: string | null;
  };
};

// ---------------------------------------------------------------------------
// Helpers to serialize/deserialize JSON configs
// ---------------------------------------------------------------------------

function parseTemplateConfig(raw: string): TemplateConfig {
  return JSON.parse(raw) as TemplateConfig;
}

function parseMatchingConfig(raw: string | null): MatchingTolerances | null {
  if (!raw) return null;
  return JSON.parse(raw) as MatchingTolerances;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toXmlTemplateWithSupplier(row: any): XmlTemplateWithSupplier {
  return {
    ...row,
    templateConfig: parseTemplateConfig(row.templateConfig),
    matchingConfig: parseMatchingConfig(row.matchingConfig),
  };
}

// ---------------------------------------------------------------------------
// Create template
// ---------------------------------------------------------------------------

export type CreateXmlTemplateInput = {
  supplierId: string;
  name: string;
  description?: string;
  templateConfig: TemplateConfig;
  matchingConfig?: MatchingTolerances;
  sampleXml?: string;
};

export async function createXmlTemplate(
  prisma: PrismaClientWithTenant,
  data: CreateXmlTemplateInput
): Promise<XmlTemplateWithSupplier> {
  const result = await prisma.supplierXmlTemplate.create({
    data: {
      tenantId: "", // Overwritten by tenant extension
      supplierId: data.supplierId,
      name: data.name,
      description: data.description ?? null,
      templateConfig: JSON.stringify(data.templateConfig),
      matchingConfig: data.matchingConfig ? JSON.stringify(data.matchingConfig) : null,
      sampleXml: data.sampleXml ?? null,
    },
    include: {
      supplier: {
        select: { id: true, name: true, vatNumber: true },
      },
    },
  });

  return toXmlTemplateWithSupplier(result);
}

// ---------------------------------------------------------------------------
// Update template
// ---------------------------------------------------------------------------

export type UpdateXmlTemplateInput = {
  name?: string;
  description?: string;
  templateConfig?: TemplateConfig;
  matchingConfig?: MatchingTolerances;
  sampleXml?: string;
  isActive?: boolean;
};

export async function updateXmlTemplate(
  prisma: PrismaClientWithTenant,
  id: string,
  data: UpdateXmlTemplateInput
): Promise<XmlTemplateWithSupplier> {
  const updateData: Record<string, unknown> = {};

  if (data.name !== undefined) updateData.name = data.name;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.templateConfig !== undefined) updateData.templateConfig = JSON.stringify(data.templateConfig);
  if (data.matchingConfig !== undefined) updateData.matchingConfig = JSON.stringify(data.matchingConfig);
  if (data.sampleXml !== undefined) updateData.sampleXml = data.sampleXml;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;

  const result = await prisma.supplierXmlTemplate.update({
    where: { id },
    data: updateData,
    include: {
      supplier: {
        select: { id: true, name: true, vatNumber: true },
      },
    },
  });

  return toXmlTemplateWithSupplier(result);
}

// ---------------------------------------------------------------------------
// Get template by ID
// ---------------------------------------------------------------------------

export async function getXmlTemplateById(
  prisma: PrismaClientWithTenant,
  id: string
): Promise<XmlTemplateWithSupplier | null> {
  const result = await prisma.supplierXmlTemplate.findFirst({
    where: { id },
    include: {
      supplier: {
        select: { id: true, name: true, vatNumber: true },
      },
    },
  });

  if (!result) return null;
  return toXmlTemplateWithSupplier(result);
}

// ---------------------------------------------------------------------------
// Get templates for a supplier
// ---------------------------------------------------------------------------

export async function getXmlTemplatesBySupplier(
  prisma: PrismaClientWithTenant,
  supplierId: string
): Promise<XmlTemplateWithSupplier[]> {
  const results = await prisma.supplierXmlTemplate.findMany({
    where: { supplierId },
    include: {
      supplier: {
        select: { id: true, name: true, vatNumber: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return results.map(toXmlTemplateWithSupplier);
}

// ---------------------------------------------------------------------------
// Get all active templates
// ---------------------------------------------------------------------------

export async function getActiveXmlTemplates(
  prisma: PrismaClientWithTenant
): Promise<XmlTemplateWithSupplier[]> {
  const results = await prisma.supplierXmlTemplate.findMany({
    where: { isActive: true },
    include: {
      supplier: {
        select: { id: true, name: true, vatNumber: true },
      },
    },
    orderBy: { name: "asc" },
  });

  return results.map(toXmlTemplateWithSupplier);
}

// ---------------------------------------------------------------------------
// Test template extraction — run template config against XML sample
// ---------------------------------------------------------------------------

export function testTemplateExtraction(
  templateConfig: TemplateConfig,
  xmlContent: string
): ExtractionResult {
  return extractLinesFromXml(xmlContent, templateConfig);
}

// ---------------------------------------------------------------------------
// Find template by supplier VAT number
// ---------------------------------------------------------------------------

export async function findTemplateBySupplierVat(
  prisma: PrismaClientWithTenant,
  vatNumber: string
): Promise<XmlTemplateWithSupplier | null> {
  const result = await prisma.supplierXmlTemplate.findFirst({
    where: {
      isActive: true,
      supplier: {
        vatNumber: vatNumber,
      },
    },
    include: {
      supplier: {
        select: { id: true, name: true, vatNumber: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!result) return null;
  return toXmlTemplateWithSupplier(result);
}
