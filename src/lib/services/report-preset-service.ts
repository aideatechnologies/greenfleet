// ---------------------------------------------------------------------------
// Report Filter Preset Service — CRUD for saved filter presets
// ---------------------------------------------------------------------------

import type { PrismaClientWithTenant } from "@/lib/db/client";
import type { ReportFilterPreset } from "@/types/report";

// ---------------------------------------------------------------------------
// Get all presets for the current tenant
// ---------------------------------------------------------------------------

export async function getPresets(
  prisma: PrismaClientWithTenant,
  tenantId: string
): Promise<ReportFilterPreset[]> {
  const rows = await prisma.reportFilterPreset.findMany({
    where: { tenantId },
    orderBy: { name: "asc" },
  });

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    filters: JSON.parse(r.filters),
  }));
}

// ---------------------------------------------------------------------------
// Create a new preset
// ---------------------------------------------------------------------------

export async function createPreset(
  prisma: PrismaClientWithTenant,
  tenantId: string,
  userId: string,
  name: string,
  filters: ReportFilterPreset["filters"]
): Promise<ReportFilterPreset> {
  const row = await prisma.reportFilterPreset.create({
    data: {
      tenantId,
      name,
      filters: JSON.stringify(filters),
      createdById: userId,
    },
  });

  return {
    id: row.id,
    name: row.name,
    filters: JSON.parse(row.filters),
  };
}

// ---------------------------------------------------------------------------
// Update an existing preset
// ---------------------------------------------------------------------------

export async function updatePreset(
  prisma: PrismaClientWithTenant,
  presetId: string,
  name: string,
  filters: ReportFilterPreset["filters"]
): Promise<ReportFilterPreset> {
  const row = await prisma.reportFilterPreset.update({
    where: { id: presetId },
    data: {
      name,
      filters: JSON.stringify(filters),
    },
  });

  return {
    id: row.id,
    name: row.name,
    filters: JSON.parse(row.filters),
  };
}

// ---------------------------------------------------------------------------
// Delete a preset
// ---------------------------------------------------------------------------

export async function deletePreset(
  prisma: PrismaClientWithTenant,
  presetId: string
): Promise<void> {
  await prisma.reportFilterPreset.delete({
    where: { id: presetId },
  });
}
