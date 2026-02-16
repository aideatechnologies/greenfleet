import type {
  Carlist,
  CarlistVehicle,
  CatalogVehicle,
  Engine,
} from "@/generated/prisma/client";
import type { PrismaClientWithTenant } from "@/lib/db/client";
import type { PaginatedResult } from "@/types/pagination";
import type { ActionResult } from "@/types/action-result";
import { ErrorCode } from "@/types/action-result";
import type {
  CarlistFilterInput,
  CreateCarlistInput,
  UpdateCarlistInput,
} from "@/lib/schemas/carlist";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type CarlistWithCount = Carlist & {
  _count: { vehicles: number };
};

export type CarlistWithVehicles = Carlist & {
  vehicles: (CarlistVehicle & {
    catalogVehicle: CatalogVehicle & {
      engines: Engine[];
    };
  })[];
};

export type CarlistOption = {
  id: number;
  name: string;
};

// ---------------------------------------------------------------------------
// Include standard for detail queries
// ---------------------------------------------------------------------------

const INCLUDE_VEHICLES = {
  vehicles: {
    include: {
      catalogVehicle: {
        include: {
          engines: true,
        },
      },
    },
    orderBy: { addedAt: "desc" as const },
  },
} as const;

// ---------------------------------------------------------------------------
// List carlists with pagination and filters
// ---------------------------------------------------------------------------

export async function getCarlists(
  prisma: PrismaClientWithTenant,
  filters: CarlistFilterInput
): Promise<PaginatedResult<CarlistWithCount>> {
  const { search, page, pageSize, sortBy, sortOrder } = filters;

  const where: Record<string, unknown> = {};

  if (search && search.trim()) {
    const term = search.trim();
    where.OR = [
      { name: { contains: term } },
      { description: { contains: term } },
    ];
  }

  const orderBy: Record<string, string> = {};
  if (sortBy) {
    orderBy[sortBy] = sortOrder ?? "asc";
  } else {
    orderBy.createdAt = "desc";
  }

  const [data, totalCount] = await Promise.all([
    prisma.carlist.findMany({
      where,
      include: {
        _count: {
          select: { vehicles: true },
        },
      },
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.carlist.count({ where }),
  ]);

  return {
    data: data as unknown as CarlistWithCount[],
    pagination: {
      page,
      pageSize,
      totalCount,
      totalPages: Math.ceil(totalCount / pageSize),
    },
  };
}

// ---------------------------------------------------------------------------
// Get single carlist by ID with vehicles
// ---------------------------------------------------------------------------

export async function getCarlistById(
  prisma: PrismaClientWithTenant,
  id: number
): Promise<CarlistWithVehicles | null> {
  const result = await prisma.carlist.findFirst({
    where: { id },
    include: INCLUDE_VEHICLES,
  });
  return result as unknown as CarlistWithVehicles | null;
}

// ---------------------------------------------------------------------------
// Create carlist
// ---------------------------------------------------------------------------

export async function createCarlist(
  prisma: PrismaClientWithTenant,
  input: CreateCarlistInput,
  userId: string
): Promise<ActionResult<Carlist>> {
  // Check unique name within tenant
  const existing = await prisma.carlist.findFirst({
    where: { name: input.name },
  });

  if (existing) {
    return {
      success: false,
      error: `Esiste gia una carlist con il nome "${input.name}"`,
      code: ErrorCode.CONFLICT,
    };
  }

  const carlist = await prisma.carlist.create({
    data: {
      tenantId: "", // Overwritten by tenant extension
      name: input.name,
      description: input.description ?? null,
      createdBy: userId,
    },
  });

  return { success: true, data: carlist };
}

// ---------------------------------------------------------------------------
// Update carlist
// ---------------------------------------------------------------------------

export async function updateCarlist(
  prisma: PrismaClientWithTenant,
  id: number,
  input: UpdateCarlistInput
): Promise<ActionResult<Carlist>> {
  // Verify carlist exists
  const carlist = await prisma.carlist.findFirst({
    where: { id },
  });

  if (!carlist) {
    return {
      success: false,
      error: "Carlist non trovata",
      code: ErrorCode.NOT_FOUND,
    };
  }

  // Check unique name excluding self
  if (input.name && input.name !== carlist.name) {
    const existing = await prisma.carlist.findFirst({
      where: { name: input.name, id: { not: id } },
    });

    if (existing) {
      return {
        success: false,
        error: `Esiste gia una carlist con il nome "${input.name}"`,
        code: ErrorCode.CONFLICT,
      };
    }
  }

  const updated = await prisma.carlist.update({
    where: { id },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.description !== undefined && { description: input.description ?? null }),
    },
  });

  return { success: true, data: updated };
}

// ---------------------------------------------------------------------------
// Delete carlist (cascade via Prisma cascade on CarlistVehicle)
// ---------------------------------------------------------------------------

export async function deleteCarlist(
  prisma: PrismaClientWithTenant,
  id: number
): Promise<ActionResult<{ id: number }>> {
  const carlist = await prisma.carlist.findFirst({
    where: { id },
  });

  if (!carlist) {
    return {
      success: false,
      error: "Carlist non trovata",
      code: ErrorCode.NOT_FOUND,
    };
  }

  await prisma.carlist.delete({
    where: { id },
  });

  return { success: true, data: { id } };
}

// ---------------------------------------------------------------------------
// Add vehicles to carlist (bulk, skip existing)
// ---------------------------------------------------------------------------

export async function addCatalogVehicles(
  prisma: PrismaClientWithTenant,
  carlistId: number,
  catalogVehicleIds: number[],
  userId: string
): Promise<ActionResult<{ added: number }>> {
  // Verify carlist exists
  const carlist = await prisma.carlist.findFirst({
    where: { id: carlistId },
  });

  if (!carlist) {
    return {
      success: false,
      error: "Carlist non trovata",
      code: ErrorCode.NOT_FOUND,
    };
  }

  // Get already existing associations
  const existing = await prisma.carlistVehicle.findMany({
    where: {
      carlistId,
      catalogVehicleId: { in: catalogVehicleIds },
    },
    select: { catalogVehicleId: true },
  });

  const existingIds = new Set(existing.map((e) => e.catalogVehicleId));
  const newIds = catalogVehicleIds.filter((id) => !existingIds.has(id));

  if (newIds.length === 0) {
    return { success: true, data: { added: 0 } };
  }

  await prisma.carlistVehicle.createMany({
    data: newIds.map((catalogVehicleId) => ({
      carlistId,
      catalogVehicleId,
      addedBy: userId,
    })),
  });

  return { success: true, data: { added: newIds.length } };
}

// ---------------------------------------------------------------------------
// Remove vehicles from carlist (bulk)
// ---------------------------------------------------------------------------

export async function removeCatalogVehicles(
  prisma: PrismaClientWithTenant,
  carlistId: number,
  catalogVehicleIds: number[]
): Promise<ActionResult<{ removed: number }>> {
  const carlist = await prisma.carlist.findFirst({
    where: { id: carlistId },
  });

  if (!carlist) {
    return {
      success: false,
      error: "Carlist non trovata",
      code: ErrorCode.NOT_FOUND,
    };
  }

  const result = await prisma.carlistVehicle.deleteMany({
    where: {
      carlistId,
      catalogVehicleId: { in: catalogVehicleIds },
    },
  });

  return { success: true, data: { removed: result.count } };
}

// ---------------------------------------------------------------------------
// Get all carlists containing a specific vehicle
// ---------------------------------------------------------------------------

export async function getCarlistsForCatalogVehicle(
  prisma: PrismaClientWithTenant,
  catalogVehicleId: number
): Promise<Carlist[]> {
  const entries = await prisma.carlistVehicle.findMany({
    where: { catalogVehicleId },
    include: { carlist: true },
  });

  return entries.map(
    (e) => (e as unknown as { carlist: Carlist }).carlist
  );
}

// ---------------------------------------------------------------------------
// Get simplified carlist options (id, name) for selects/filters
// ---------------------------------------------------------------------------

export async function getCarlistOptions(
  prisma: PrismaClientWithTenant
): Promise<CarlistOption[]> {
  const carlists = await prisma.carlist.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return carlists;
}
