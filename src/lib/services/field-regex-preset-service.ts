import type { PrismaClientWithTenant } from "@/lib/db/client";
import type {
  TemplateConfig,
  FieldExtractionRule,
  RegexPattern,
} from "@/types/xml-template";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CreatePresetInput = {
  tenantId: string;
  supplierId?: number | null;
  fieldName: string;
  name: string;
  patterns: RegexPattern[];
  priority?: number;
  isActive?: boolean;
};

export type UpdatePresetInput = {
  name?: string;
  patterns?: RegexPattern[];
  priority?: number;
  isActive?: boolean;
};

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

export async function getPresets(
  prisma: PrismaClientWithTenant,
  filters?: { supplierId?: number | null; fieldName?: string }
) {
  return prisma.fieldRegexPreset.findMany({
    where: {
      ...(filters?.supplierId !== undefined && { supplierId: filters.supplierId }),
      ...(filters?.fieldName && { fieldName: filters.fieldName }),
    },
    orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
    include: { supplier: { select: { id: true, name: true } } },
  });
}

export async function getPresetById(prisma: PrismaClientWithTenant, id: number) {
  return prisma.fieldRegexPreset.findUnique({ where: { id } });
}

export async function createPreset(
  prisma: PrismaClientWithTenant,
  data: CreatePresetInput
) {
  return prisma.fieldRegexPreset.create({
    data: {
      tenantId: data.tenantId,
      supplierId: data.supplierId ?? null,
      fieldName: data.fieldName,
      name: data.name,
      patterns: JSON.stringify(data.patterns),
      priority: data.priority ?? 0,
      isActive: data.isActive ?? true,
    },
  });
}

export async function updatePreset(
  prisma: PrismaClientWithTenant,
  id: number,
  data: UpdatePresetInput
) {
  return prisma.fieldRegexPreset.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.patterns !== undefined && { patterns: JSON.stringify(data.patterns) }),
      ...(data.priority !== undefined && { priority: data.priority }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
    },
  });
}

export async function deletePreset(prisma: PrismaClientWithTenant, id: number) {
  return prisma.fieldRegexPreset.delete({ where: { id } });
}

// ---------------------------------------------------------------------------
// Resolve presets for a specific field
// ---------------------------------------------------------------------------

/**
 * Load presets for a field: supplier-specific first, then globals, ordered by priority.
 */
export async function getPresetsForField(
  prisma: PrismaClientWithTenant,
  supplierId: number | null,
  fieldName: string
): Promise<RegexPattern[]> {
  const where = {
    fieldName,
    isActive: true,
    OR: supplierId
      ? [{ supplierId }, { supplierId: null }]
      : [{ supplierId: null }],
  };

  const presets = await prisma.fieldRegexPreset.findMany({
    where,
    orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
  });

  // Supplier-specific presets come first, then globals
  const supplierPresets = presets.filter((p) => p.supplierId !== null);
  const globalPresets = presets.filter((p) => p.supplierId === null);
  const ordered = [...supplierPresets, ...globalPresets];

  const allPatterns: RegexPattern[] = [];
  for (const preset of ordered) {
    const parsed = JSON.parse(preset.patterns) as RegexPattern[];
    allPatterns.push(...parsed);
  }

  return allPatterns;
}

// ---------------------------------------------------------------------------
// Enrich a TemplateConfig with preset regex patterns
// ---------------------------------------------------------------------------

/**
 * For each XPATH_REGEX or REGEX field in the config, resolve presets from DB
 * and merge them into `regexPatterns`. The inline `regex` (if any) is promoted
 * to the first element so it's tried first, then preset patterns follow.
 *
 * Returns a deep-cloned config (original is not mutated).
 */
export async function resolveTemplatePresets(
  prisma: PrismaClientWithTenant,
  config: TemplateConfig,
  supplierId: number | null
): Promise<TemplateConfig> {
  const enriched: TemplateConfig = JSON.parse(JSON.stringify(config));

  for (const [fieldName, rule] of Object.entries(enriched.fields)) {
    if (!rule) continue;
    if (rule.method !== "XPATH_REGEX" && rule.method !== "REGEX") continue;

    const presetPatterns = await getPresetsForField(prisma, supplierId, fieldName);
    if (presetPatterns.length === 0) continue;

    // Build final regexPatterns array
    const patterns: RegexPattern[] = [];

    // Promote inline regex as first pattern (backward compat)
    if (rule.regex) {
      patterns.push({
        label: "Template inline",
        regex: rule.regex,
        regexGroup: rule.regexGroup,
      });
    }

    // Append preset patterns
    patterns.push(...presetPatterns);

    (rule as FieldExtractionRule).regexPatterns = patterns;
  }

  return enriched;
}
