// ---------------------------------------------------------------------------
// Dashboard Service — Data layer for the Fleet Manager dashboard (Story 7.1)
// ---------------------------------------------------------------------------
// All functions take tenantId as first param and use getPrismaForTenant.
// Reuses emission-calculator.ts pure functions and existing data loaders.
// ---------------------------------------------------------------------------

import { getPrismaForTenant } from "@/lib/db/client";
import { prisma } from "@/lib/db/client";
import type { PrismaClient } from "@/generated/prisma/client";
import {
  calculateScopedEmissions,
  calculateTargetProgress,
  round2,
} from "@/lib/services/emission-calculator";
import { resolveAllEmissionContextsBulk } from "@/lib/services/emission-resolution-service";
import type { EmissionContext } from "@/types/emission";
import type { TargetProgress, TargetPeriod } from "@/types/emission-target";
import { logger } from "@/lib/utils/logger";
import { getEffectiveFuelType, getCombinedCo2GKm } from "@/lib/utils/fuel-type";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DashboardKPIs = {
  emissionsThisMonth: number; // kgCO2e
  emissionsLastMonth: number; // kgCO2e
  trendPercentage: number; // % change
  trendDirection: "up" | "down" | "neutral";
  activeVehicles: number;
  totalKmThisMonth: number;
  totalFuelThisMonth: number; // litres
  totalKwhThisMonth: number; // kWh (electric/hybrid)
};

export type EmissionsTrendPoint = {
  month: string; // "Gen", "Feb", ...
  value: number; // kgCO2e
};

export type EmissionsTrendFilter = {
  scope?: number;      // 1 or 2 — undefined = all scopes
  fuelTypes?: string[]; // MacroFuelType names — undefined = all
};

export type EmissionFilterOption = {
  value: string;
  label: string;
};

export type EmissionFilterOptions = {
  fuelTypes: EmissionFilterOption[];
  scopes: EmissionFilterOption[];
};

export type FleetDelta = {
  theoretical: number; // kgCO2e
  real: number; // kgCO2e
};

export type DashboardTargetProgress = TargetProgress & {
  description: string | null;
  period: TargetPeriod;
};

export type NotificationSeverity = "warning" | "destructive" | "info";

export type DashboardNotification = {
  id: string;
  type: "contract" | "document";
  title: string;
  description: string;
  severity: NotificationSeverity;
  link: string;
  daysRemaining: number;
};

export type DashboardNotifications = {
  contracts: DashboardNotification[];
  documents: DashboardNotification[];
  total: number;
};

// ---------------------------------------------------------------------------
// Italian month abbreviations
// ---------------------------------------------------------------------------

const MONTH_LABELS = [
  "Gen", "Feb", "Mar", "Apr", "Mag", "Giu",
  "Lug", "Ago", "Set", "Ott", "Nov", "Dic",
];

// ---------------------------------------------------------------------------
// Document type labels
// ---------------------------------------------------------------------------

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  ASSICURAZIONE: "Assicurazione",
  REVISIONE: "Revisione",
  BOLLO: "Bollo",
  CARTA_CIRCOLAZIONE: "Carta di circolazione",
  ALTRO: "Documento",
};

// ---------------------------------------------------------------------------
// Contract type labels
// ---------------------------------------------------------------------------

const CONTRACT_TYPE_LABELS: Record<string, string> = {
  PROPRIETARIO: "Proprieta",
  BREVE_TERMINE: "Breve termine",
  LUNGO_TERMINE: "Lungo termine",
  LEASING_FINANZIARIO: "Leasing finanziario",
};

// ---------------------------------------------------------------------------
// Helper: calculate real emissions for fuel records in a date range
// ---------------------------------------------------------------------------

async function calculatePeriodEmissions(
  tenantPrisma: ReturnType<typeof getPrismaForTenant>,
  startDate: Date,
  endDate: Date
): Promise<number> {
  const fuelRecords = await tenantPrisma.fuelRecord.findMany({
    where: {
      date: { gte: startDate, lte: endDate },
    },
    select: {
      quantityLiters: true,
      quantityKwh: true,
      fuelType: true,
      date: true,
    },
  });

  if (fuelRecords.length === 0) return 0;

  // Group by fuel type: accumulate litres (scope 1) and kWh (scope 2)
  const fuelByType = new Map<string, { litres: number; kwh: number }>();
  for (const record of fuelRecords) {
    const current = fuelByType.get(record.fuelType) ?? { litres: 0, kwh: 0 };
    current.litres += record.quantityLiters;
    current.kwh += record.quantityKwh ?? 0;
    fuelByType.set(record.fuelType, current);
  }

  const medianDate = new Date(
    (startDate.getTime() + endDate.getTime()) / 2
  );

  // Bulk-resolve all emission contexts (V2: per-gas, multi-scope)
  const allContexts = await resolveAllEmissionContextsBulk(
    prisma as unknown as PrismaClient,
    medianDate
  );

  let totalKgCO2e = 0;
  for (const [fuelType, quantities] of fuelByType) {
    const contexts = allContexts.get(fuelType);
    if (!contexts || contexts.length === 0) {
      logger.warn(
        { fuelType },
        "Dashboard: no emission context found for fuel type"
      );
      continue;
    }

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

  return round2(totalKgCO2e);
}

// ---------------------------------------------------------------------------
// getDashboardKPIs
// ---------------------------------------------------------------------------

/**
 * Returns the main KPI values for the Fleet Manager dashboard.
 *
 * - emissionsThisMonth / emissionsLastMonth: sum of (fuelRecord.quantityLiters * emissionFactor.value)
 * - trendPercentage: ((thisMonth - lastMonth) / lastMonth) * 100
 * - activeVehicles: count of TenantVehicle where status = "ACTIVE"
 * - totalKmThisMonth: sum of km driven this month (max odometer - min odometer per vehicle)
 * - totalFuelThisMonth: sum of quantityLiters this month
 */
export async function getDashboardKPIs(
  tenantId: string,
  now: Date = new Date()
): Promise<DashboardKPIs> {
  const tenantPrisma = getPrismaForTenant(tenantId);

  // Current month range
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const thisMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  // Last month range
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

  // Parallel queries
  const [
    emissionsThisMonth,
    emissionsLastMonth,
    activeVehicles,
    fuelThisMonth,
    kmData,
  ] = await Promise.all([
    calculatePeriodEmissions(tenantPrisma, thisMonthStart, thisMonthEnd),
    calculatePeriodEmissions(tenantPrisma, lastMonthStart, lastMonthEnd),
    tenantPrisma.tenantVehicle.count({
      where: { status: "ACTIVE" },
    }),
    tenantPrisma.fuelRecord.findMany({
      where: { date: { gte: thisMonthStart, lte: thisMonthEnd } },
      select: { quantityLiters: true, quantityKwh: true, vehicleId: true, odometerKm: true },
    }),
    // Get km readings this month for km calculation
    tenantPrisma.fuelRecord.findMany({
      where: { date: { gte: thisMonthStart, lte: thisMonthEnd } },
      select: { vehicleId: true, odometerKm: true },
      orderBy: { odometerKm: "asc" },
    }),
  ]);

  // Total fuel this month (litres + kWh)
  const totalFuelThisMonth = round2(
    fuelThisMonth.reduce((sum, fr) => sum + fr.quantityLiters, 0)
  );
  const totalKwhThisMonth = round2(
    fuelThisMonth.reduce((sum, fr) => sum + (fr.quantityKwh ?? 0), 0)
  );

  // Total km this month: for each vehicle, (max odometer - min odometer)
  const vehicleOdometers = new Map<string, { min: number; max: number }>();
  for (const reading of kmData) {
    const existing = vehicleOdometers.get(reading.vehicleId);
    if (!existing) {
      vehicleOdometers.set(reading.vehicleId, {
        min: reading.odometerKm,
        max: reading.odometerKm,
      });
    } else {
      if (reading.odometerKm < existing.min) existing.min = reading.odometerKm;
      if (reading.odometerKm > existing.max) existing.max = reading.odometerKm;
    }
  }
  let totalKmThisMonth = 0;
  for (const { min, max } of vehicleOdometers.values()) {
    totalKmThisMonth += max - min;
  }

  // Trend calculation
  let trendPercentage = 0;
  let trendDirection: "up" | "down" | "neutral" = "neutral";
  if (emissionsLastMonth > 0) {
    trendPercentage = round2(
      ((emissionsThisMonth - emissionsLastMonth) / emissionsLastMonth) * 100
    );
    if (Math.abs(trendPercentage) <= 2) {
      trendDirection = "neutral";
    } else if (trendPercentage > 0) {
      trendDirection = "up";
    } else {
      trendDirection = "down";
    }
  } else if (emissionsThisMonth > 0) {
    trendPercentage = 100;
    trendDirection = "up";
  }

  return {
    emissionsThisMonth,
    emissionsLastMonth,
    trendPercentage,
    trendDirection,
    activeVehicles,
    totalKmThisMonth,
    totalFuelThisMonth,
    totalKwhThisMonth,
  };
}

// ---------------------------------------------------------------------------
// getEmissionsTrend
// ---------------------------------------------------------------------------

/**
 * Returns monthly emissions for the last N months (default 12).
 * Used for the sparkline in the hero KPI card.
 */
export async function getEmissionsTrend(
  tenantId: string,
  months: number = 12,
  now: Date = new Date()
): Promise<EmissionsTrendPoint[]> {
  const tenantPrisma = getPrismaForTenant(tenantId);
  const result: EmissionsTrendPoint[] = [];

  // Process months sequentially from oldest to newest
  for (let i = months - 1; i >= 0; i--) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthEnd = new Date(
      now.getFullYear(),
      now.getMonth() - i + 1,
      0,
      23, 59, 59, 999
    );

    const monthLabel = MONTH_LABELS[monthStart.getMonth()];

    try {
      const emissions = await calculatePeriodEmissions(
        tenantPrisma,
        monthStart,
        monthEnd
      );
      result.push({ month: monthLabel, value: emissions });
    } catch {
      result.push({ month: monthLabel, value: 0 });
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// getFilteredEmissionsTrend
// ---------------------------------------------------------------------------

/**
 * Returns monthly emissions trend filtered by optional scope and fuel types.
 */
export async function getFilteredEmissionsTrend(
  tenantId: string,
  months: number = 12,
  filters?: EmissionsTrendFilter,
  now: Date = new Date()
): Promise<EmissionsTrendPoint[]> {
  const tenantPrisma = getPrismaForTenant(tenantId);
  const result: EmissionsTrendPoint[] = [];

  for (let i = months - 1; i >= 0; i--) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthEnd = new Date(
      now.getFullYear(),
      now.getMonth() - i + 1,
      0,
      23, 59, 59, 999
    );

    const monthLabel = MONTH_LABELS[monthStart.getMonth()];

    try {
      const emissions = await calculateFilteredPeriodEmissions(
        tenantPrisma,
        monthStart,
        monthEnd,
        filters
      );
      result.push({ month: monthLabel, value: emissions });
    } catch {
      result.push({ month: monthLabel, value: 0 });
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// calculateFilteredPeriodEmissions (with scope/fuelType filters)
// ---------------------------------------------------------------------------

async function calculateFilteredPeriodEmissions(
  tenantPrisma: ReturnType<typeof getPrismaForTenant>,
  startDate: Date,
  endDate: Date,
  filters?: EmissionsTrendFilter
): Promise<number> {
  const fuelRecords = await tenantPrisma.fuelRecord.findMany({
    where: {
      date: { gte: startDate, lte: endDate },
    },
    select: {
      quantityLiters: true,
      quantityKwh: true,
      fuelType: true,
      date: true,
    },
  });

  if (fuelRecords.length === 0) return 0;

  // Group by fuel type
  const fuelByType = new Map<string, { litres: number; kwh: number }>();
  for (const record of fuelRecords) {
    const current = fuelByType.get(record.fuelType) ?? { litres: 0, kwh: 0 };
    current.litres += record.quantityLiters;
    current.kwh += record.quantityKwh ?? 0;
    fuelByType.set(record.fuelType, current);
  }

  const medianDate = new Date(
    (startDate.getTime() + endDate.getTime()) / 2
  );

  const allContexts = await resolveAllEmissionContextsBulk(
    prisma as unknown as PrismaClient,
    medianDate
  );

  let totalKgCO2e = 0;
  for (const [fuelType, quantities] of fuelByType) {
    const contexts = allContexts.get(fuelType);
    if (!contexts || contexts.length === 0) continue;

    for (const ctx of contexts) {
      // Scope filter: skip if scope doesn't match
      if (filters?.scope && ctx.macroFuelType.scope !== filters.scope) {
        continue;
      }

      // Fuel type filter: skip if macro fuel type name doesn't match
      if (filters?.fuelTypes && filters.fuelTypes.length > 0) {
        if (!filters.fuelTypes.includes(ctx.macroFuelType.name)) {
          continue;
        }
      }

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

  return round2(totalKgCO2e);
}

// ---------------------------------------------------------------------------
// getEmissionFilterOptions
// ---------------------------------------------------------------------------

/**
 * Returns available filter options (fuel types + scopes) for the tenant.
 */
export async function getEmissionFilterOptions(): Promise<EmissionFilterOptions> {
  const macroFuelTypes = await (prisma as unknown as PrismaClient).macroFuelType.findMany({
    select: { name: true, scope: true },
    orderBy: { name: "asc" },
  });

  const fuelTypes: EmissionFilterOption[] = [
    ...new Map(
      macroFuelTypes.map((m) => [m.name, { value: m.name, label: m.name }])
    ).values(),
  ];

  const scopeSet = new Set(macroFuelTypes.map((m) => m.scope));
  const scopes: EmissionFilterOption[] = [...scopeSet]
    .sort()
    .map((s) => ({
      value: String(s),
      label: s === 1 ? "Scope 1 (Combustione)" : "Scope 2 (Elettricità)",
    }));

  return { fuelTypes, scopes };
}

// ---------------------------------------------------------------------------
// getFleetDelta
// ---------------------------------------------------------------------------

/**
 * Returns theoretical and real emissions for the fleet in a date range.
 * Uses emission-data-loader for per-vehicle data and aggregates.
 */
export async function getFleetDelta(
  tenantId: string,
  startDate: Date,
  endDate: Date
): Promise<FleetDelta> {
  const tenantPrisma = getPrismaForTenant(tenantId);

  // Get all active vehicles
  const vehicles = await tenantPrisma.tenantVehicle.findMany({
    where: { status: "ACTIVE" },
    include: {
      catalogVehicle: {
        include: { engines: true },
      },
    },
  });

  // Bulk-resolve all emission contexts once (V2: per-gas, multi-scope)
  const medianDate = new Date(
    (startDate.getTime() + endDate.getTime()) / 2
  );
  const allContexts = await resolveAllEmissionContextsBulk(
    prisma as unknown as PrismaClient,
    medianDate
  );

  // Bulk-load ALL fuel records for the period (avoid N+1)
  const vehicleIds = vehicles.map((v) => v.id);
  const allFuelRecords = await tenantPrisma.fuelRecord.findMany({
    where: {
      vehicleId: { in: vehicleIds },
      date: { gte: startDate, lte: endDate },
    },
    orderBy: { odometerKm: "asc" },
    select: {
      vehicleId: true,
      quantityLiters: true,
      quantityKwh: true,
      fuelType: true,
      odometerKm: true,
      date: true,
    },
  });

  // Group by vehicleId
  const recordsByVehicle = new Map<string, typeof allFuelRecords>();
  for (const fr of allFuelRecords) {
    const list = recordsByVehicle.get(fr.vehicleId);
    if (list) {
      list.push(fr);
    } else {
      recordsByVehicle.set(fr.vehicleId, [fr]);
    }
  }

  let totalTheoretical = 0;
  let totalReal = 0;

  for (const vehicle of vehicles) {
    const fuelRecords = recordsByVehicle.get(vehicle.id);
    if (!fuelRecords || fuelRecords.length < 2) continue;

    // Calculate km travelled
    const first = fuelRecords[0];
    const last = fuelRecords[fuelRecords.length - 1];
    const kmTravelled = last.odometerKm - first.odometerKm;
    if (kmTravelled <= 0) continue;

    // Theoretical: use combined co2GKm (hybrid-aware)
    const co2GKm = getCombinedCo2GKm(
      vehicle.catalogVehicle.engines,
      vehicle.catalogVehicle.isHybrid
    );
    const theoretical = round2((co2GKm * kmTravelled) / 1000);
    totalTheoretical += theoretical;

    // Real: V2 multi-gas, multi-scope calculation (hybrid-aware fuel type)
    const fuelType = getEffectiveFuelType(vehicle.catalogVehicle, fuelRecords);
    if (!fuelType) continue;
    const contexts = allContexts.get(fuelType);
    if (!contexts || contexts.length === 0) continue;

    const totalLitres = fuelRecords.reduce(
      (sum, fr) => sum + fr.quantityLiters,
      0
    );
    const totalKwh = fuelRecords.reduce(
      (sum, fr) => sum + (fr.quantityKwh ?? 0),
      0
    );

    for (const ctx of contexts) {
      const quantity = ctx.macroFuelType.scope === 1
        ? totalLitres
        : totalKwh;

      const result = calculateScopedEmissions({
        quantity,
        gasFactors: ctx.gasFactors,
        gwpValues: ctx.gwpValues,
      });
      totalReal += result.totalCO2e;
    }
  }

  return {
    theoretical: round2(totalTheoretical),
    real: round2(totalReal),
  };
}

// ---------------------------------------------------------------------------
// getTargetProgress
// ---------------------------------------------------------------------------

/**
 * Loads the active EmissionTarget for the fleet (scope="Fleet") and
 * calculates progress using emission-calculator.calculateTargetProgress.
 *
 * Returns null if no target is configured.
 */
export async function getTargetProgress(
  tenantId: string,
  now: Date = new Date()
): Promise<DashboardTargetProgress | null> {
  const tenantPrisma = getPrismaForTenant(tenantId);

  // Find active fleet-scope emission target
  const target = await tenantPrisma.emissionTarget.findFirst({
    where: {
      scope: "Fleet",
      startDate: { lte: now },
      endDate: { gte: now },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!target) return null;

  // Calculate current emissions in the target period
  const currentEmissions = await calculatePeriodEmissions(
    tenantPrisma,
    target.startDate,
    now < target.endDate ? now : target.endDate
  );

  const progress = calculateTargetProgress(
    target.targetValue,
    currentEmissions,
    target.startDate,
    target.endDate,
    now,
    target.period as TargetPeriod
  );

  return {
    ...progress,
    description: target.description,
    period: target.period as TargetPeriod,
  };
}

// ---------------------------------------------------------------------------
// getNotifications
// ---------------------------------------------------------------------------

/**
 * Returns notifications for:
 * - Contracts expiring within 30/60/90 days
 * - Documents expiring within 30/60 days
 *
 * Each notification includes severity, title, and navigation link.
 */
export async function getNotifications(
  tenantId: string,
  now: Date = new Date()
): Promise<DashboardNotifications> {
  const tenantPrisma = getPrismaForTenant(tenantId);

  const contracts: DashboardNotification[] = [];
  const documents: DashboardNotification[] = [];

  // Date thresholds
  const in30Days = new Date(now);
  in30Days.setDate(in30Days.getDate() + 30);
  const in60Days = new Date(now);
  in60Days.setDate(in60Days.getDate() + 60);
  const in90Days = new Date(now);
  in90Days.setDate(in90Days.getDate() + 90);

  // ── Contracts expiring within 90 days ──────────────────────────────
  const expiringContracts = await tenantPrisma.contract.findMany({
    where: {
      status: "ACTIVE",
      endDate: {
        gte: now,
        lte: in90Days,
      },
    },
    include: {
      vehicle: {
        select: { licensePlate: true },
      },
    },
    orderBy: { endDate: "asc" },
  });

  for (const contract of expiringContracts) {
    const endDate = contract.endDate!;
    const daysRemaining = Math.ceil(
      (endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    let severity: NotificationSeverity;
    if (daysRemaining <= 30) {
      severity = "destructive";
    } else if (daysRemaining <= 60) {
      severity = "warning";
    } else {
      severity = "info";
    }

    const typeLabel = CONTRACT_TYPE_LABELS[contract.type] ?? contract.type;

    contracts.push({
      id: contract.id,
      type: "contract",
      title: `${typeLabel} - ${contract.vehicle.licensePlate}`,
      description: `Scade tra ${daysRemaining} giorni`,
      severity,
      link: `/contracts/${contract.id}`,
      daysRemaining,
    });
  }

  // ── Documents expiring within 60 days ──────────────────────────────
  const expiringDocuments = await tenantPrisma.vehicleDocument.findMany({
    where: {
      expiryDate: {
        gte: now,
        lte: in60Days,
      },
    },
    include: {
      vehicle: {
        select: { licensePlate: true },
      },
    },
    orderBy: { expiryDate: "asc" },
  });

  for (const doc of expiringDocuments) {
    const daysRemaining = Math.ceil(
      (doc.expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    let severity: NotificationSeverity;
    if (daysRemaining <= 30) {
      severity = "destructive";
    } else {
      severity = "warning";
    }

    const typeLabel = DOCUMENT_TYPE_LABELS[doc.documentType] ?? doc.documentType;

    documents.push({
      id: doc.id,
      type: "document",
      title: `${typeLabel} - ${doc.vehicle.licensePlate}`,
      description: `Scade tra ${daysRemaining} giorni`,
      severity,
      link: `/fleet/${doc.vehicleId}`,
      daysRemaining,
    });
  }

  return {
    contracts,
    documents,
    total: contracts.length + documents.length,
  };
}

// ---------------------------------------------------------------------------
// Fuel-type breakdown types (grouped by MacroFuelType)
// ---------------------------------------------------------------------------

export type FuelTypeVehicleDetail = {
  vehicleId: string;
  licensePlate: string;
  make: string;
  model: string;
  km: number;
  litres: number;
  kwh: number;
  emissionsKgCO2e: number;
};

export type FuelTypeBreakdownItem = {
  fuelType: string;        // MacroFuelType.name (grouping key)
  fuelTypeLabel: string;   // MacroFuelType.name (display label)
  color: string;           // hex color from MacroFuelType.color
  vehicleCount: number;
  totalKm: number;
  totalLitres: number;
  totalKwh: number;
  emissionsKgCO2e: number;
  emissionsPercentage: number;
  vehicles: FuelTypeVehicleDetail[];
};

export type FuelTypeBreakdownResult = {
  items: FuelTypeBreakdownItem[];
  totals: {
    vehicles: number;
    km: number;
    emissions: number;
  };
};

// ---------------------------------------------------------------------------
// getFleetBreakdownByFuelType
// ---------------------------------------------------------------------------

/**
 * Returns fleet breakdown grouped by MacroFuelType (e.g. "Benzina", "Diesel",
 * "Elettricita") for the current month.
 *
 * Each vehicle is counted exactly once under its primary MacroFuelType
 * (resolved via FuelTypeMacroMapping). Hybrid vehicles are assigned to the
 * scope-1 (thermal) MacroFuelType for counting, but their emissions from
 * ALL scopes are summed into the group.
 *
 * Colors come from MacroFuelType.color in the database.
 */
export async function getFleetBreakdownByFuelType(
  tenantId: string,
  now: Date = new Date()
): Promise<FuelTypeBreakdownResult> {
  const tenantPrisma = getPrismaForTenant(tenantId);

  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const thisMonthEnd = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
    23, 59, 59, 999
  );

  // Load vehicles, fuel records, AND all macro fuel type mappings in parallel
  const [vehicles, fuelRecords, allMappings] = await Promise.all([
    tenantPrisma.tenantVehicle.findMany({
      where: { status: "ACTIVE" },
      include: {
        catalogVehicle: {
          include: { engines: true },
        },
      },
    }),
    tenantPrisma.fuelRecord.findMany({
      where: { date: { gte: thisMonthStart, lte: thisMonthEnd } },
      select: {
        vehicleId: true,
        fuelType: true,
        quantityLiters: true,
        quantityKwh: true,
        odometerKm: true,
      },
    }),
    // Load FuelTypeMacroMapping with MacroFuelType to build lookup
    (prisma as unknown as PrismaClient).fuelTypeMacroMapping.findMany({
      include: { macroFuelType: true },
      orderBy: [{ vehicleFuelType: "asc" }, { scope: "asc" }],
    }),
  ]);

  // Build lookup: vehicleFuelType -> primary MacroFuelType (scope 1 preferred for grouping)
  // For hybrids, scope 1 = thermal MacroFuelType, scope 2 = electric MacroFuelType.
  // We group the vehicle under the scope-1 MacroFuelType for counting purposes.
  type MacroInfo = { id: string; name: string; color: string };
  const fuelTypeToMacro = new Map<string, MacroInfo>();
  // First pass: collect scope-1 mappings (preferred for grouping)
  for (const m of allMappings) {
    if (m.scope === 1) {
      fuelTypeToMacro.set(m.vehicleFuelType, {
        id: m.macroFuelType.id,
        name: m.macroFuelType.name,
        color: m.macroFuelType.color,
      });
    }
  }
  // Second pass: fill in any fuel types that only have scope-2 (e.g. pure electric)
  for (const m of allMappings) {
    if (!fuelTypeToMacro.has(m.vehicleFuelType)) {
      fuelTypeToMacro.set(m.vehicleFuelType, {
        id: m.macroFuelType.id,
        name: m.macroFuelType.name,
        color: m.macroFuelType.color,
      });
    }
  }

  // Index fuel records by vehicleId
  const fuelByVehicle = new Map<
    string,
    { litres: number; kwh: number; fuelType: string; minOdo: number; maxOdo: number }
  >();
  for (const fr of fuelRecords) {
    const existing = fuelByVehicle.get(fr.vehicleId);
    if (!existing) {
      fuelByVehicle.set(fr.vehicleId, {
        litres: fr.quantityLiters,
        kwh: fr.quantityKwh ?? 0,
        fuelType: fr.fuelType,
        minOdo: fr.odometerKm,
        maxOdo: fr.odometerKm,
      });
    } else {
      existing.litres += fr.quantityLiters;
      existing.kwh += fr.quantityKwh ?? 0;
      if (fr.odometerKm < existing.minOdo) existing.minOdo = fr.odometerKm;
      if (fr.odometerKm > existing.maxOdo) existing.maxOdo = fr.odometerKm;
    }
  }

  // Bulk-resolve emission contexts for emission calculation
  const medianDate = new Date(
    (thisMonthStart.getTime() + thisMonthEnd.getTime()) / 2
  );
  const allContexts = await resolveAllEmissionContextsBulk(
    prisma as unknown as PrismaClient,
    medianDate
  );

  // Group by MacroFuelType name (not individual fuel type)
  type MacroGroup = {
    macroName: string;
    color: string;
    vehicleIds: Set<string>;
    vehicles: FuelTypeVehicleDetail[];
    totalLitres: number;
    totalKwh: number;
    totalKm: number;
    totalEmissions: number;
  };
  const groups = new Map<string, MacroGroup>();

  for (const vehicle of vehicles) {
    if (!vehicle.catalogVehicle?.engines?.length) continue;

    const effectiveFuelType = getEffectiveFuelType(vehicle.catalogVehicle);
    if (!effectiveFuelType) continue;

    // Resolve to MacroFuelType for grouping
    const macro = fuelTypeToMacro.get(effectiveFuelType);
    if (!macro) {
      logger.warn(
        { effectiveFuelType },
        "Dashboard: no MacroFuelType mapping found for vehicle fuel type"
      );
      continue;
    }

    const vehicleFuel = fuelByVehicle.get(vehicle.id);
    const litres = vehicleFuel?.litres ?? 0;
    const kwh = vehicleFuel?.kwh ?? 0;
    const km = vehicleFuel ? Math.max(0, vehicleFuel.maxOdo - vehicleFuel.minOdo) : 0;

    // Calculate per-vehicle total emissions (ALL scopes combined)
    let vehicleEmissions = 0;
    const contexts = allContexts.get(effectiveFuelType);
    if (contexts && (litres > 0 || kwh > 0)) {
      for (const ctx of contexts) {
        const quantity = ctx.macroFuelType.scope === 1 ? litres : kwh;
        const result = calculateScopedEmissions({
          quantity,
          gasFactors: ctx.gasFactors,
          gwpValues: ctx.gwpValues,
        });
        vehicleEmissions += result.totalCO2e;
      }
    }

    const detail: FuelTypeVehicleDetail = {
      vehicleId: vehicle.id,
      licensePlate: vehicle.licensePlate,
      make: vehicle.catalogVehicle?.marca ?? "",
      model: vehicle.catalogVehicle?.modello ?? "",
      km,
      litres: round2(litres),
      kwh: round2(kwh),
      emissionsKgCO2e: round2(vehicleEmissions),
    };

    // Group by MacroFuelType.name
    const groupKey = macro.name;
    const group = groups.get(groupKey);
    if (!group) {
      groups.set(groupKey, {
        macroName: macro.name,
        color: macro.color,
        vehicleIds: new Set([vehicle.id]),
        vehicles: [detail],
        totalLitres: litres,
        totalKwh: kwh,
        totalKm: km,
        totalEmissions: vehicleEmissions,
      });
    } else {
      group.vehicleIds.add(vehicle.id);
      group.vehicles.push(detail);
      group.totalLitres += litres;
      group.totalKwh += kwh;
      group.totalKm += km;
      group.totalEmissions += vehicleEmissions;
    }
  }

  // Build result items
  const items: FuelTypeBreakdownItem[] = [];
  let grandTotalEmissions = 0;

  for (const [groupKey, group] of groups) {
    grandTotalEmissions += group.totalEmissions;

    items.push({
      fuelType: groupKey,
      fuelTypeLabel: group.macroName,
      color: group.color,
      vehicleCount: group.vehicleIds.size,
      totalKm: group.totalKm,
      totalLitres: round2(group.totalLitres),
      totalKwh: round2(group.totalKwh),
      emissionsKgCO2e: round2(group.totalEmissions),
      emissionsPercentage: 0,
      vehicles: group.vehicles.sort((a, b) => b.emissionsKgCO2e - a.emissionsKgCO2e),
    });
  }

  // Percentages + sort by emissions DESC
  for (const item of items) {
    item.emissionsPercentage =
      grandTotalEmissions > 0
        ? round2((item.emissionsKgCO2e / grandTotalEmissions) * 100)
        : 0;
  }
  items.sort((a, b) => b.emissionsKgCO2e - a.emissionsKgCO2e);

  // Totals
  const allVehicleIds = new Set<string>();
  for (const group of groups.values()) {
    for (const vid of group.vehicleIds) allVehicleIds.add(vid);
  }

  const totals = {
    vehicles: allVehicleIds.size,
    km: items.reduce((s, i) => s + i.totalKm, 0),
    emissions: round2(grandTotalEmissions),
  };

  return { items, totals };
}

// ---------------------------------------------------------------------------
// CarList breakdown types
// ---------------------------------------------------------------------------

export type CarlistBreakdownItem = {
  carlistId: string;
  carlistName: string;
  vehicleCount: number;
  totalKm: number;
  totalLitres: number;
  totalKwh: number;
  emissionsKgCO2e: number;
  emissionsPercentage: number;
};

export type CarlistBreakdownResult = {
  items: CarlistBreakdownItem[];
  totals: {
    vehicles: number;
    km: number;
    emissions: number;
  };
  unassignedVehicles: number;
};

// ---------------------------------------------------------------------------
// getFleetBreakdownByCarlist
// ---------------------------------------------------------------------------

/**
 * Returns fleet breakdown grouped by Carlist (Parco Auto) for the current month.
 *
 * Each carlist shows: vehicle count, total km, fuel consumption (L + kWh),
 * emissions (kgCO2e), and percentage of total fleet emissions.
 *
 * Vehicles belonging to multiple carlists are counted in each one.
 * The totals row de-duplicates vehicles.
 */
export async function getFleetBreakdownByCarlist(
  tenantId: string,
  now: Date = new Date()
): Promise<CarlistBreakdownResult> {
  const tenantPrisma = getPrismaForTenant(tenantId);

  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const thisMonthEnd = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
    23, 59, 59, 999
  );

  // Load vehicles, fuel records, carlist memberships in parallel
  const [vehicles, fuelRecords, carlistVehicles] = await Promise.all([
    tenantPrisma.tenantVehicle.findMany({
      where: { status: "ACTIVE" },
      include: {
        catalogVehicle: {
          include: { engines: true },
        },
      },
    }),
    tenantPrisma.fuelRecord.findMany({
      where: { date: { gte: thisMonthStart, lte: thisMonthEnd } },
      select: {
        vehicleId: true,
        fuelType: true,
        quantityLiters: true,
        quantityKwh: true,
        odometerKm: true,
      },
    }),
    tenantPrisma.carlistVehicle.findMany({
      include: { carlist: { select: { id: true, name: true } } },
    }),
  ]);

  // If no carlists exist, return empty
  if (carlistVehicles.length === 0) {
    return { items: [], totals: { vehicles: 0, km: 0, emissions: 0 }, unassignedVehicles: 0 };
  }

  // Build carlist membership map: catalogVehicleId → carlist[]
  const catalogToCarlist = new Map<string, Array<{ id: string; name: string }>>();
  for (const cv of carlistVehicles) {
    const entry = cv as unknown as {
      catalogVehicleId: string;
      carlist: { id: string; name: string };
    };
    const list = catalogToCarlist.get(entry.catalogVehicleId) ?? [];
    list.push({ id: entry.carlist.id, name: entry.carlist.name });
    catalogToCarlist.set(entry.catalogVehicleId, list);
  }

  // Index fuel records by vehicleId
  const fuelByVehicle = new Map<
    string,
    { litres: number; kwh: number; fuelType: string; minOdo: number; maxOdo: number }
  >();
  for (const fr of fuelRecords) {
    const existing = fuelByVehicle.get(fr.vehicleId);
    if (!existing) {
      fuelByVehicle.set(fr.vehicleId, {
        litres: fr.quantityLiters,
        kwh: fr.quantityKwh ?? 0,
        fuelType: fr.fuelType,
        minOdo: fr.odometerKm,
        maxOdo: fr.odometerKm,
      });
    } else {
      existing.litres += fr.quantityLiters;
      existing.kwh += fr.quantityKwh ?? 0;
      if (fr.odometerKm < existing.minOdo) existing.minOdo = fr.odometerKm;
      if (fr.odometerKm > existing.maxOdo) existing.maxOdo = fr.odometerKm;
    }
  }

  // Bulk-resolve emission contexts
  const medianDate = new Date(
    (thisMonthStart.getTime() + thisMonthEnd.getTime()) / 2
  );
  const allContexts = await resolveAllEmissionContextsBulk(
    prisma as unknown as PrismaClient,
    medianDate
  );

  // Per-vehicle emissions cache
  const vehicleEmissionsCache = new Map<string, number>();

  function getVehicleEmissions(vehicleId: string, vehicle: typeof vehicles[number]): number {
    if (vehicleEmissionsCache.has(vehicleId)) {
      return vehicleEmissionsCache.get(vehicleId)!;
    }

    const vehicleFuel = fuelByVehicle.get(vehicleId);
    if (!vehicleFuel) {
      vehicleEmissionsCache.set(vehicleId, 0);
      return 0;
    }

    const fuelType = getEffectiveFuelType(vehicle.catalogVehicle);
    if (!fuelType) {
      vehicleEmissionsCache.set(vehicleId, 0);
      return 0;
    }

    const contexts = allContexts.get(fuelType);
    if (!contexts || contexts.length === 0) {
      vehicleEmissionsCache.set(vehicleId, 0);
      return 0;
    }

    let totalEmissions = 0;
    for (const ctx of contexts) {
      const quantity = ctx.macroFuelType.scope === 1
        ? vehicleFuel.litres
        : vehicleFuel.kwh;
      const result = calculateScopedEmissions({
        quantity,
        gasFactors: ctx.gasFactors,
        gwpValues: ctx.gwpValues,
      });
      totalEmissions += result.totalCO2e;
    }

    vehicleEmissionsCache.set(vehicleId, totalEmissions);
    return totalEmissions;
  }

  // Aggregate per carlist
  type CarlistGroup = {
    name: string;
    vehicleIds: Set<string>;
    totalKm: number;
    totalLitres: number;
    totalKwh: number;
    totalEmissions: number;
  };
  const groups = new Map<string, CarlistGroup>();

  const allVehicleIds = new Set<string>();
  const assignedVehicleIds = new Set<string>();

  for (const vehicle of vehicles) {
    allVehicleIds.add(vehicle.id);
    if (!vehicle.catalogVehicle?.engines?.length) continue;

    const vehicleFuel = fuelByVehicle.get(vehicle.id);
    const km = vehicleFuel ? Math.max(0, vehicleFuel.maxOdo - vehicleFuel.minOdo) : 0;
    const litres = vehicleFuel?.litres ?? 0;
    const kwh = vehicleFuel?.kwh ?? 0;
    const emissions = getVehicleEmissions(vehicle.id, vehicle);

    const carlists = catalogToCarlist.get(vehicle.catalogVehicleId);
    if (!carlists || carlists.length === 0) continue;

    assignedVehicleIds.add(vehicle.id);

    for (const cl of carlists) {
      const group = groups.get(cl.id);
      if (!group) {
        groups.set(cl.id, {
          name: cl.name,
          vehicleIds: new Set([vehicle.id]),
          totalKm: km,
          totalLitres: litres,
          totalKwh: kwh,
          totalEmissions: emissions,
        });
      } else {
        group.vehicleIds.add(vehicle.id);
        group.totalKm += km;
        group.totalLitres += litres;
        group.totalKwh += kwh;
        group.totalEmissions += emissions;
      }
    }
  }

  // Build result
  let grandTotalEmissions = 0;
  const uniqueVehicleIds = new Set<string>();

  const items: CarlistBreakdownItem[] = [];
  for (const [carlistId, group] of groups) {
    grandTotalEmissions += group.totalEmissions;
    for (const vid of group.vehicleIds) uniqueVehicleIds.add(vid);

    items.push({
      carlistId,
      carlistName: group.name,
      vehicleCount: group.vehicleIds.size,
      totalKm: group.totalKm,
      totalLitres: round2(group.totalLitres),
      totalKwh: round2(group.totalKwh),
      emissionsKgCO2e: round2(group.totalEmissions),
      emissionsPercentage: 0,
    });
  }

  // Percentages + sort by emissions DESC
  for (const item of items) {
    item.emissionsPercentage =
      grandTotalEmissions > 0
        ? round2((item.emissionsKgCO2e / grandTotalEmissions) * 100)
        : 0;
  }
  items.sort((a, b) => b.emissionsKgCO2e - a.emissionsKgCO2e);

  return {
    items,
    totals: {
      vehicles: uniqueVehicleIds.size,
      km: items.reduce((s, i) => s + i.totalKm, 0),
      emissions: round2(grandTotalEmissions),
    },
    unassignedVehicles: allVehicleIds.size - assignedVehicleIds.size,
  };
}
