import type { PrismaClientWithTenant } from "@/lib/db/client";
import type { PaginatedResult } from "@/types/pagination";
import type {
  FleetVehicleOverview,
  FleetEmployeeOverview,
  FleetSummaryKPIs,
} from "@/types/fleet-overview";
import type { FleetOverviewFilterInput, EmployeeOverviewFilterInput } from "@/lib/schemas/fleet-overview";
import type { ContractType } from "@/types/contract";
import { EXPIRY_THRESHOLDS } from "@/types/domain";

// ---------------------------------------------------------------------------
// Get fleet vehicle overview (paginated)
// ---------------------------------------------------------------------------

export async function getFleetOverview(
  prisma: PrismaClientWithTenant,
  filters: FleetOverviewFilterInput
): Promise<PaginatedResult<FleetVehicleOverview>> {
  const { search, vehicleStatus, assignmentStatus, contractStatus, carlistId, page, pageSize, sortBy, sortOrder } = filters;

  const where: Record<string, unknown> = {};

  // Vehicle status filter
  if (vehicleStatus) {
    where.status = vehicleStatus;
  }

  // Assignment status filter
  if (assignmentStatus === "ASSIGNED") {
    where.assignedEmployeeId = { not: null };
    // Exclude pool
    where.assignedEmployee = { isPool: false };
  } else if (assignmentStatus === "UNASSIGNED") {
    where.assignedEmployeeId = null;
  } else if (assignmentStatus === "POOL") {
    where.assignedEmployee = { isPool: true };
  }

  // Contract status filter — we filter in-memory after the query
  // because contract expiry is computed, not stored.
  // However, basic has/no contract can be partially pushed to Prisma.

  // Carlist filter
  if (carlistId) {
    where.carlists = {
      some: { carlistId },
    };
  }

  // Search filter
  if (search && search.trim()) {
    const term = search.trim();
    where.OR = [
      { licensePlate: { contains: term } },
      {
        catalogVehicle: {
          OR: [
            { marca: { contains: term } },
            { modello: { contains: term } },
          ],
        },
      },
      {
        assignedEmployee: {
          OR: [
            { firstName: { contains: term } },
            { lastName: { contains: term } },
          ],
        },
      },
    ];
  }

  // Sorting
  const orderBy: Record<string, unknown> = {};
  if (sortBy === "make") {
    orderBy.catalogVehicle = { marca: sortOrder ?? "asc" };
  } else if (sortBy) {
    orderBy[sortBy] = sortOrder ?? "asc";
  } else {
    orderBy.licensePlate = "asc";
  }

  const now = new Date();

  // Single query with includes to avoid N+1
  const [rawData, totalCountRaw] = await Promise.all([
    prisma.tenantVehicle.findMany({
      where,
      include: {
        catalogVehicle: true,
        assignedEmployee: true,
        contracts: {
          where: { status: "ACTIVE" },
          take: 1,
          select: {
            id: true,
            type: true,
            endDate: true,
          },
        },
        documents: {
          select: {
            id: true,
            expiryDate: true,
          },
        },
      },
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.tenantVehicle.count({ where }),
  ]);

  // Map raw data to FleetVehicleOverview
  let data: FleetVehicleOverview[] = (rawData as unknown as RawFleetVehicle[]).map((v) => {
    const contract = v.contracts[0] ?? null;
    const emp = v.assignedEmployee;
    const docCount = v.documents.length;
    const expiredDocs = v.documents.filter(
      (d: { expiryDate: Date }) => new Date(d.expiryDate) < now
    ).length;

    let assignmentStatus: FleetVehicleOverview["assignmentStatus"];
    if (!emp) {
      assignmentStatus = "UNASSIGNED";
    } else if (emp.isPool) {
      assignmentStatus = "POOL";
    } else {
      assignmentStatus = "ASSIGNED";
    }

    return {
      id: v.id,
      licensePlate: v.licensePlate,
      make: v.catalogVehicle.marca,
      model: v.catalogVehicle.modello,
      trim: v.catalogVehicle.allestimento ?? undefined,
      vehicleStatus: v.status as FleetVehicleOverview["vehicleStatus"],
      assignmentStatus,
      assignedEmployee: emp
        ? {
            id: emp.id,
            firstName: emp.firstName,
            lastName: emp.lastName,
            isPool: emp.isPool,
          }
        : null,
      activeContract: contract
        ? {
            id: contract.id,
            type: contract.type as ContractType,
            endDate: contract.endDate,
          }
        : null,
      documentCount: docCount,
      expiredDocumentCount: expiredDocs,
    };
  });

  // Apply contract status filter in-memory (expiry is computed)
  let totalCount = totalCountRaw;
  if (contractStatus) {
    const expiryThresholdDate = new Date();
    expiryThresholdDate.setDate(expiryThresholdDate.getDate() + EXPIRY_THRESHOLDS.NOTICE);

    data = data.filter((v) => {
      switch (contractStatus) {
        case "HAS_CONTRACT":
          return v.activeContract !== null;
        case "NO_CONTRACT":
          return v.activeContract === null;
        case "EXPIRING":
          return (
            v.activeContract !== null &&
            v.activeContract.endDate !== null &&
            new Date(v.activeContract.endDate) <= expiryThresholdDate
          );
        default:
          return true;
      }
    });
    // When filtering in-memory, adjust total count
    // Note: this is an approximation for contract status filters
    totalCount = data.length;
  }

  return {
    data,
    pagination: {
      page,
      pageSize,
      totalCount,
      totalPages: Math.ceil(totalCount / pageSize),
    },
  };
}

// ---------------------------------------------------------------------------
// Get employee overview (paginated)
// ---------------------------------------------------------------------------

export async function getEmployeeOverview(
  prisma: PrismaClientWithTenant,
  filters: EmployeeOverviewFilterInput
): Promise<PaginatedResult<FleetEmployeeOverview>> {
  const { search, status, assignmentStatus, page, pageSize, sortBy, sortOrder } = filters;

  const where: Record<string, unknown> = {};

  // Status filter
  if (status === "ACTIVE") {
    where.isActive = true;
  } else if (status === "INACTIVE") {
    where.isActive = false;
  }

  // Assignment status filter
  if (assignmentStatus === "ASSIGNED") {
    where.tenantVehicles = { some: {} };
  } else if (assignmentStatus === "UNASSIGNED") {
    where.tenantVehicles = { none: {} };
  }

  // Search filter
  if (search && search.trim()) {
    const term = search.trim();
    where.OR = [
      { firstName: { contains: term } },
      { lastName: { contains: term } },
      { email: { contains: term } },
    ];
  }

  // Sorting
  const orderBy: Record<string, string> = {};
  if (sortBy) {
    orderBy[sortBy] = sortOrder ?? "asc";
  } else {
    orderBy.lastName = "asc";
  }

  const [rawData, totalCount] = await Promise.all([
    prisma.employee.findMany({
      where,
      include: {
        tenantVehicles: {
          where: { status: "ACTIVE" },
          take: 1,
          include: {
            catalogVehicle: {
              select: {
                marca: true,
                modello: true,
              },
            },
          },
        },
      },
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.employee.count({ where }),
  ]);

  const data: FleetEmployeeOverview[] = (rawData as unknown as RawEmployee[]).map((emp) => {
    const vehicle = emp.tenantVehicles[0] ?? null;

    return {
      id: emp.id,
      firstName: emp.firstName,
      lastName: emp.lastName,
      email: emp.email,
      isPool: emp.isPool,
      isActive: emp.isActive,
      assignedVehicle: vehicle
        ? {
            id: vehicle.id,
            licensePlate: vehicle.licensePlate,
            make: vehicle.catalogVehicle.marca,
            model: vehicle.catalogVehicle.modello,
          }
        : null,
    };
  });

  return {
    data,
    pagination: {
      page,
      pageSize,
      totalCount,
      totalPages: Math.ceil(totalCount / pageSize),
    },
  };
}

// ---------------------------------------------------------------------------
// Get fleet summary KPIs
// ---------------------------------------------------------------------------

export async function getFleetSummaryKPIs(
  prisma: PrismaClientWithTenant
): Promise<FleetSummaryKPIs> {
  const now = new Date();
  const expiryThresholdDate = new Date();
  expiryThresholdDate.setDate(expiryThresholdDate.getDate() + EXPIRY_THRESHOLDS.NOTICE);

  const [
    totalVehicles,
    activeVehicles,
    assignedVehicles,
    activeContracts,
    expiringContracts,
    expiredDocuments,
    totalEmployees,
    activeEmployees,
    unassignedEmployees,
  ] = await Promise.all([
    // Total vehicles
    prisma.tenantVehicle.count(),
    // Active vehicles
    prisma.tenantVehicle.count({ where: { status: "ACTIVE" } }),
    // Assigned vehicles (active + has an assigned employee)
    prisma.tenantVehicle.count({
      where: {
        status: "ACTIVE",
        assignedEmployeeId: { not: null },
      },
    }),
    // Active contracts
    prisma.contract.count({ where: { status: "ACTIVE" } }),
    // Expiring contracts (within 90 days)
    prisma.contract.count({
      where: {
        status: "ACTIVE",
        endDate: {
          not: null,
          lte: expiryThresholdDate,
        },
      },
    }),
    // Expired documents
    prisma.vehicleDocument.count({
      where: {
        expiryDate: { lt: now },
      },
    }),
    // Total employees
    prisma.employee.count(),
    // Active employees
    prisma.employee.count({ where: { isActive: true } }),
    // Unassigned active employees (no vehicle assigned to them)
    prisma.employee.count({
      where: {
        isActive: true,
        tenantVehicles: { none: {} },
      },
    }),
  ]);

  const freeVehicles = activeVehicles - assignedVehicles;

  return {
    totalVehicles,
    activeVehicles,
    assignedVehicles,
    freeVehicles: freeVehicles > 0 ? freeVehicles : 0,
    activeContracts,
    expiringContracts,
    expiredDocuments,
    totalEmployees,
    activeEmployees,
    unassignedEmployees,
  };
}

// ---------------------------------------------------------------------------
// Internal raw types for Prisma query results
// ---------------------------------------------------------------------------

type RawFleetVehicle = {
  id: number;
  licensePlate: string;
  status: string;
  catalogVehicle: {
    marca: string;
    modello: string;
    allestimento: string | null;
  };
  assignedEmployee: {
    id: number;
    firstName: string;
    lastName: string;
    isPool: boolean;
  } | null;
  contracts: Array<{
    id: number;
    type: string;
    endDate: Date | null;
  }>;
  documents: Array<{
    id: number;
    expiryDate: Date;
  }>;
};

type RawEmployee = {
  id: number;
  firstName: string;
  lastName: string;
  email: string | null;
  isPool: boolean;
  isActive: boolean;
  tenantVehicles: Array<{
    id: number;
    licensePlate: string;
    catalogVehicle: {
      marca: string;
      modello: string;
    };
  }>;
};
