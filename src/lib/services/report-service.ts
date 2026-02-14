// ---------------------------------------------------------------------------
// Report Service — Emission aggregation, time series, and breakdown (Story 6.4)
// ---------------------------------------------------------------------------
// Uses tenant-scoped Prisma for vehicle/fuel/km data.
// V2: multi-gas, multi-scope emission calculation via emission-resolution-service
// and emission-calculator (calculateScopedEmissions).
// ---------------------------------------------------------------------------

import type { PrismaClient } from "@/generated/prisma/client";
import type { PrismaClientWithTenant } from "@/lib/db/client";
import type {
  ReportParams,
  ReportResult,
  EmissionAggregation,
  EmissionTimeSeries,
  EmissionBreakdown,
  PeriodGranularity,
  DrillDownResult,
  DrillDownItem,
  VehicleEmissionDetail,
} from "@/types/report";
import {
  calculateTheoreticalEmissions,
  calculateScopedEmissions,
  calculateDelta,
  calculateTargetProgress,
  round2,
} from "@/lib/services/emission-calculator";
import { resolveAllEmissionContextsBulk } from "@/lib/services/emission-resolution-service";
import type { EmissionContext } from "@/types/emission";
import { getEffectiveFuelType, getCombinedCo2GKm } from "@/lib/utils/fuel-type";
import type { TargetProgress, TargetScope, TargetPeriod } from "@/types/emission-target";
import { getFuelTypeLabels } from "@/lib/utils/fuel-type-label";

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

type VehicleDataRow = {
  vehicleId: string;
  label: string;
  licensePlate: string;
  fuelType: string;
  co2GKm: number;
  fuelLitres: number;
  fuelKwh: number;
  kmTravelled: number;
  emissionFactor: number; // backward-compat: total kgCO2e / L approximation
  emissionContexts: EmissionContext[];
  carlistIds: string[];
  carlistNames: string[];
  /** Period key for per-period breakdowns (e.g. "2025-01", "2025-Q1") */
  periodKey: string;
  periodLabel: string;
};

// ---------------------------------------------------------------------------
// V2 emission helper
// ---------------------------------------------------------------------------

/**
 * Computes total real CO2e from resolved emission contexts.
 * Iterates over all contexts (1 for pure fuels, 2 for hybrids),
 * using litres for scope 1 and kWh for scope 2.
 */
function computeRealEmissionsFromContexts(
  contexts: EmissionContext[],
  fuelLitres: number,
  fuelKwh: number
): number {
  let total = 0;
  for (const ctx of contexts) {
    const quantity = ctx.macroFuelType.scope === 1 ? fuelLitres : fuelKwh;
    const result = calculateScopedEmissions({
      quantity,
      gasFactors: ctx.gasFactors,
      gwpValues: ctx.gwpValues,
    });
    total += result.totalCO2e;
  }
  return round2(total);
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export async function getAggregatedEmissions(
  prisma: PrismaClientWithTenant,
  params: ReportParams
): Promise<ReportResult> {
  const { dateRange, aggregationLevel, periodGranularity } = params;
  const granularity = periodGranularity ?? "MONTHLY";
  const fuelTypeLabels = await getFuelTypeLabels();

  // 1. Load all tenant vehicles (optionally filtered by carlist)
  const vehicles = await loadVehicles(prisma, params);

  if (vehicles.length === 0) {
    return emptyResult(params);
  }

  const vehicleIds = vehicles.map((v) => v.id);

  // 2. Load fuel records, km readings, emission contexts, and carlist mappings
  const [fuelRecords, kmReadings, emissionContexts, carlistMappings] =
    await Promise.all([
      loadFuelRecords(prisma, vehicleIds, dateRange),
      loadKmReadings(prisma, vehicleIds, dateRange),
      loadEmissionContexts(prisma, dateRange),
      loadCarlistMappings(prisma, vehicleIds),
    ]);

  // 3. Build per-vehicle-per-period data rows
  const rows = buildDataRows(
    vehicles,
    fuelRecords,
    kmReadings,
    emissionContexts,
    carlistMappings,
    dateRange,
    granularity
  );

  // 4. Aggregate based on level
  const aggregations = aggregate(rows, aggregationLevel, fuelTypeLabels);

  // 5. Time series
  const timeSeries = buildTimeSeries(rows, granularity);

  // 6. Breakdown by fuel type
  const breakdown = buildBreakdown(rows, fuelTypeLabels);

  // 7. Compute metadata
  const metadata = computeMetadata(aggregations, vehicles, dateRange);

  return { aggregations, timeSeries, breakdown, metadata };
}

export async function getEmissionTimeSeries(
  prisma: PrismaClientWithTenant,
  params: ReportParams
): Promise<EmissionTimeSeries[]> {
  const result = await getAggregatedEmissions(prisma, params);
  return result.timeSeries;
}

export async function getEmissionBreakdown(
  prisma: PrismaClientWithTenant,
  params: ReportParams
): Promise<EmissionBreakdown[]> {
  const result = await getAggregatedEmissions(prisma, params);
  return result.breakdown;
}

// ---------------------------------------------------------------------------
// Data loading helpers
// ---------------------------------------------------------------------------

async function loadVehicles(
  prisma: PrismaClientWithTenant,
  params: ReportParams
) {
  // If carlistId is specified, only load vehicles in that carlist
  if (params.carlistId) {
    const carlistVehicles = await prisma.carlistVehicle.findMany({
      where: { carlistId: params.carlistId },
      select: { catalogVehicleId: true },
    });
    const catalogVehicleIds = carlistVehicles.map((cv) => cv.catalogVehicleId);
    if (catalogVehicleIds.length === 0) return [];

    return prisma.tenantVehicle.findMany({
      where: { catalogVehicleId: { in: catalogVehicleIds } },
      include: {
        catalogVehicle: {
          include: { engines: true },
        },
      },
    });
  }

  return prisma.tenantVehicle.findMany({
    where: { status: "ACTIVE" },
    include: {
      catalogVehicle: {
        include: { engines: true },
      },
    },
  });
}

async function loadFuelRecords(
  prisma: PrismaClientWithTenant,
  vehicleIds: string[],
  dateRange: { startDate: Date; endDate: Date }
) {
  return prisma.fuelRecord.findMany({
    where: {
      vehicleId: { in: vehicleIds },
      date: { gte: dateRange.startDate, lte: dateRange.endDate },
    },
    orderBy: { date: "asc" },
  });
}

async function loadKmReadings(
  prisma: PrismaClientWithTenant,
  vehicleIds: string[],
  dateRange: { startDate: Date; endDate: Date }
) {
  return prisma.kmReading.findMany({
    where: {
      vehicleId: { in: vehicleIds },
      date: { gte: dateRange.startDate, lte: dateRange.endDate },
    },
    orderBy: { date: "asc" },
    select: { vehicleId: true, odometerKm: true, date: true },
  });
}

/**
 * V2: Loads emission contexts for all fuel types using the bulk resolver.
 * Returns Map<vehicleFuelType, EmissionContext[]>.
 * The referenceDate is the median of the date range.
 */
async function loadEmissionContexts(
  prisma: PrismaClientWithTenant,
  dateRange: { startDate: Date; endDate: Date }
): Promise<Map<string, EmissionContext[]>> {
  const medianDate = new Date(
    (dateRange.startDate.getTime() + dateRange.endDate.getTime()) / 2
  );
  return resolveAllEmissionContextsBulk(
    prisma as unknown as PrismaClient,
    medianDate
  );
}

async function loadCarlistMappings(
  prisma: PrismaClientWithTenant,
  vehicleIds: string[]
) {
  // Get catalogVehicleId for each TenantVehicle
  const vehicles = await prisma.tenantVehicle.findMany({
    where: { id: { in: vehicleIds } },
    select: { id: true, catalogVehicleId: true },
  });

  const catalogVehicleIds = [
    ...new Set(vehicles.map((v) => v.catalogVehicleId)),
  ];

  const entries = await prisma.carlistVehicle.findMany({
    where: { catalogVehicleId: { in: catalogVehicleIds } },
    include: {
      carlist: { select: { id: true, name: true } },
    },
  });

  // Build catalogVehicleId → carlists
  const catalogToCarlist = new Map<
    string,
    Array<{ id: string; name: string }>
  >();
  for (const entry of entries) {
    const e = entry as unknown as {
      catalogVehicleId: string;
      carlist: { id: string; name: string };
    };
    const existing = catalogToCarlist.get(e.catalogVehicleId) ?? [];
    existing.push({ id: e.carlist.id, name: e.carlist.name });
    catalogToCarlist.set(e.catalogVehicleId, existing);
  }

  // Map back to vehicleId → carlists
  const map = new Map<string, Array<{ id: string; name: string }>>();
  for (const v of vehicles) {
    const carlists = catalogToCarlist.get(v.catalogVehicleId);
    if (carlists) {
      map.set(v.id, carlists);
    }
  }
  return map;
}

// ---------------------------------------------------------------------------
// Data row construction
// ---------------------------------------------------------------------------

type VehicleWithCatalog = {
  id: string;
  licensePlate: string;
  catalogVehicle: {
    marca: string;
    modello: string;
    isHybrid: boolean;
    engines: Array<{
      fuelType: string;
      co2GKm: number | null;
    }>;
  };
};

type FuelRecordRow = {
  vehicleId: string;
  date: Date;
  fuelType: string;
  quantityLiters: number;
  quantityKwh: number | null;
  odometerKm: number;
};

type KmReadingRow = {
  vehicleId: string;
  odometerKm: number;
  date: Date;
};

function buildDataRows(
  vehicles: VehicleWithCatalog[],
  fuelRecords: FuelRecordRow[],
  kmReadings: KmReadingRow[],
  emissionContexts: Map<string, EmissionContext[]>,
  carlistMappings: Map<string, Array<{ id: string; name: string }>>,
  dateRange: { startDate: Date; endDate: Date },
  granularity: PeriodGranularity
): VehicleDataRow[] {
  const rows: VehicleDataRow[] = [];

  // Group fuel records and km readings by vehicle
  const fuelByVehicle = groupBy(fuelRecords, (r) => r.vehicleId);
  const kmByVehicle = groupBy(kmReadings, (r) => r.vehicleId);

  // Generate period boundaries
  const periods = generatePeriods(dateRange, granularity);

  for (const vehicle of vehicles) {
    const vehicleFuelRecords = fuelByVehicle.get(vehicle.id) ?? [];
    const vehicleKmReadings = kmByVehicle.get(vehicle.id) ?? [];

    // Determine primary fuel type (hybrid-aware) and co2GKm
    const fuelType = getEffectiveFuelType(vehicle.catalogVehicle, vehicleFuelRecords);
    if (!fuelType) continue;

    const co2GKm = getCombinedCo2GKm(
      vehicle.catalogVehicle.engines,
      vehicle.catalogVehicle.isHybrid
    );

    const carlists = carlistMappings.get(vehicle.id) ?? [];
    const label = `${vehicle.catalogVehicle.marca} ${vehicle.catalogVehicle.modello} (${vehicle.licensePlate})`;

    // Get the emission contexts for this fuel type
    const contexts = emissionContexts.get(fuelType) ?? [];

    // For each period, compute per-vehicle data
    for (const period of periods) {
      const periodFuel = vehicleFuelRecords.filter(
        (r) => r.date >= period.start && r.date <= period.end
      );
      const periodKm = vehicleKmReadings.filter(
        (r) => r.date >= period.start && r.date <= period.end
      );

      // Merge odometer readings from fuel records and km readings
      const allOdometer = [
        ...periodFuel.map((r) => ({ km: r.odometerKm, date: r.date })),
        ...periodKm.map((r) => ({ km: r.odometerKm, date: r.date })),
      ].sort((a, b) => a.date.getTime() - b.date.getTime());

      let kmTravelled = 0;
      if (allOdometer.length >= 2) {
        kmTravelled =
          allOdometer[allOdometer.length - 1].km - allOdometer[0].km;
      }

      const fuelLitres = periodFuel.reduce(
        (sum, r) => sum + r.quantityLiters,
        0
      );

      const fuelKwh = periodFuel.reduce(
        (sum, r) => sum + (r.quantityKwh ?? 0),
        0
      );

      // Backward-compat emissionFactor: approximate kgCO2e/L
      const realFromContexts = computeRealEmissionsFromContexts(contexts, fuelLitres, fuelKwh);
      const emissionFactor = fuelLitres > 0
        ? realFromContexts / fuelLitres
        : 0;

      rows.push({
        vehicleId: vehicle.id,
        label,
        licensePlate: vehicle.licensePlate,
        fuelType,
        co2GKm,
        fuelLitres,
        fuelKwh,
        kmTravelled,
        emissionFactor,
        emissionContexts: contexts,
        carlistIds: carlists.map((c) => c.id),
        carlistNames: carlists.map((c) => c.name),
        periodKey: period.key,
        periodLabel: period.label,
      });
    }
  }

  return rows;
}

// ---------------------------------------------------------------------------
// Aggregation
// ---------------------------------------------------------------------------

function aggregate(
  rows: VehicleDataRow[],
  level: ReportParams["aggregationLevel"],
  fuelTypeLabels: Map<string, string>
): EmissionAggregation[] {
  const groups = new Map<
    string,
    { label: string; id: string; rows: VehicleDataRow[] }
  >();

  for (const row of rows) {
    const keys = getGroupKeys(row, level, fuelTypeLabels);
    for (const { id, label } of keys) {
      const existing = groups.get(id);
      if (existing) {
        existing.rows.push(row);
      } else {
        groups.set(id, { label, id, rows: [row] });
      }
    }
  }

  const result: EmissionAggregation[] = [];

  for (const [, group] of groups) {
    let totalTheoretical = 0;
    let totalReal = 0;
    let totalKm = 0;
    let totalFuel = 0;

    for (const row of group.rows) {
      totalTheoretical += calculateTheoreticalEmissions(
        row.co2GKm,
        row.kmTravelled
      );
      totalReal += computeRealEmissionsFromContexts(
        row.emissionContexts,
        row.fuelLitres,
        row.fuelKwh
      );
      totalKm += row.kmTravelled;
      totalFuel += row.fuelLitres;
    }

    totalTheoretical = round2(totalTheoretical);
    totalReal = round2(totalReal);

    const delta = calculateDelta(totalTheoretical, totalReal);

    result.push({
      label: group.label,
      id: group.id,
      theoreticalEmissions: totalTheoretical,
      realEmissions: totalReal,
      deltaAbsolute: delta.absolute,
      deltaPercentage: delta.percentage,
      totalKm: round2(totalKm),
      totalFuel: round2(totalFuel),
    });
  }

  // Sort by label
  result.sort((a, b) => a.label.localeCompare(b.label, "it"));

  return result;
}

function getGroupKeys(
  row: VehicleDataRow,
  level: ReportParams["aggregationLevel"],
  fuelTypeLabels: Map<string, string>
): Array<{ id: string; label: string }> {
  switch (level) {
    case "VEHICLE":
      return [{ id: row.vehicleId, label: row.label }];
    case "CARLIST":
      if (row.carlistIds.length === 0) {
        return [{ id: "__no_carlist__", label: "Nessuna carlist" }];
      }
      return row.carlistIds.map((id, i) => ({
        id,
        label: row.carlistNames[i],
      }));
    case "FUEL_TYPE":
      return [
        {
          id: row.fuelType,
          label:
            fuelTypeLabels.get(row.fuelType) ?? row.fuelType,
        },
      ];
    case "PERIOD":
      return [{ id: row.periodKey, label: row.periodLabel }];
    default:
      return [{ id: row.vehicleId, label: row.label }];
  }
}

// ---------------------------------------------------------------------------
// Time series
// ---------------------------------------------------------------------------

function buildTimeSeries(
  rows: VehicleDataRow[],
  _granularity: PeriodGranularity
): EmissionTimeSeries[] {
  // Group all rows by periodKey
  const groups = new Map<
    string,
    { label: string; rows: VehicleDataRow[] }
  >();

  for (const row of rows) {
    const existing = groups.get(row.periodKey);
    if (existing) {
      existing.rows.push(row);
    } else {
      groups.set(row.periodKey, { label: row.periodLabel, rows: [row] });
    }
  }

  const result: EmissionTimeSeries[] = [];

  // Sort by period key
  const sortedKeys = [...groups.keys()].sort();

  for (const key of sortedKeys) {
    const group = groups.get(key)!;
    let theoretical = 0;
    let real = 0;

    for (const row of group.rows) {
      theoretical += calculateTheoreticalEmissions(
        row.co2GKm,
        row.kmTravelled
      );
      real += computeRealEmissionsFromContexts(
        row.emissionContexts,
        row.fuelLitres,
        row.fuelKwh
      );
    }

    theoretical = round2(theoretical);
    real = round2(real);
    const delta = round2(real - theoretical);

    result.push({
      period: key,
      periodLabel: group.label,
      theoreticalEmissions: theoretical,
      realEmissions: real,
      delta,
    });
  }

  return result;
}

// ---------------------------------------------------------------------------
// Breakdown by fuel type
// ---------------------------------------------------------------------------

function buildBreakdown(rows: VehicleDataRow[], fuelTypeLabels: Map<string, string>): EmissionBreakdown[] {
  const groups = new Map<string, { label: string; totalReal: number }>();

  for (const row of rows) {
    const label =
      fuelTypeLabels.get(row.fuelType) ?? row.fuelType;
    const existing = groups.get(row.fuelType);
    const realEmissions = computeRealEmissionsFromContexts(
      row.emissionContexts,
      row.fuelLitres,
      row.fuelKwh
    );

    if (existing) {
      existing.totalReal += realEmissions;
    } else {
      groups.set(row.fuelType, { label, totalReal: realEmissions });
    }
  }

  const totalReal = [...groups.values()].reduce(
    (sum, g) => sum + g.totalReal,
    0
  );

  const result: EmissionBreakdown[] = [];

  for (const [fuelType, group] of groups) {
    result.push({
      category: group.label,
      categoryId: fuelType,
      value: round2(group.totalReal),
      percentage: totalReal === 0 ? 0 : round2((group.totalReal / totalReal) * 100),
    });
  }

  // Sort by value descending
  result.sort((a, b) => b.value - a.value);

  return result;
}

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

function computeMetadata(
  aggregations: EmissionAggregation[],
  vehicles: Array<{ id: string }>,
  dateRange: { startDate: Date; endDate: Date }
): ReportResult["metadata"] {
  let totalTheoretical = 0;
  let totalReal = 0;
  let totalKm = 0;
  let totalFuel = 0;

  for (const agg of aggregations) {
    totalTheoretical += agg.theoreticalEmissions;
    totalReal += agg.realEmissions;
    totalKm += agg.totalKm;
    totalFuel += agg.totalFuel;
  }

  totalTheoretical = round2(totalTheoretical);
  totalReal = round2(totalReal);
  const delta = calculateDelta(totalTheoretical, totalReal);

  return {
    totalTheoreticalEmissions: totalTheoretical,
    totalRealEmissions: totalReal,
    totalDeltaAbsolute: delta.absolute,
    totalDeltaPercentage: delta.percentage,
    totalKm: round2(totalKm),
    totalFuel: round2(totalFuel),
    vehicleCount: vehicles.length,
    dateRange,
    generatedAt: new Date(),
  };
}

// ---------------------------------------------------------------------------
// Period generation helpers
// ---------------------------------------------------------------------------

type Period = {
  key: string;
  label: string;
  start: Date;
  end: Date;
};

function generatePeriods(
  dateRange: { startDate: Date; endDate: Date },
  granularity: PeriodGranularity
): Period[] {
  const periods: Period[] = [];
  const start = dateRange.startDate;
  const end = dateRange.endDate;

  switch (granularity) {
    case "MONTHLY": {
      let current = new Date(start.getFullYear(), start.getMonth(), 1);
      while (current <= end) {
        const year = current.getFullYear();
        const month = current.getMonth();
        const periodStart = new Date(
          Math.max(current.getTime(), start.getTime())
        );
        const periodEnd = new Date(
          Math.min(
            new Date(year, month + 1, 0, 23, 59, 59, 999).getTime(),
            end.getTime()
          )
        );
        const monthStr = String(month + 1).padStart(2, "0");
        const monthNames = [
          "Gen",
          "Feb",
          "Mar",
          "Apr",
          "Mag",
          "Giu",
          "Lug",
          "Ago",
          "Set",
          "Ott",
          "Nov",
          "Dic",
        ];
        periods.push({
          key: `${year}-${monthStr}`,
          label: `${monthNames[month]} ${year}`,
          start: periodStart,
          end: periodEnd,
        });
        current = new Date(year, month + 1, 1);
      }
      break;
    }
    case "QUARTERLY": {
      let current = new Date(
        start.getFullYear(),
        Math.floor(start.getMonth() / 3) * 3,
        1
      );
      while (current <= end) {
        const year = current.getFullYear();
        const quarterStart = current.getMonth();
        const quarter = Math.floor(quarterStart / 3) + 1;
        const periodStart = new Date(
          Math.max(current.getTime(), start.getTime())
        );
        const periodEnd = new Date(
          Math.min(
            new Date(year, quarterStart + 3, 0, 23, 59, 59, 999).getTime(),
            end.getTime()
          )
        );
        periods.push({
          key: `${year}-Q${quarter}`,
          label: `T${quarter} ${year}`,
          start: periodStart,
          end: periodEnd,
        });
        current = new Date(year, quarterStart + 3, 1);
      }
      break;
    }
    case "YEARLY": {
      let currentYear = start.getFullYear();
      while (new Date(currentYear, 0, 1) <= end) {
        const periodStart = new Date(
          Math.max(new Date(currentYear, 0, 1).getTime(), start.getTime())
        );
        const periodEnd = new Date(
          Math.min(
            new Date(currentYear, 11, 31, 23, 59, 59, 999).getTime(),
            end.getTime()
          )
        );
        periods.push({
          key: `${currentYear}`,
          label: `${currentYear}`,
          start: periodStart,
          end: periodEnd,
        });
        currentYear++;
      }
      break;
    }
  }

  return periods;
}

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------

function groupBy<T>(items: T[], keyFn: (item: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const key = keyFn(item);
    const existing = map.get(key) ?? [];
    existing.push(item);
    map.set(key, existing);
  }
  return map;
}


function emptyResult(params: ReportParams): ReportResult {
  return {
    aggregations: [],
    timeSeries: [],
    breakdown: [],
    metadata: {
      totalTheoreticalEmissions: 0,
      totalRealEmissions: 0,
      totalDeltaAbsolute: 0,
      totalDeltaPercentage: 0,
      totalKm: 0,
      totalFuel: 0,
      vehicleCount: 0,
      dateRange: params.dateRange,
      generatedAt: new Date(),
    },
  };
}

// ---------------------------------------------------------------------------
// Drill-Down functions (Story 6.5)
// ---------------------------------------------------------------------------

/**
 * Fleet overview: aggregates emissions by carlist for the entire fleet.
 * Returns DrillDownResult with level FLEET, one item per carlist.
 */
export async function getFleetOverview(
  prisma: PrismaClientWithTenant,
  dateRange: { startDate: Date; endDate: Date }
): Promise<DrillDownResult> {
  const params: ReportParams = {
    dateRange,
    aggregationLevel: "CARLIST",
  };

  const result = await getAggregatedEmissions(prisma, params);
  const totalReal = result.metadata.totalRealEmissions;

  // Count vehicles per carlist
  const carlistAggs = result.aggregations;

  // Load carlist vehicle counts
  const carlists = await prisma.carlist.findMany({
    select: {
      id: true,
      name: true,
      _count: { select: { vehicles: true } },
    },
  });
  const carlistCountMap = new Map(
    carlists.map((c) => [c.id, c._count.vehicles])
  );

  const items: DrillDownItem[] = carlistAggs.map((agg) => ({
    id: agg.id,
    label: agg.label,
    theoreticalEmissions: agg.theoreticalEmissions,
    realEmissions: agg.realEmissions,
    delta: agg.deltaAbsolute,
    deltaPercentage: agg.deltaPercentage,
    totalKm: agg.totalKm,
    contributionPercentage:
      totalReal === 0 ? 0 : round2((agg.realEmissions / totalReal) * 100),
    childCount: carlistCountMap.get(agg.id) ?? 0,
  }));

  // Sort by realEmissions DESC
  items.sort((a, b) => b.realEmissions - a.realEmissions);

  return {
    level: "FLEET",
    parentLabel: "Flotta",
    items,
    totalEmissions: result.metadata.totalRealEmissions,
    totalTheoreticalEmissions: result.metadata.totalTheoreticalEmissions,
  };
}

/**
 * Carlist detail: aggregates emissions by vehicle within a carlist.
 * Returns DrillDownResult with level CARLIST.
 */
export async function getCarlistDetail(
  prisma: PrismaClientWithTenant,
  carlistId: string,
  dateRange: { startDate: Date; endDate: Date }
): Promise<DrillDownResult> {
  // Get carlist name
  const carlist = await prisma.carlist.findUnique({
    where: { id: carlistId },
    select: { name: true },
  });

  const params: ReportParams = {
    dateRange,
    aggregationLevel: "VEHICLE",
    carlistId,
  };

  const result = await getAggregatedEmissions(prisma, params);
  const totalReal = result.metadata.totalRealEmissions;

  const items: DrillDownItem[] = result.aggregations.map((agg) => ({
    id: agg.id,
    label: agg.label,
    theoreticalEmissions: agg.theoreticalEmissions,
    realEmissions: agg.realEmissions,
    delta: agg.deltaAbsolute,
    deltaPercentage: agg.deltaPercentage,
    totalKm: agg.totalKm,
    contributionPercentage:
      totalReal === 0 ? 0 : round2((agg.realEmissions / totalReal) * 100),
  }));

  // Sort by realEmissions DESC
  items.sort((a, b) => b.realEmissions - a.realEmissions);

  return {
    level: "CARLIST",
    parentLabel: carlist?.name ?? "Carlist",
    parentId: carlistId,
    items,
    totalEmissions: result.metadata.totalRealEmissions,
    totalTheoreticalEmissions: result.metadata.totalTheoreticalEmissions,
  };
}

/**
 * Vehicle detail: returns full emission detail for a single vehicle.
 */
export async function getVehicleDetail(
  prisma: PrismaClientWithTenant,
  vehicleId: string,
  dateRange: { startDate: Date; endDate: Date }
): Promise<VehicleEmissionDetail | null> {
  const vehicle = await prisma.tenantVehicle.findUnique({
    where: { id: vehicleId },
    include: {
      catalogVehicle: {
        include: { engines: true },
      },
    },
  });

  if (!vehicle) return null;

  const [fuelRecords, kmReadings, emissionContexts] = await Promise.all([
    loadFuelRecords(prisma, [vehicleId], dateRange),
    loadKmReadings(prisma, [vehicleId], dateRange),
    loadEmissionContexts(prisma, dateRange),
  ]);

  // Determine fuel type
  const fuelType = getEffectiveFuelType(vehicle.catalogVehicle, fuelRecords);
  const co2GKm = getCombinedCo2GKm(vehicle.catalogVehicle.engines, vehicle.catalogVehicle.isHybrid);

  // Get the emission contexts for this fuel type
  const contexts = fuelType ? (emissionContexts.get(fuelType) ?? []) : [];

  // Total fuel (litres and kWh) and km
  const totalFuel = round2(
    fuelRecords.reduce((sum, r) => sum + r.quantityLiters, 0)
  );
  const totalKwh = fuelRecords.reduce(
    (sum, r) => sum + (r.quantityKwh ?? 0),
    0
  );

  // Compute km from odometer readings across fuel + km records
  const allOdometer = [
    ...fuelRecords.map((r) => ({ km: r.odometerKm, date: r.date })),
    ...kmReadings.map((r) => ({ km: r.odometerKm, date: r.date })),
  ].sort((a, b) => a.date.getTime() - b.date.getTime());

  let totalKm = 0;
  if (allOdometer.length >= 2) {
    totalKm = allOdometer[allOdometer.length - 1].km - allOdometer[0].km;
  }

  const theoreticalEmissions = calculateTheoreticalEmissions(co2GKm, totalKm);
  const realEmissions = computeRealEmissionsFromContexts(contexts, totalFuel, totalKwh);
  const delta = calculateDelta(theoreticalEmissions, realEmissions);

  // Monthly series
  const periods = generatePeriods(dateRange, "MONTHLY");
  const monthlySeries = periods.map((period) => {
    const periodFuel = fuelRecords.filter(
      (r) => r.date >= period.start && r.date <= period.end
    );
    const periodKm = kmReadings.filter(
      (r) => r.date >= period.start && r.date <= period.end
    );

    const periodAllOdometer = [
      ...periodFuel.map((r) => ({ km: r.odometerKm, date: r.date })),
      ...periodKm.map((r) => ({ km: r.odometerKm, date: r.date })),
    ].sort((a, b) => a.date.getTime() - b.date.getTime());

    let periodKmTravelled = 0;
    if (periodAllOdometer.length >= 2) {
      periodKmTravelled =
        periodAllOdometer[periodAllOdometer.length - 1].km -
        periodAllOdometer[0].km;
    }

    const periodFuelLitres = periodFuel.reduce(
      (sum, r) => sum + r.quantityLiters,
      0
    );
    const periodFuelKwh = periodFuel.reduce(
      (sum, r) => sum + (r.quantityKwh ?? 0),
      0
    );

    return {
      period: period.key,
      periodLabel: period.label,
      theoretical: calculateTheoreticalEmissions(co2GKm, periodKmTravelled),
      real: computeRealEmissionsFromContexts(contexts, periodFuelLitres, periodFuelKwh),
    };
  });

  // Load full fuel records with amounts for the detail view
  const fullFuelRecords = await prisma.fuelRecord.findMany({
    where: {
      vehicleId,
      date: { gte: dateRange.startDate, lte: dateRange.endDate },
    },
    orderBy: { date: "asc" },
    select: {
      date: true,
      fuelType: true,
      quantityLiters: true,
      amountEur: true,
      odometerKm: true,
    },
  });

  // Full km readings with source
  const fullKmReadings = await prisma.kmReading.findMany({
    where: {
      vehicleId,
      date: { gte: dateRange.startDate, lte: dateRange.endDate },
    },
    orderBy: { date: "asc" },
    select: { date: true, odometerKm: true, source: true },
  });

  const makeModel = `${vehicle.catalogVehicle.marca} ${vehicle.catalogVehicle.modello}`;
  const imageUrl = vehicle.catalogVehicle.imageUrl ?? undefined;

  return {
    vehicleId: vehicle.id,
    plate: vehicle.licensePlate,
    makeModel,
    imageUrl,
    theoreticalEmissions,
    realEmissions,
    delta: delta.absolute,
    deltaPercentage: delta.percentage,
    totalKm: round2(totalKm),
    totalFuel,
    monthlySeries,
    fuelRecords: fullFuelRecords.map((r) => ({
      date: r.date,
      fuelType: r.fuelType,
      quantityLiters: r.quantityLiters,
      amount: r.amountEur,
      odometerKm: r.odometerKm,
    })),
    kmReadings: fullKmReadings.map((r) => ({
      date: r.date,
      odometerKm: r.odometerKm,
      source: r.source,
    })),
  };
}

/**
 * Loads target and calculates progress for a given scope.
 * Returns null if no target is configured.
 */
export async function getTargetProgressForDashboard(
  prisma: PrismaClientWithTenant,
  scope: TargetScope,
  scopeId?: string,
  dateRange?: { startDate: Date; endDate: Date }
): Promise<{
  target: {
    id: string;
    description: string | null;
    scope: string;
    period: string;
    targetValue: number;
    startDate: Date;
    endDate: Date;
  };
  progress: TargetProgress;
} | null> {
  // Find the most recent target for this scope
  const whereClause: Record<string, unknown> = { scope };
  if (scope === "Carlist" && scopeId) {
    whereClause.carlistId = scopeId;
  }

  const target = await prisma.emissionTarget.findFirst({
    where: whereClause,
    orderBy: { startDate: "desc" },
  });

  if (!target) return null;

  // Calculate current emissions for the target's period
  const effectiveDateRange = dateRange ?? {
    startDate: target.startDate,
    endDate: target.endDate,
  };

  const params: ReportParams = {
    dateRange: effectiveDateRange,
    aggregationLevel: "VEHICLE",
    carlistId: scope === "Carlist" && scopeId ? scopeId : undefined,
  };

  const result = await getAggregatedEmissions(prisma, params);
  const currentEmissions = result.metadata.totalRealEmissions;

  const progress = calculateTargetProgress(
    target.targetValue,
    currentEmissions,
    target.startDate,
    target.endDate,
    new Date(),
    target.period as TargetPeriod
  );

  return {
    target: {
      id: target.id,
      description: target.description,
      scope: target.scope,
      period: target.period,
      targetValue: target.targetValue,
      startDate: target.startDate,
      endDate: target.endDate,
    },
    progress,
  };
}
