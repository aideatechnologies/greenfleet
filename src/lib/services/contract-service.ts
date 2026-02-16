import type {
  Contract,
  Supplier,
  SupplierType,
  TenantVehicle,
  CatalogVehicle,
} from "@/generated/prisma/client";
import type { PrismaClientWithTenant } from "@/lib/db/client";
import type { PaginatedResult } from "@/types/pagination";
import type { ContractInput, ContractFilterInput, UpdateContractInput } from "@/lib/schemas/contract";
import type { ContractType } from "@/types/contract";
import {
  ExpiryStatus,
  EXPIRY_THRESHOLDS,
  type ContractStatusRow,
  type ContractStatusKpi,
} from "@/types/domain";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type ContractWithDetails = Contract & {
  vehicle: TenantVehicle & {
    catalogVehicle: CatalogVehicle;
  };
  supplierRef?: (Supplier & { supplierType: SupplierType }) | null;
};

// ---------------------------------------------------------------------------
// Include standard for detail queries
// ---------------------------------------------------------------------------

const INCLUDE_DETAILS = {
  vehicle: {
    include: {
      catalogVehicle: true,
    },
  },
  supplierRef: {
    include: {
      supplierType: true,
    },
  },
} as const;

// ---------------------------------------------------------------------------
// Create contract
// ---------------------------------------------------------------------------

export async function createContract(
  prisma: PrismaClientWithTenant,
  data: ContractInput
): Promise<ContractWithDetails> {
  const createData: Record<string, unknown> = {
    tenantId: "", // Overwritten by tenant extension
    vehicleId: data.vehicleId,
    type: data.type,
    status: "ACTIVE",
    notes: data.notes ?? null,
    contractKm: (data as Record<string, unknown>).contractKm ?? null,
  };

  // Type-specific fields
  switch (data.type) {
    case "PROPRIETARIO":
      createData.purchaseDate = data.purchaseDate;
      createData.purchasePrice = data.purchasePrice;
      createData.residualValue = data.residualValue ?? null;
      break;
    case "BREVE_TERMINE":
      createData.supplierId = data.supplierId;
      createData.startDate = data.startDate;
      createData.endDate = data.endDate;
      createData.dailyRate = data.dailyRate;
      createData.includedKm = data.includedKm ?? null;
      break;
    case "LUNGO_TERMINE":
      createData.supplierId = data.supplierId;
      createData.startDate = data.startDate;
      createData.endDate = data.endDate;
      createData.monthlyRate = data.monthlyRate;
      createData.franchiseKm = data.franchiseKm ?? null;
      createData.extraKmPenalty = data.extraKmPenalty ?? null;
      createData.includedServices = data.includedServices ?? null;
      break;
    case "LEASING_FINANZIARIO":
      createData.supplierId = data.supplierId;
      createData.startDate = data.startDate;
      createData.endDate = data.endDate;
      createData.monthlyRate = data.monthlyRate;
      createData.buybackValue = data.buybackValue ?? null;
      createData.maxDiscount = data.maxDiscount ?? null;
      break;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return prisma.contract.create({
    data: createData as any,
    include: INCLUDE_DETAILS,
  }) as unknown as Promise<ContractWithDetails>;
}

// ---------------------------------------------------------------------------
// List contracts with pagination and filters
// ---------------------------------------------------------------------------

export async function getContracts(
  prisma: PrismaClientWithTenant,
  filters: ContractFilterInput
): Promise<PaginatedResult<ContractWithDetails>> {
  const { search, type, status, page, pageSize, sortBy, sortOrder } = filters;

  const where: Record<string, unknown> = {};

  if (type) {
    where.type = type;
  }

  if (status) {
    where.status = status;
  }

  if (search && search.trim()) {
    const term = search.trim();
    where.vehicle = {
      OR: [
        { licensePlate: { contains: term } },
        {
          catalogVehicle: {
            OR: [
              { marca: { contains: term } },
              { modello: { contains: term } },
            ],
          },
        },
      ],
    };
  }

  const orderBy: Record<string, string> = {};
  if (sortBy) {
    orderBy[sortBy] = sortOrder ?? "asc";
  } else {
    orderBy.createdAt = "desc";
  }

  const [data, totalCount] = await Promise.all([
    prisma.contract.findMany({
      where,
      include: INCLUDE_DETAILS,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.contract.count({ where }),
  ]);

  return {
    data: data as unknown as ContractWithDetails[],
    pagination: {
      page,
      pageSize,
      totalCount,
      totalPages: Math.ceil(totalCount / pageSize),
    },
  };
}

// ---------------------------------------------------------------------------
// Get single contract by ID
// ---------------------------------------------------------------------------

export async function getContractById(
  prisma: PrismaClientWithTenant,
  id: number
): Promise<ContractWithDetails | null> {
  const result = await prisma.contract.findFirst({
    where: { id },
    include: INCLUDE_DETAILS,
  });
  return result as unknown as ContractWithDetails | null;
}

// ---------------------------------------------------------------------------
// Update contract (type is NOT changeable)
// ---------------------------------------------------------------------------

export async function updateContract(
  prisma: PrismaClientWithTenant,
  id: number,
  data: UpdateContractInput
): Promise<ContractWithDetails> {
  const updateData: Record<string, unknown> = {
    notes: data.notes ?? null,
    contractKm: (data as Record<string, unknown>).contractKm ?? null,
  };

  // Type-specific fields
  switch (data.type) {
    case "PROPRIETARIO":
      updateData.purchaseDate = data.purchaseDate;
      updateData.purchasePrice = data.purchasePrice;
      updateData.residualValue = data.residualValue ?? null;
      break;
    case "BREVE_TERMINE":
      updateData.supplierId = data.supplierId;
      updateData.startDate = data.startDate;
      updateData.endDate = data.endDate;
      updateData.dailyRate = data.dailyRate;
      updateData.includedKm = data.includedKm ?? null;
      break;
    case "LUNGO_TERMINE":
      updateData.supplierId = data.supplierId;
      updateData.startDate = data.startDate;
      updateData.endDate = data.endDate;
      updateData.monthlyRate = data.monthlyRate;
      updateData.franchiseKm = data.franchiseKm ?? null;
      updateData.extraKmPenalty = data.extraKmPenalty ?? null;
      updateData.includedServices = data.includedServices ?? null;
      break;
    case "LEASING_FINANZIARIO":
      updateData.supplierId = data.supplierId;
      updateData.startDate = data.startDate;
      updateData.endDate = data.endDate;
      updateData.monthlyRate = data.monthlyRate;
      updateData.buybackValue = data.buybackValue ?? null;
      updateData.maxDiscount = data.maxDiscount ?? null;
      break;
  }

  return prisma.contract.update({
    where: { id },
    data: updateData,
    include: INCLUDE_DETAILS,
  }) as unknown as Promise<ContractWithDetails>;
}

// ---------------------------------------------------------------------------
// Close contract (soft close)
// ---------------------------------------------------------------------------

export async function closeContract(
  prisma: PrismaClientWithTenant,
  id: number
): Promise<ContractWithDetails> {
  return prisma.contract.update({
    where: { id },
    data: { status: "CLOSED", closedAt: new Date() },
    include: INCLUDE_DETAILS,
  }) as unknown as Promise<ContractWithDetails>;
}

// ---------------------------------------------------------------------------
// Get contracts by vehicle
// ---------------------------------------------------------------------------

export async function getContractsByVehicle(
  prisma: PrismaClientWithTenant,
  vehicleId: number
): Promise<ContractWithDetails[]> {
  const results = await prisma.contract.findMany({
    where: { vehicleId },
    include: INCLUDE_DETAILS,
    orderBy: { createdAt: "desc" },
  });
  return results as unknown as ContractWithDetails[];
}

// ---------------------------------------------------------------------------
// Create contract with succession handling
// ---------------------------------------------------------------------------

/**
 * Creates a contract with succession handling.
 * If the vehicle already has an ACTIVE contract, it closes that contract
 * before creating the new one.
 *
 * Returns { contract, closedContract } where closedContract is the previously
 * active contract that was closed, or null if there was none.
 */
export async function createContractWithSuccession(
  prisma: PrismaClientWithTenant,
  data: ContractInput
): Promise<{ contract: ContractWithDetails; closedContract: ContractWithDetails | null }> {
  // Check for existing active contract
  const vehicleId = data.vehicleId as number;
  const activeContract = await prisma.contract.findFirst({
    where: {
      vehicleId,
      status: "ACTIVE",
    },
    include: INCLUDE_DETAILS,
  }) as unknown as ContractWithDetails | null;

  let closedContract: ContractWithDetails | null = null;

  if (activeContract) {
    // Determine the close date
    const closeDate =
      "startDate" in data && data.startDate
        ? data.startDate
        : "purchaseDate" in data && data.purchaseDate
          ? data.purchaseDate
          : new Date();

    // Close the previous contract
    closedContract = (await prisma.contract.update({
      where: { id: activeContract.id },
      data: {
        status: "CLOSED",
        closedAt: closeDate,
        // For contracts with endDate, set it to the close date if it's after
        ...(activeContract.endDate === null ||
        (activeContract.endDate && activeContract.endDate > closeDate)
          ? { endDate: closeDate }
          : {}),
      },
      include: INCLUDE_DETAILS,
    })) as unknown as ContractWithDetails;
  }

  // Create the new contract
  const contract = await createContract(prisma, data);

  return { contract, closedContract };
}

// ---------------------------------------------------------------------------
// Get active contract for a vehicle
// ---------------------------------------------------------------------------

/**
 * Get the active contract for a vehicle.
 */
export async function getActiveContractForVehicle(
  prisma: PrismaClientWithTenant,
  vehicleId: number
): Promise<ContractWithDetails | null> {
  const result = await prisma.contract.findFirst({
    where: {
      vehicleId,
      status: "ACTIVE",
    },
    include: INCLUDE_DETAILS,
  });
  return result as unknown as ContractWithDetails | null;
}

// ---------------------------------------------------------------------------
// Calculate expiry status for a contract
// ---------------------------------------------------------------------------

/**
 * Calculate the expiry status of a contract based on its endDate.
 * Returns { expiryStatus, daysToExpiry }.
 *
 * - PROPRIETARIO contracts with no endDate are always OK.
 * - Contracts with endDate in the past are EXPIRED.
 * - Contracts expiring within 30/60/90 days get the corresponding status.
 */
export function calculateExpiryStatus(contract: {
  type: string;
  endDate: Date | null;
}): { expiryStatus: ExpiryStatus; daysToExpiry: number | null } {
  // PROPRIETARIO contracts typically have no endDate -> always OK
  if (!contract.endDate) {
    return { expiryStatus: ExpiryStatus.OK, daysToExpiry: null };
  }

  const now = new Date();
  const end = new Date(contract.endDate);
  const diffMs = end.getTime() - now.getTime();
  const daysToExpiry = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (daysToExpiry < 0) {
    return { expiryStatus: ExpiryStatus.EXPIRED, daysToExpiry };
  }
  if (daysToExpiry <= EXPIRY_THRESHOLDS.CRITICAL) {
    return { expiryStatus: ExpiryStatus.EXPIRING_30, daysToExpiry };
  }
  if (daysToExpiry <= EXPIRY_THRESHOLDS.WARNING) {
    return { expiryStatus: ExpiryStatus.EXPIRING_60, daysToExpiry };
  }
  if (daysToExpiry <= EXPIRY_THRESHOLDS.NOTICE) {
    return { expiryStatus: ExpiryStatus.EXPIRING_90, daysToExpiry };
  }
  return { expiryStatus: ExpiryStatus.OK, daysToExpiry };
}

// ---------------------------------------------------------------------------
// Contract status overview — no N+1!
// ---------------------------------------------------------------------------

export type ContractStatusOverviewFilters = {
  contractType?: string;
  expiryStatus?: ExpiryStatus;
  search?: string;
};

export type ContractStatusOverviewResult = {
  rows: ContractStatusRow[];
  kpi: ContractStatusKpi;
};

/**
 * Load all tenant vehicles with their active contracts and compute
 * expiry status for each. This is a single query (no N+1).
 *
 * Filtering by contractType and expiryStatus is done in-memory after
 * the single query because the expiry status is computed, not stored.
 */
export async function getContractStatusOverview(
  prisma: PrismaClientWithTenant,
  filters?: ContractStatusOverviewFilters
): Promise<ContractStatusOverviewResult> {
  // Single query: all vehicles with their ACTIVE contracts + supplier
  const vehicles = await prisma.tenantVehicle.findMany({
    where: {
      status: "ACTIVE", // Only active vehicles
    },
    include: {
      catalogVehicle: true,
      contracts: {
        where: { status: "ACTIVE" },
        take: 1, // At most 1 active contract per vehicle (business rule)
        include: {
          supplierRef: true,
        },
      },
    },
    orderBy: { licensePlate: "asc" },
  });

  // Build rows with computed expiry status
  let rows: ContractStatusRow[] = vehicles.map((v) => {
    const contract = v.contracts[0] ?? null;

    if (!contract) {
      return {
        vehicle: {
          id: Number(v.id),
          licensePlate: v.licensePlate,
          make: v.catalogVehicle.marca,
          model: v.catalogVehicle.modello,
          trim: v.catalogVehicle.allestimento ?? undefined,
        },
        activeContract: null,
        expiryStatus: ExpiryStatus.NO_CONTRACT,
        daysToExpiry: null,
      };
    }

    const { expiryStatus, daysToExpiry } = calculateExpiryStatus(contract);

    return {
      vehicle: {
        id: Number(v.id),
        licensePlate: v.licensePlate,
        make: v.catalogVehicle.marca,
        model: v.catalogVehicle.modello,
        trim: v.catalogVehicle.allestimento ?? undefined,
      },
      activeContract: {
        id: Number(contract.id),
        type: contract.type as ContractType,
        startDate: contract.startDate,
        endDate: contract.endDate,
        supplierName: (contract as unknown as { supplierRef?: { name: string } | null }).supplierRef?.name
          ?? contract.leasingCompany
          ?? contract.supplier
          ?? null,
        supplierId: contract.supplierId != null ? Number(contract.supplierId) : null,
        monthlyRate: contract.monthlyRate,
        dailyRate: contract.dailyRate,
        purchasePrice: contract.purchasePrice,
      },
      expiryStatus,
      daysToExpiry,
    };
  });

  // Compute KPIs before filtering (to show global counts)
  const kpi: ContractStatusKpi = {
    totalVehicles: rows.length,
    withContract: rows.filter((r) => r.activeContract !== null).length,
    noContract: rows.filter((r) => r.expiryStatus === ExpiryStatus.NO_CONTRACT).length,
    expired: rows.filter((r) => r.expiryStatus === ExpiryStatus.EXPIRED).length,
    expiring30: rows.filter((r) => r.expiryStatus === ExpiryStatus.EXPIRING_30).length,
    expiring60: rows.filter((r) => r.expiryStatus === ExpiryStatus.EXPIRING_60).length,
    expiring90: rows.filter((r) => r.expiryStatus === ExpiryStatus.EXPIRING_90).length,
  };

  // Apply filters in-memory
  if (filters?.contractType) {
    rows = rows.filter(
      (r) => r.activeContract?.type === filters.contractType
    );
  }

  if (filters?.expiryStatus) {
    rows = rows.filter((r) => r.expiryStatus === filters.expiryStatus);
  }

  if (filters?.search?.trim()) {
    const term = filters.search.trim().toLowerCase();
    rows = rows.filter(
      (r) =>
        r.vehicle.licensePlate.toLowerCase().includes(term) ||
        r.vehicle.make.toLowerCase().includes(term) ||
        r.vehicle.model.toLowerCase().includes(term) ||
        (r.vehicle.trim?.toLowerCase().includes(term) ?? false)
    );
  }

  return { rows, kpi };
}
