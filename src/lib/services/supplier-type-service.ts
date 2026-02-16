import type { SupplierType } from "@/generated/prisma/client";
import type { PrismaClientWithTenant } from "@/lib/db/client";
import type {
  CreateSupplierTypeInput,
  UpdateSupplierTypeInput,
} from "@/lib/schemas/supplier";

// ---------------------------------------------------------------------------
// List all supplier types for tenant (active only by default)
// ---------------------------------------------------------------------------

export async function getSupplierTypes(
  prisma: PrismaClientWithTenant,
  activeOnly = true
): Promise<SupplierType[]> {
  const where: Record<string, unknown> = {};
  if (activeOnly) where.isActive = true;

  return prisma.supplierType.findMany({
    where,
    orderBy: { sortOrder: "asc" },
  });
}

// ---------------------------------------------------------------------------
// Get single supplier type by ID
// ---------------------------------------------------------------------------

export async function getSupplierTypeById(
  prisma: PrismaClientWithTenant,
  id: string
): Promise<SupplierType | null> {
  return prisma.supplierType.findFirst({ where: { id } });
}

// ---------------------------------------------------------------------------
// Get supplier type by code (e.g. "NLT", "CARBURANTE")
// ---------------------------------------------------------------------------

export async function getSupplierTypeByCode(
  prisma: PrismaClientWithTenant,
  code: string
): Promise<SupplierType | null> {
  return prisma.supplierType.findFirst({ where: { code } });
}

// ---------------------------------------------------------------------------
// Create supplier type
// ---------------------------------------------------------------------------

export async function createSupplierType(
  prisma: PrismaClientWithTenant,
  data: CreateSupplierTypeInput
): Promise<SupplierType> {
  return prisma.supplierType.create({
    data: {
      tenantId: "", // Overwritten by tenant extension
      code: data.code,
      label: data.label,
      description: data.description ?? null,
      sortOrder: data.sortOrder,
    },
  });
}

// ---------------------------------------------------------------------------
// Update supplier type
// ---------------------------------------------------------------------------

export async function updateSupplierType(
  prisma: PrismaClientWithTenant,
  id: string,
  data: UpdateSupplierTypeInput
): Promise<SupplierType> {
  return prisma.supplierType.update({
    where: { id },
    data: {
      label: data.label,
      description: data.description ?? null,
      sortOrder: data.sortOrder,
      isActive: data.isActive,
    },
  });
}

// ---------------------------------------------------------------------------
// Seed default supplier types for a tenant
// ---------------------------------------------------------------------------

const DEFAULT_TYPES = [
  { code: "NLT", label: "Noleggio Lungo Termine", sortOrder: 0 },
  { code: "CARBURANTE", label: "Carburante", sortOrder: 1 },
  { code: "ALTRO", label: "Altro", sortOrder: 2 },
];

export async function seedDefaultSupplierTypes(
  prisma: PrismaClientWithTenant
): Promise<SupplierType[]> {
  const results: SupplierType[] = [];

  for (const def of DEFAULT_TYPES) {
    // Upsert: create if not exists
    const existing = await prisma.supplierType.findFirst({
      where: { code: def.code },
    });
    if (!existing) {
      const created = await prisma.supplierType.create({
        data: {
          tenantId: "", // Overwritten by tenant extension
          code: def.code,
          label: def.label,
          sortOrder: def.sortOrder,
        },
      });
      results.push(created);
    } else {
      results.push(existing);
    }
  }

  return results;
}
