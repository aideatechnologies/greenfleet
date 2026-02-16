import type { Supplier, SupplierType } from "@/generated/prisma/client";
import type { PrismaClientWithTenant } from "@/lib/db/client";
import type { PaginatedResult } from "@/types/pagination";
import type {
  CreateSupplierInput,
  UpdateSupplierInput,
  SupplierFilterInput,
} from "@/lib/schemas/supplier";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type SupplierWithType = Supplier & {
  supplierType: SupplierType;
};

// ---------------------------------------------------------------------------
// Include standard for detail queries
// ---------------------------------------------------------------------------

const INCLUDE_DETAILS = {
  supplierType: true,
} as const;

// ---------------------------------------------------------------------------
// Create supplier
// ---------------------------------------------------------------------------

export async function createSupplier(
  prisma: PrismaClientWithTenant,
  data: CreateSupplierInput
): Promise<SupplierWithType> {
  return prisma.supplier.create({
    data: {
      tenantId: "", // Overwritten by tenant extension
      supplierTypeId: data.supplierTypeId,
      name: data.name,
      vatNumber: data.vatNumber ?? null,
      address: data.address ?? null,
      pec: data.pec ?? null,
      contactName: data.contactName ?? null,
      contactPhone: data.contactPhone ?? null,
      contactEmail: data.contactEmail ?? null,
      notes: data.notes ?? null,
    },
    include: INCLUDE_DETAILS,
  }) as unknown as Promise<SupplierWithType>;
}

// ---------------------------------------------------------------------------
// Update supplier
// ---------------------------------------------------------------------------

export async function updateSupplier(
  prisma: PrismaClientWithTenant,
  id: number,
  data: UpdateSupplierInput
): Promise<SupplierWithType> {
  return prisma.supplier.update({
    where: { id },
    data: {
      supplierTypeId: data.supplierTypeId,
      name: data.name,
      vatNumber: data.vatNumber ?? null,
      address: data.address ?? null,
      pec: data.pec ?? null,
      contactName: data.contactName ?? null,
      contactPhone: data.contactPhone ?? null,
      contactEmail: data.contactEmail ?? null,
      notes: data.notes ?? null,
    },
    include: INCLUDE_DETAILS,
  }) as unknown as Promise<SupplierWithType>;
}

// ---------------------------------------------------------------------------
// Get supplier by ID
// ---------------------------------------------------------------------------

export async function getSupplierById(
  prisma: PrismaClientWithTenant,
  id: number
): Promise<SupplierWithType | null> {
  const result = await prisma.supplier.findFirst({
    where: { id },
    include: INCLUDE_DETAILS,
  });
  return result as unknown as SupplierWithType | null;
}

// ---------------------------------------------------------------------------
// List suppliers with pagination and filters
// ---------------------------------------------------------------------------

export async function getSuppliers(
  prisma: PrismaClientWithTenant,
  filters: SupplierFilterInput
): Promise<PaginatedResult<SupplierWithType>> {
  const { search, supplierTypeId, isActive, page, pageSize } = filters;

  const where: Record<string, unknown> = {};

  if (supplierTypeId) {
    where.supplierTypeId = supplierTypeId;
  }

  if (isActive === "true") {
    where.isActive = true;
  } else if (isActive === "false") {
    where.isActive = false;
  }

  if (search && search.trim()) {
    const term = search.trim();
    where.OR = [
      { name: { contains: term } },
      { vatNumber: { contains: term } },
      { pec: { contains: term } },
      { contactName: { contains: term } },
    ];
  }

  const [data, totalCount] = await Promise.all([
    prisma.supplier.findMany({
      where,
      include: INCLUDE_DETAILS,
      orderBy: { name: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.supplier.count({ where }),
  ]);

  return {
    data: data as unknown as SupplierWithType[],
    pagination: {
      page,
      pageSize,
      totalCount,
      totalPages: Math.ceil(totalCount / pageSize),
    },
  };
}

// ---------------------------------------------------------------------------
// Get suppliers by type code (for dropdowns)
// ---------------------------------------------------------------------------

export async function getSuppliersByTypeCode(
  prisma: PrismaClientWithTenant,
  typeCode: string
): Promise<SupplierWithType[]> {
  const results = await prisma.supplier.findMany({
    where: {
      isActive: true,
      supplierType: {
        code: typeCode,
      },
    },
    include: INCLUDE_DETAILS,
    orderBy: { name: "asc" },
  });
  return results as unknown as SupplierWithType[];
}

// ---------------------------------------------------------------------------
// Toggle supplier active status
// ---------------------------------------------------------------------------

export async function toggleSupplierActive(
  prisma: PrismaClientWithTenant,
  id: number,
  isActive: boolean
): Promise<SupplierWithType> {
  return prisma.supplier.update({
    where: { id },
    data: { isActive },
    include: INCLUDE_DETAILS,
  }) as unknown as Promise<SupplierWithType>;
}
