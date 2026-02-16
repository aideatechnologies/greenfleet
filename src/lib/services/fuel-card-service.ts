import type {
  FuelCard,
  Supplier,
  SupplierType,
  TenantVehicle,
  CatalogVehicle,
  Employee,
} from "@/generated/prisma/client";
import type { PrismaClientWithTenant } from "@/lib/db/client";
import type { PaginatedResult } from "@/types/pagination";
import type {
  CreateFuelCardInput,
  UpdateFuelCardInput,
  FuelCardFilterInput,
} from "@/lib/schemas/fuel-card";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type FuelCardWithDetails = FuelCard & {
  supplier: (Supplier & { supplierType: SupplierType }) | null;
  assignedVehicle:
    | (TenantVehicle & { catalogVehicle: CatalogVehicle })
    | null;
  assignedEmployee: Employee | null;
};

// ---------------------------------------------------------------------------
// Include standard
// ---------------------------------------------------------------------------

const INCLUDE_DETAILS = {
  supplier: {
    include: { supplierType: true },
  },
  assignedVehicle: {
    include: { catalogVehicle: true },
  },
  assignedEmployee: true,
} as const;

// ---------------------------------------------------------------------------
// Create fuel card
// ---------------------------------------------------------------------------

export async function createFuelCard(
  prisma: PrismaClientWithTenant,
  data: CreateFuelCardInput
): Promise<FuelCardWithDetails> {
  return prisma.fuelCard.create({
    data: {
      tenantId: "", // Overwritten by tenant extension
      cardNumber: data.cardNumber,
      issuer: data.issuer,
      supplierId: data.supplierId ?? null,
      expiryDate: data.expiryDate ?? null,
      status: data.status,
      assignmentType: data.assignmentType,
      assignedVehicleId: data.assignedVehicleId ?? null,
      assignedEmployeeId: data.assignedEmployeeId ?? null,
      notes: data.notes ?? null,
    },
    include: INCLUDE_DETAILS,
  }) as unknown as Promise<FuelCardWithDetails>;
}

// ---------------------------------------------------------------------------
// Update fuel card
// ---------------------------------------------------------------------------

export async function updateFuelCard(
  prisma: PrismaClientWithTenant,
  id: number,
  data: UpdateFuelCardInput
): Promise<FuelCardWithDetails> {
  return prisma.fuelCard.update({
    where: { id },
    data: {
      cardNumber: data.cardNumber,
      issuer: data.issuer,
      supplierId: data.supplierId ?? null,
      expiryDate: data.expiryDate ?? null,
      status: data.status,
      assignmentType: data.assignmentType,
      assignedVehicleId: data.assignedVehicleId ?? null,
      assignedEmployeeId: data.assignedEmployeeId ?? null,
      notes: data.notes ?? null,
    },
    include: INCLUDE_DETAILS,
  }) as unknown as Promise<FuelCardWithDetails>;
}

// ---------------------------------------------------------------------------
// Get fuel card by ID
// ---------------------------------------------------------------------------

export async function getFuelCardById(
  prisma: PrismaClientWithTenant,
  id: number
): Promise<FuelCardWithDetails | null> {
  const result = await prisma.fuelCard.findFirst({
    where: { id },
    include: INCLUDE_DETAILS,
  });
  return result as unknown as FuelCardWithDetails | null;
}

// ---------------------------------------------------------------------------
// List fuel cards with pagination and filters
// ---------------------------------------------------------------------------

export async function getFuelCards(
  prisma: PrismaClientWithTenant,
  filters: FuelCardFilterInput
): Promise<PaginatedResult<FuelCardWithDetails>> {
  const { search, status, assignmentType, supplierId, page, pageSize } =
    filters;

  const where: Record<string, unknown> = {};

  if (status) where.status = status;
  if (assignmentType) where.assignmentType = assignmentType;
  if (supplierId) where.supplierId = supplierId;

  if (search && search.trim()) {
    const term = search.trim();
    where.OR = [
      { cardNumber: { contains: term } },
      { issuer: { contains: term } },
      { notes: { contains: term } },
    ];
  }

  const [data, totalCount] = await Promise.all([
    prisma.fuelCard.findMany({
      where,
      include: INCLUDE_DETAILS,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.fuelCard.count({ where }),
  ]);

  return {
    data: data as unknown as FuelCardWithDetails[],
    pagination: {
      page,
      pageSize,
      totalCount,
      totalPages: Math.ceil(totalCount / pageSize),
    },
  };
}

// ---------------------------------------------------------------------------
// Get fuel cards by vehicle
// ---------------------------------------------------------------------------

export async function getFuelCardsByVehicle(
  prisma: PrismaClientWithTenant,
  vehicleId: number
): Promise<FuelCardWithDetails[]> {
  const results = await prisma.fuelCard.findMany({
    where: { assignedVehicleId: vehicleId },
    include: INCLUDE_DETAILS,
    orderBy: { createdAt: "desc" },
  });
  return results as unknown as FuelCardWithDetails[];
}

// ---------------------------------------------------------------------------
// Get fuel cards by employee
// ---------------------------------------------------------------------------

export async function getFuelCardsByEmployee(
  prisma: PrismaClientWithTenant,
  employeeId: number
): Promise<FuelCardWithDetails[]> {
  const results = await prisma.fuelCard.findMany({
    where: { assignedEmployeeId: employeeId },
    include: INCLUDE_DETAILS,
    orderBy: { createdAt: "desc" },
  });
  return results as unknown as FuelCardWithDetails[];
}

// ---------------------------------------------------------------------------
// Toggle fuel card status
// ---------------------------------------------------------------------------

export async function toggleFuelCardStatus(
  prisma: PrismaClientWithTenant,
  id: number,
  status: string
): Promise<FuelCardWithDetails> {
  return prisma.fuelCard.update({
    where: { id },
    data: { status },
    include: INCLUDE_DETAILS,
  }) as unknown as Promise<FuelCardWithDetails>;
}
