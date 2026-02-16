import type {
  FuelRecord,
  FuelCard,
  TenantVehicle,
  CatalogVehicle,
} from "@/generated/prisma/client";
import type { PrismaClientWithTenant } from "@/lib/db/client";
import type { PaginatedResult } from "@/types/pagination";
import type { CreateFuelRecordData, UpdateFuelRecordData, FuelRecordFilterInput } from "@/lib/schemas/fuel-record";
import { auditCreate, auditUpdate, calculateChanges } from "./audit-service";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type FuelRecordWithDetails = FuelRecord & {
  vehicle: TenantVehicle & {
    catalogVehicle: CatalogVehicle;
  };
  fuelCard: FuelCard | null;
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
  fuelCard: true,
} as const;

// Auditable fields for change tracking
const AUDITABLE_FIELDS = [
  "date",
  "fuelType",
  "quantityLiters",
  "quantityKwh",
  "amountEur",
  "odometerKm",
  "notes",
];

// ---------------------------------------------------------------------------
// Validate odometer reading
// ---------------------------------------------------------------------------

/**
 * Validates that the odometer reading is >= the last known km reading
 * for the given vehicle, considering the date ordering.
 * Returns null if valid, or an error message if invalid.
 */
export async function validateOdometer(
  prisma: PrismaClientWithTenant,
  vehicleId: number,
  date: Date,
  odometerKm: number,
  excludeRecordId?: number
): Promise<string | null> {
  // Find the most recent fuel record BEFORE this date for this vehicle
  const previousRecord = await prisma.fuelRecord.findFirst({
    where: {
      vehicleId,
      date: { lt: date },
      ...(excludeRecordId ? { id: { not: excludeRecordId } } : {}),
    },
    orderBy: { date: "desc" },
    select: { odometerKm: true, date: true },
  });

  if (previousRecord && odometerKm < previousRecord.odometerKm) {
    const formattedDate = new Intl.DateTimeFormat("it-IT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(previousRecord.date);
    return `Il chilometraggio (${new Intl.NumberFormat("it-IT").format(odometerKm)} km) non puo essere inferiore all'ultimo rilevamento (${new Intl.NumberFormat("it-IT").format(previousRecord.odometerKm)} km del ${formattedDate})`;
  }

  // Also check that subsequent records don't have LOWER km
  const nextRecord = await prisma.fuelRecord.findFirst({
    where: {
      vehicleId,
      date: { gt: date },
      ...(excludeRecordId ? { id: { not: excludeRecordId } } : {}),
    },
    orderBy: { date: "asc" },
    select: { odometerKm: true, date: true },
  });

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
// Create fuel record
// ---------------------------------------------------------------------------

export async function createFuelRecord(
  prisma: PrismaClientWithTenant,
  input: CreateFuelRecordData,
  userId: string
): Promise<FuelRecordWithDetails> {
  // Validate odometer
  const odometerError = await validateOdometer(
    prisma,
    input.vehicleId,
    input.date,
    input.odometerKm
  );
  if (odometerError) {
    throw new OdometerValidationError(odometerError);
  }

  const record = await prisma.fuelRecord.create({
    data: {
      tenantId: "", // Overwritten by tenant extension
      vehicleId: input.vehicleId,
      userId,
      fuelCardId: (input as Record<string, unknown>).fuelCardId as number | undefined ?? null,
      date: input.date,
      fuelType: input.fuelType,
      quantityLiters: input.quantityLiters,
      quantityKwh: input.quantityKwh ?? null,
      amountEur: input.amountEur,
      odometerKm: input.odometerKm,
      notes: input.notes ?? null,
      source: "MANUAL",
    },
    include: INCLUDE_DETAILS,
  });

  // Create audit entry
  await auditCreate(prisma, {
    userId,
    action: "fuel_record.created",
    entityType: "FuelRecord",
    entityId: record.id,
    data: {
      vehicleId: input.vehicleId,
      date: input.date,
      fuelType: input.fuelType,
      quantityLiters: input.quantityLiters,
      quantityKwh: input.quantityKwh ?? null,
      amountEur: input.amountEur,
      odometerKm: input.odometerKm,
      notes: input.notes ?? null,
    },
    source: "MANUAL",
  });

  return record as unknown as FuelRecordWithDetails;
}

// ---------------------------------------------------------------------------
// Update fuel record
// ---------------------------------------------------------------------------

export async function updateFuelRecord(
  prisma: PrismaClientWithTenant,
  id: number,
  input: UpdateFuelRecordData,
  userId: string
): Promise<FuelRecordWithDetails> {
  // Fetch existing record
  const existing = await prisma.fuelRecord.findFirst({
    where: { id },
  });

  if (!existing) {
    throw new RecordNotFoundError("Rifornimento non trovato");
  }

  // Validate odometer (exclude current record from check)
  const odometerError = await validateOdometer(
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

  const record = await prisma.fuelRecord.update({
    where: { id },
    data: {
      date: input.date,
      fuelType: input.fuelType,
      quantityLiters: input.quantityLiters,
      quantityKwh: input.quantityKwh ?? null,
      amountEur: input.amountEur,
      odometerKm: input.odometerKm,
      notes: input.notes ?? null,
      fuelCardId: (input as Record<string, unknown>).fuelCardId as number | undefined ?? null,
    },
    include: INCLUDE_DETAILS,
  });

  // Create audit entry for update
  await auditUpdate(prisma, {
    userId,
    action: "fuel_record.updated",
    entityType: "FuelRecord",
    entityId: id,
    changes,
    source: "MANUAL",
  });

  return record as unknown as FuelRecordWithDetails;
}

// ---------------------------------------------------------------------------
// Delete fuel record
// ---------------------------------------------------------------------------

export async function deleteFuelRecord(
  prisma: PrismaClientWithTenant,
  id: number,
  userId: string
): Promise<void> {
  const existing = await prisma.fuelRecord.findFirst({
    where: { id },
  });

  if (!existing) {
    throw new RecordNotFoundError("Rifornimento non trovato");
  }

  await prisma.fuelRecord.delete({
    where: { id },
  });

  // Create audit entry for deletion
  await auditCreate(prisma, {
    userId,
    action: "fuel_record.deleted",
    entityType: "FuelRecord",
    entityId: id,
    data: {
      vehicleId: existing.vehicleId,
      date: existing.date,
      fuelType: existing.fuelType,
      quantityLiters: existing.quantityLiters,
      quantityKwh: existing.quantityKwh,
      amountEur: existing.amountEur,
      odometerKm: existing.odometerKm,
      notes: existing.notes,
    },
    source: "MANUAL",
  });
}

// ---------------------------------------------------------------------------
// Get fuel records by vehicle (paginated)
// ---------------------------------------------------------------------------

export async function getFuelRecordsByVehicle(
  prisma: PrismaClientWithTenant,
  vehicleId: number,
  pagination: { page: number; pageSize: number }
): Promise<PaginatedResult<FuelRecordWithDetails>> {
  const { page, pageSize } = pagination;

  const [data, totalCount] = await Promise.all([
    prisma.fuelRecord.findMany({
      where: { vehicleId },
      include: INCLUDE_DETAILS,
      orderBy: { date: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.fuelRecord.count({ where: { vehicleId } }),
  ]);

  return {
    data: data as unknown as FuelRecordWithDetails[],
    pagination: {
      page,
      pageSize,
      totalCount,
      totalPages: Math.ceil(totalCount / pageSize),
    },
  };
}

// ---------------------------------------------------------------------------
// Get fuel records with filters (paginated)
// ---------------------------------------------------------------------------

export async function getFuelRecords(
  prisma: PrismaClientWithTenant,
  filters: FuelRecordFilterInput
): Promise<PaginatedResult<FuelRecordWithDetails>> {
  const { vehicleId, dateFrom, dateTo, fuelType, page, pageSize } = filters;

  const where: Record<string, unknown> = {};

  if (vehicleId) {
    where.vehicleId = vehicleId;
  }

  if (fuelType) {
    where.fuelType = fuelType;
  }

  if (dateFrom || dateTo) {
    const dateFilter: Record<string, Date> = {};
    if (dateFrom) dateFilter.gte = dateFrom;
    if (dateTo) dateFilter.lte = dateTo;
    where.date = dateFilter;
  }

  const [data, totalCount] = await Promise.all([
    prisma.fuelRecord.findMany({
      where,
      include: INCLUDE_DETAILS,
      orderBy: { date: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.fuelRecord.count({ where }),
  ]);

  return {
    data: data as unknown as FuelRecordWithDetails[],
    pagination: {
      page,
      pageSize,
      totalCount,
      totalPages: Math.ceil(totalCount / pageSize),
    },
  };
}

// ---------------------------------------------------------------------------
// Get single fuel record by ID
// ---------------------------------------------------------------------------

export async function getFuelRecordById(
  prisma: PrismaClientWithTenant,
  id: number
): Promise<FuelRecordWithDetails | null> {
  const record = await prisma.fuelRecord.findFirst({
    where: { id },
    include: INCLUDE_DETAILS,
  });

  return record as unknown as FuelRecordWithDetails | null;
}

// ---------------------------------------------------------------------------
// Vehicle feed: merged FuelRecord + KmReading (chronological)
// ---------------------------------------------------------------------------

export type FuelFeedItem =
  | {
      type: "fuel_record";
      id: number;
      date: Date;
      odometerKm: number;
      fuelType: string;
      quantityLiters: number;
      quantityKwh: number | null;
      amountEur: number;
      notes: string | null;
      source: string;
      vehicle: FuelRecordWithDetails["vehicle"];
    }
  | {
      type: "km_reading";
      id: number;
      date: Date;
      odometerKm: number;
      notes: string | null;
      source: string;
      vehicle: FuelRecordWithDetails["vehicle"];
    };

export async function getVehicleFeed(
  prisma: PrismaClientWithTenant,
  vehicleId: number,
  pagination: { page: number; pageSize: number }
): Promise<PaginatedResult<FuelFeedItem>> {
  const { page, pageSize } = pagination;

  // Fetch both fuel records and km readings for this vehicle
  const [fuelRecords, kmReadings, fuelCount, kmCount] = await Promise.all([
    prisma.fuelRecord.findMany({
      where: { vehicleId },
      include: INCLUDE_DETAILS,
      orderBy: { date: "desc" },
    }),
    prisma.kmReading.findMany({
      where: { vehicleId },
      include: {
        vehicle: {
          include: {
            catalogVehicle: true,
          },
        },
      },
      orderBy: { date: "desc" },
    }),
    prisma.fuelRecord.count({ where: { vehicleId } }),
    prisma.kmReading.count({ where: { vehicleId } }),
  ]);

  // Map to unified feed items
  const fuelItems: FuelFeedItem[] = (
    fuelRecords as unknown as FuelRecordWithDetails[]
  ).map((r) => ({
    type: "fuel_record" as const,
    id: r.id,
    date: r.date,
    odometerKm: r.odometerKm,
    fuelType: r.fuelType,
    quantityLiters: r.quantityLiters,
    quantityKwh: r.quantityKwh,
    amountEur: r.amountEur,
    notes: r.notes,
    source: r.source,
    vehicle: r.vehicle,
  }));

  const kmItems: FuelFeedItem[] = kmReadings.map((r) => ({
    type: "km_reading" as const,
    id: r.id,
    date: r.date,
    odometerKm: r.odometerKm,
    notes: r.notes,
    source: r.source,
    vehicle: r.vehicle as unknown as FuelRecordWithDetails["vehicle"],
  }));

  // Merge and sort by date DESC
  const allItems = [...fuelItems, ...kmItems].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const totalCount = fuelCount + kmCount;
  const totalPages = Math.ceil(totalCount / pageSize);
  const start = (page - 1) * pageSize;
  const paginatedItems = allItems.slice(start, start + pageSize);

  return {
    data: paginatedItems,
    pagination: {
      page,
      pageSize,
      totalCount,
      totalPages,
    },
  };
}

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
