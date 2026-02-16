import type {
  CatalogVehicle,
  Engine,
  Employee,
  TenantVehicle,
} from "@/generated/prisma/client";
import type { PrismaClientWithTenant } from "@/lib/db/client";
import { prisma as basePrisma } from "@/lib/db/client";
import type { PaginatedResult } from "@/types/pagination";
import type {
  CreateTenantVehicleInput,
  UpdateTenantVehicleInput,
  TenantVehicleFilterInput,
} from "@/lib/schemas/tenant-vehicle";
import { UNCATALOGED_VEHICLE_ID } from "@/lib/utils/constants";

// ---------------------------------------------------------------------------
// Tipi pubblici
// ---------------------------------------------------------------------------

export type TenantVehicleWithDetails = TenantVehicle & {
  catalogVehicle: CatalogVehicle & { engines: Engine[] };
  assignedEmployee: Employee | null;
};

// ---------------------------------------------------------------------------
// Include standard per le query di dettaglio
// ---------------------------------------------------------------------------

const INCLUDE_DETAILS = {
  catalogVehicle: { include: { engines: true } },
  assignedEmployee: true,
} as const;

// ---------------------------------------------------------------------------
// Creazione veicolo operativo
// ---------------------------------------------------------------------------

/**
 * Crea un nuovo veicolo operativo nel tenant.
 * Verifica che il catalogVehicleId esista nel catalogo globale (skip per sentinel).
 */
export async function createTenantVehicle(
  prisma: PrismaClientWithTenant,
  data: CreateTenantVehicleInput
): Promise<TenantVehicleWithDetails> {
  const catalogId = data.catalogVehicleId ?? UNCATALOGED_VEHICLE_ID;

  // Verifica che il veicolo catalogo esista (via base prisma, globale) — skip sentinel
  if (catalogId !== UNCATALOGED_VEHICLE_ID) {
    const catalogVehicle = await basePrisma.catalogVehicle.findUnique({
      where: { id: catalogId },
    });

    if (!catalogVehicle) {
      throw new Error("Veicolo da catalogo non trovato");
    }
  }

  return prisma.tenantVehicle.create({
    data: {
      tenantId: "", // Overwritten by tenant extension
      catalogVehicleId: catalogId,
      licensePlate: data.licensePlate,
      registrationDate: data.registrationDate,
      status: data.status ?? "ACTIVE",
      assignedEmployeeId: data.assignedEmployeeId ?? null,
      notes: data.notes ?? null,
    },
    include: INCLUDE_DETAILS,
  }) as unknown as Promise<TenantVehicleWithDetails>;
}

// ---------------------------------------------------------------------------
// Lista veicoli paginata
// ---------------------------------------------------------------------------

/**
 * Recupera la lista veicoli operativi del tenant con paginazione e filtri.
 */
export async function getTenantVehicles(
  prisma: PrismaClientWithTenant,
  filters: TenantVehicleFilterInput
): Promise<PaginatedResult<TenantVehicleWithDetails>> {
  const { search, status, page, pageSize, sortBy, sortOrder } = filters;

  const where: Record<string, unknown> = {};

  if (status) {
    where.status = status;
  }

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
    ];
  }

  const orderBy: Record<string, string> = {};
  if (sortBy) {
    orderBy[sortBy] = sortOrder ?? "asc";
  } else {
    orderBy.createdAt = "desc";
  }

  const [data, totalCount] = await Promise.all([
    prisma.tenantVehicle.findMany({
      where,
      include: INCLUDE_DETAILS,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.tenantVehicle.count({ where }),
  ]);

  return {
    data: data as unknown as TenantVehicleWithDetails[],
    pagination: {
      page,
      pageSize,
      totalCount,
      totalPages: Math.ceil(totalCount / pageSize),
    },
  };
}

// ---------------------------------------------------------------------------
// Dettaglio veicolo
// ---------------------------------------------------------------------------

/**
 * Recupera un singolo veicolo operativo con dati catalogo completi.
 */
export async function getTenantVehicleById(
  prisma: PrismaClientWithTenant,
  id: number
): Promise<TenantVehicleWithDetails | null> {
  const result = await prisma.tenantVehicle.findFirst({
    where: { id },
    include: INCLUDE_DETAILS,
  });
  return result as unknown as TenantVehicleWithDetails | null;
}

// ---------------------------------------------------------------------------
// Aggiornamento veicolo operativo
// ---------------------------------------------------------------------------

/**
 * Aggiorna i dati operativi di un veicolo (non i dati catalogo).
 */
export async function updateTenantVehicle(
  prisma: PrismaClientWithTenant,
  id: number,
  data: Omit<UpdateTenantVehicleInput, "id">
): Promise<TenantVehicleWithDetails> {
  const updateData: Record<string, unknown> = {};

  if (data.catalogVehicleId !== undefined) updateData.catalogVehicleId = data.catalogVehicleId;
  if (data.licensePlate !== undefined) updateData.licensePlate = data.licensePlate;
  if (data.registrationDate !== undefined) updateData.registrationDate = data.registrationDate;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.assignedEmployeeId !== undefined) updateData.assignedEmployeeId = data.assignedEmployeeId;
  if (data.notes !== undefined) updateData.notes = data.notes;

  return prisma.tenantVehicle.update({
    where: { id },
    data: updateData,
    include: INCLUDE_DETAILS,
  }) as unknown as Promise<TenantVehicleWithDetails>;
}
