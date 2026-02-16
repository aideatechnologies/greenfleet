import type {
  KmReading,
  TenantVehicle,
  CatalogVehicle,
} from "@/generated/prisma/client";
import type { PrismaClientWithTenant } from "@/lib/db/client";
import type { PaginatedResult } from "@/types/pagination";
import type {
  CreateKmReadingData,
  UpdateKmReadingData,
  KmReadingFilterInput,
} from "@/lib/schemas/km-reading";
import { auditCreate, auditUpdate, calculateChanges } from "./audit-service";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type KmReadingWithDetails = KmReading & {
  vehicle: TenantVehicle & {
    catalogVehicle: CatalogVehicle;
  };
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
} as const;

// Auditable fields for change tracking
const AUDITABLE_FIELDS = ["date", "odometerKm", "notes"];

// ---------------------------------------------------------------------------
// Custom error classes
// ---------------------------------------------------------------------------

export class OdometerValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OdometerValidationError";
  }
}

export class RecordNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RecordNotFoundError";
  }
}

// ---------------------------------------------------------------------------
// Get last known odometer — queries BOTH KmReading and FuelRecord tables
// ---------------------------------------------------------------------------

/**
 * Returns the highest km reading for a vehicle considering both KmReading
 * and FuelRecord tables. Optionally filters by a date (before) and
 * excludes a specific KmReading ID.
 */
export async function getLastKnownOdometer(
  prisma: PrismaClientWithTenant,
  vehicleId: number,
  beforeDate?: Date,
  excludeKmReadingId?: number
): Promise<{ odometerKm: number; date: Date; source: string } | null> {
  const dateFilter = beforeDate ? { lt: beforeDate } : {};

  const [lastKmReading, lastFuelRecord] = await Promise.all([
    prisma.kmReading.findFirst({
      where: {
        vehicleId,
        ...(beforeDate ? { date: dateFilter } : {}),
        ...(excludeKmReadingId ? { id: { not: excludeKmReadingId } } : {}),
      },
      orderBy: [{ date: "desc" }, { odometerKm: "desc" }],
      select: { odometerKm: true, date: true },
    }),
    prisma.fuelRecord.findFirst({
      where: {
        vehicleId,
        ...(beforeDate ? { date: dateFilter } : {}),
      },
      orderBy: [{ date: "desc" }, { odometerKm: "desc" }],
      select: { odometerKm: true, date: true },
    }),
  ]);

  if (!lastKmReading && !lastFuelRecord) return null;

  if (!lastKmReading) {
    return {
      odometerKm: lastFuelRecord!.odometerKm,
      date: lastFuelRecord!.date,
      source: "FuelRecord",
    };
  }

  if (!lastFuelRecord) {
    return {
      odometerKm: lastKmReading.odometerKm,
      date: lastKmReading.date,
      source: "KmReading",
    };
  }

  // Return the one with higher km
  if (lastKmReading.odometerKm >= lastFuelRecord.odometerKm) {
    return {
      odometerKm: lastKmReading.odometerKm,
      date: lastKmReading.date,
      source: "KmReading",
    };
  }

  return {
    odometerKm: lastFuelRecord.odometerKm,
    date: lastFuelRecord.date,
    source: "FuelRecord",
  };
}

// ---------------------------------------------------------------------------
// Validate odometer km
// ---------------------------------------------------------------------------

/**
 * Validates that the odometer reading is consistent with existing records.
 * Checks both KmReading and FuelRecord tables for previous and subsequent records.
 * Returns null if valid, or an error message string if invalid.
 */
export async function validateOdometerKm(
  prisma: PrismaClientWithTenant,
  vehicleId: number,
  date: Date,
  odometerKm: number,
  excludeId?: number
): Promise<string | null> {
  // Find the most recent record BEFORE this date (from both tables)
  const [prevKmReading, prevFuelRecord] = await Promise.all([
    prisma.kmReading.findFirst({
      where: {
        vehicleId,
        date: { lt: date },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      orderBy: { date: "desc" },
      select: { odometerKm: true, date: true },
    }),
    prisma.fuelRecord.findFirst({
      where: {
        vehicleId,
        date: { lt: date },
      },
      orderBy: { date: "desc" },
      select: { odometerKm: true, date: true },
    }),
  ]);

  // Determine the highest previous reading
  const previousRecords = [prevKmReading, prevFuelRecord].filter(Boolean) as {
    odometerKm: number;
    date: Date;
  }[];
  const previousRecord = previousRecords.reduce<{
    odometerKm: number;
    date: Date;
  } | null>((max, r) => {
    if (!max || r.odometerKm > max.odometerKm) return r;
    return max;
  }, null);

  if (previousRecord && odometerKm < previousRecord.odometerKm) {
    const formattedDate = new Intl.DateTimeFormat("it-IT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(previousRecord.date);
    return `Il chilometraggio (${new Intl.NumberFormat("it-IT").format(odometerKm)} km) non puo essere inferiore all'ultimo rilevamento (${new Intl.NumberFormat("it-IT").format(previousRecord.odometerKm)} km del ${formattedDate})`;
  }

  // Also check that subsequent records don't have LOWER km
  const [nextKmReading, nextFuelRecord] = await Promise.all([
    prisma.kmReading.findFirst({
      where: {
        vehicleId,
        date: { gt: date },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      orderBy: { date: "asc" },
      select: { odometerKm: true, date: true },
    }),
    prisma.fuelRecord.findFirst({
      where: {
        vehicleId,
        date: { gt: date },
      },
      orderBy: { date: "asc" },
      select: { odometerKm: true, date: true },
    }),
  ]);

  // Determine the lowest subsequent reading
  const nextRecords = [nextKmReading, nextFuelRecord].filter(Boolean) as {
    odometerKm: number;
    date: Date;
  }[];
  const nextRecord = nextRecords.reduce<{
    odometerKm: number;
    date: Date;
  } | null>((min, r) => {
    if (!min || r.odometerKm < min.odometerKm) return r;
    return min;
  }, null);

  if (nextRecord && odometerKm > nextRecord.odometerKm) {
    const formattedDate = new Intl.DateTimeFormat("it-IT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(nextRecord.date);
    return `Il chilometraggio (${new Intl.NumberFormat("it-IT").format(odometerKm)} km) non puo essere superiore al rilevamento successivo (${new Intl.NumberFormat("it-IT").format(nextRecord.odometerKm)} km del ${formattedDate})`;
  }

  return null;
}

// ---------------------------------------------------------------------------
// Create km reading
// ---------------------------------------------------------------------------

export async function createKmReading(
  prisma: PrismaClientWithTenant,
  input: CreateKmReadingData,
  userId: string
): Promise<KmReadingWithDetails> {
  // Validate odometer
  const odometerError = await validateOdometerKm(
    prisma,
    input.vehicleId,
    input.date,
    input.odometerKm
  );
  if (odometerError) {
    throw new OdometerValidationError(odometerError);
  }

  const record = await prisma.kmReading.create({
    data: {
      tenantId: "", // Overwritten by tenant extension
      vehicleId: input.vehicleId,
      userId,
      date: input.date,
      odometerKm: input.odometerKm,
      notes: input.notes ?? null,
      source: "MANUAL",
    },
    include: INCLUDE_DETAILS,
  });

  // Create audit entry
  await auditCreate(prisma, {
    userId,
    action: "km_reading.created",
    entityType: "KmReading",
    entityId: record.id,
    data: {
      vehicleId: input.vehicleId,
      date: input.date,
      odometerKm: input.odometerKm,
      notes: input.notes ?? null,
    },
    source: "MANUAL",
  });

  return record as unknown as KmReadingWithDetails;
}

// ---------------------------------------------------------------------------
// Update km reading
// ---------------------------------------------------------------------------

export async function updateKmReading(
  prisma: PrismaClientWithTenant,
  id: number,
  input: UpdateKmReadingData,
  userId: string
): Promise<KmReadingWithDetails> {
  // Fetch existing record
  const existing = await prisma.kmReading.findFirst({
    where: { id },
  });

  if (!existing) {
    throw new RecordNotFoundError("Rilevazione km non trovata");
  }

  // Validate odometer (exclude current record from check)
  const odometerError = await validateOdometerKm(
    prisma,
    existing.vehicleId,
    input.date,
    input.odometerKm,
    id
  );
  if (odometerError) {
    throw new OdometerValidationError(odometerError);
  }

  // Calculate changes for audit
  const changes = calculateChanges(
    existing as unknown as Record<string, unknown>,
    input as unknown as Record<string, unknown>,
    AUDITABLE_FIELDS
  );

  const record = await prisma.kmReading.update({
    where: { id },
    data: {
      date: input.date,
      odometerKm: input.odometerKm,
      notes: input.notes ?? null,
    },
    include: INCLUDE_DETAILS,
  });

  // Create audit entry for update
  await auditUpdate(prisma, {
    userId,
    action: "km_reading.updated",
    entityType: "KmReading",
    entityId: id,
    changes,
    source: "MANUAL",
  });

  return record as unknown as KmReadingWithDetails;
}

// ---------------------------------------------------------------------------
// Delete km reading
// ---------------------------------------------------------------------------

export async function deleteKmReading(
  prisma: PrismaClientWithTenant,
  id: number,
  userId: string
): Promise<void> {
  const existing = await prisma.kmReading.findFirst({
    where: { id },
  });

  if (!existing) {
    throw new RecordNotFoundError("Rilevazione km non trovata");
  }

  await prisma.kmReading.delete({
    where: { id },
  });

  // Create audit entry for deletion
  await auditCreate(prisma, {
    userId,
    action: "km_reading.deleted",
    entityType: "KmReading",
    entityId: id,
    data: {
      vehicleId: existing.vehicleId,
      date: existing.date,
      odometerKm: existing.odometerKm,
      notes: existing.notes,
    },
    source: "MANUAL",
  });
}

// ---------------------------------------------------------------------------
// Get km readings with filters (paginated)
// ---------------------------------------------------------------------------

export async function getKmReadings(
  prisma: PrismaClientWithTenant,
  filters: KmReadingFilterInput
): Promise<PaginatedResult<KmReadingWithDetails>> {
  const { vehicleId, dateFrom, dateTo, search, page, pageSize } = filters;

  const where: Record<string, unknown> = {};

  if (vehicleId) {
    where.vehicleId = vehicleId;
  }

  if (dateFrom || dateTo) {
    const dateFilter: Record<string, Date> = {};
    if (dateFrom) dateFilter.gte = dateFrom;
    if (dateTo) dateFilter.lte = dateTo;
    where.date = dateFilter;
  }

  // Search by license plate (via vehicle relation)
  if (search) {
    where.vehicle = {
      licensePlate: { contains: search },
    };
  }

  const [data, totalCount] = await Promise.all([
    prisma.kmReading.findMany({
      where,
      include: INCLUDE_DETAILS,
      orderBy: { date: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.kmReading.count({ where }),
  ]);

  return {
    data: data as unknown as KmReadingWithDetails[],
    pagination: {
      page,
      pageSize,
      totalCount,
      totalPages: Math.ceil(totalCount / pageSize),
    },
  };
}

// ---------------------------------------------------------------------------
// Get km readings by vehicle (paginated)
// ---------------------------------------------------------------------------

export async function getKmReadingsByVehicle(
  prisma: PrismaClientWithTenant,
  vehicleId: number,
  pagination: { page: number; pageSize: number }
): Promise<PaginatedResult<KmReadingWithDetails>> {
  const { page, pageSize } = pagination;

  const [data, totalCount] = await Promise.all([
    prisma.kmReading.findMany({
      where: { vehicleId },
      include: INCLUDE_DETAILS,
      orderBy: { date: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.kmReading.count({ where: { vehicleId } }),
  ]);

  return {
    data: data as unknown as KmReadingWithDetails[],
    pagination: {
      page,
      pageSize,
      totalCount,
      totalPages: Math.ceil(totalCount / pageSize),
    },
  };
}
