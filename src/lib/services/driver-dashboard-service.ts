import type { PrismaClient } from "@/generated/prisma/client";
import type { PrismaClientWithTenant } from "@/lib/db/client";
import { resolveAllEmissionContextsBulk } from "@/lib/services/emission-resolution-service";
import { calculateScopedEmissions } from "@/lib/services/emission-calculator";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DriverVehicleData = {
  id: string;
  licensePlate: string;
  status: string;
  catalogVehicle: {
    id: string;
    marca: string;
    modello: string;
    allestimento: string | null;
    codiceAllestimento: string | null;
    annoImmatricolazione: number | null;
    imageUrl: string | null;
  };
  engine: {
    fuelType: string;
    cilindrata: number | null;
    potenzaKw: number | null;
    potenzaCv: number | null;
  } | null;
  assignedEmployee: {
    id: string;
    firstName: string;
    lastName: string;
  };
  documents: Array<{
    id: string;
    documentType: string;
    description: string | null;
    expiryDate: Date;
    fileName: string;
  }>;
  contracts: Array<{
    id: string;
    type: string;
    status: string;
    supplier: string | null;
    startDate: Date | null;
    endDate: Date | null;
  }>;
};

export type DriverKpis = {
  kmThisMonth: number | null;
  emissionsThisMonthKg: number | null;
  lastFuelRecord: {
    date: Date;
    quantityLiters: number;
    amountEur: number;
  } | null;
};

export type DriverDashboardData = {
  vehicle: DriverVehicleData;
  kpis: DriverKpis;
} | null;

// ---------------------------------------------------------------------------
// Main service function
// ---------------------------------------------------------------------------

/**
 * Loads all data for the Driver personal dashboard.
 *
 * Flow:
 * 1. Resolve User -> Employee via email matching
 * 2. Find the TenantVehicle assigned to that employee
 * 3. Load vehicle details (catalog, engine, documents, contracts)
 * 4. Calculate monthly KPIs (km, emissions, last fuel record)
 *
 * @param globalPrisma - Unscoped Prisma client (for User + EmissionFactor)
 * @param tenantPrisma - Tenant-scoped Prisma client
 * @param userId - The authenticated user's ID
 * @returns DriverDashboardData or null if no vehicle assigned
 */
export async function getDriverDashboardData(
  globalPrisma: PrismaClient,
  tenantPrisma: PrismaClientWithTenant,
  userId: string
): Promise<DriverDashboardData> {
  // 1. Get user email from global User table
  const user = await globalPrisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });

  if (!user?.email) {
    return null;
  }

  // 2. Find Employee in tenant by matching email
  const employee = await tenantPrisma.employee.findFirst({
    where: { email: user.email, isActive: true },
    select: { id: true },
  });

  if (!employee) {
    return null;
  }

  // 3. Find the assigned vehicle (via TenantVehicle.assignedEmployeeId)
  const vehicle = await tenantPrisma.tenantVehicle.findFirst({
    where: {
      assignedEmployeeId: employee.id,
      status: "ACTIVE",
    },
    include: {
      catalogVehicle: {
        include: {
          engines: {
            take: 1,
            select: {
              fuelType: true,
              cilindrata: true,
              potenzaKw: true,
              potenzaCv: true,
            },
          },
        },
      },
      assignedEmployee: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
      documents: {
        select: {
          id: true,
          documentType: true,
          description: true,
          expiryDate: true,
          fileName: true,
        },
        orderBy: { expiryDate: "asc" },
      },
      contracts: {
        where: { status: "ACTIVE" },
        select: {
          id: true,
          type: true,
          status: true,
          supplier: true,
          startDate: true,
          endDate: true,
        },
        orderBy: { startDate: "desc" },
      },
    },
  });

  if (!vehicle || !vehicle.assignedEmployee) {
    return null;
  }

  // 4. Calculate monthly KPIs
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  // Fetch fuel records and km readings for the current month
  const [fuelRecordsMonth, kmReadingsMonth, lastFuelRecord] = await Promise.all([
    tenantPrisma.fuelRecord.findMany({
      where: {
        vehicleId: vehicle.id,
        date: { gte: startOfMonth, lte: endOfMonth },
      },
      select: {
        quantityLiters: true,
        quantityKwh: true,
        fuelType: true,
        odometerKm: true,
      },
    }),
    tenantPrisma.kmReading.findMany({
      where: {
        vehicleId: vehicle.id,
        date: { gte: startOfMonth, lte: endOfMonth },
      },
      select: { odometerKm: true },
      orderBy: { odometerKm: "asc" },
    }),
    tenantPrisma.fuelRecord.findFirst({
      where: { vehicleId: vehicle.id },
      orderBy: { date: "desc" },
      select: {
        date: true,
        quantityLiters: true,
        amountEur: true,
      },
    }),
  ]);

  // Calculate km this month from all odometer readings (km readings + fuel records)
  const allOdometerValues: number[] = [
    ...kmReadingsMonth.map((r) => r.odometerKm),
    ...fuelRecordsMonth.map((r) => r.odometerKm),
  ];

  let kmThisMonth: number | null = null;
  if (allOdometerValues.length >= 2) {
    const maxKm = Math.max(...allOdometerValues);
    const minKm = Math.min(...allOdometerValues);
    kmThisMonth = maxKm - minKm;
  }

  // Calculate emissions this month using V2 multi-gas, multi-scope system
  let emissionsThisMonthKg: number | null = null;
  if (fuelRecordsMonth.length > 0) {
    // Bulk-resolve all emission contexts for this reference date
    const allContexts = await resolveAllEmissionContextsBulk(globalPrisma, now);

    // Group by fuel type: accumulate litres (scope 1) and kWh (scope 2)
    const fuelByType = new Map<string, { litres: number; kwh: number }>();
    for (const record of fuelRecordsMonth) {
      const current = fuelByType.get(record.fuelType) ?? { litres: 0, kwh: 0 };
      current.litres += record.quantityLiters;
      current.kwh += record.quantityKwh ?? 0;
      fuelByType.set(record.fuelType, current);
    }

    let totalKgCO2e = 0;
    for (const [fuelType, quantities] of fuelByType) {
      const contexts = allContexts.get(fuelType);
      if (!contexts || contexts.length === 0) continue;

      for (const ctx of contexts) {
        // Scope 1 uses litres, scope 2 uses kWh
        const quantity = ctx.macroFuelType.scope === 1
          ? quantities.litres
          : quantities.kwh;

        const result = calculateScopedEmissions({
          quantity,
          gasFactors: ctx.gasFactors,
          gwpValues: ctx.gwpValues,
        });
        totalKgCO2e += result.totalCO2e;
      }
    }

    emissionsThisMonthKg = Math.round(totalKgCO2e * 100) / 100;
  }

  // 5. Build result
  const rawVehicle = vehicle as unknown as {
    id: string;
    licensePlate: string;
    status: string;
    catalogVehicle: {
      id: string;
      marca: string;
      modello: string;
      allestimento: string | null;
      codiceAllestimento: string | null;
      annoImmatricolazione: number | null;
      imageUrl: string | null;
      engines: Array<{
        fuelType: string;
        cilindrata: number | null;
        potenzaKw: number | null;
        potenzaCv: number | null;
      }>;
    };
    assignedEmployee: {
      id: string;
      firstName: string;
      lastName: string;
    };
    documents: Array<{
      id: string;
      documentType: string;
      description: string | null;
      expiryDate: Date;
      fileName: string;
    }>;
    contracts: Array<{
      id: string;
      type: string;
      status: string;
      supplier: string | null;
      startDate: Date | null;
      endDate: Date | null;
    }>;
  };

  const engine = rawVehicle.catalogVehicle.engines[0] ?? null;

  return {
    vehicle: {
      id: rawVehicle.id,
      licensePlate: rawVehicle.licensePlate,
      status: rawVehicle.status,
      catalogVehicle: {
        id: rawVehicle.catalogVehicle.id,
        marca: rawVehicle.catalogVehicle.marca,
        modello: rawVehicle.catalogVehicle.modello,
        allestimento: rawVehicle.catalogVehicle.allestimento,
        codiceAllestimento: rawVehicle.catalogVehicle.codiceAllestimento,
        annoImmatricolazione: rawVehicle.catalogVehicle.annoImmatricolazione,
        imageUrl: rawVehicle.catalogVehicle.imageUrl,
      },
      engine,
      assignedEmployee: rawVehicle.assignedEmployee,
      documents: rawVehicle.documents,
      contracts: rawVehicle.contracts,
    },
    kpis: {
      kmThisMonth,
      emissionsThisMonthKg,
      lastFuelRecord: lastFuelRecord
        ? {
            date: lastFuelRecord.date,
            quantityLiters: lastFuelRecord.quantityLiters,
            amountEur: lastFuelRecord.amountEur,
          }
        : null,
    },
  };
}
