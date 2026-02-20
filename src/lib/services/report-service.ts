// ---------------------------------------------------------------------------
// Report Service — Emission aggregation, time series, and breakdown (Story 6.4)
// ---------------------------------------------------------------------------
// Uses tenant-scoped Prisma for vehicle/fuel/km data.
// V2: multi-gas, multi-scope emission calculation via emission-resolution-service
// and emission-calculator (calculateScopedEmissions).
// V3: extended with scope breakdowns, per-gas, WLTP/NEDC cycles, CO2e/km,
// performance indicators, and advanced vehicle filters.
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
  ScopeBreakdown,
  PerformanceLevel,
  VehicleFilters,
} from "@/types/report";
import {
  calculateTheoreticalEmissions,
  calculateScopedEmissions,
  calculateDelta,
  calculateTargetProgress,
  round2,
} from "@/lib/services/emission-calculator";
import { resolveAllEmissionContextsBulk } from "@/lib/services/emission-resolution-service";
import type { EmissionContext, PerGasResult } from "@/types/emission";
import { KYOTO_GASES, SCOPE_LABELS, type EmissionScope } from "@/types/emission";
import { getEffectiveFuelType, getCombinedCo2GKm } from "@/lib/utils/fuel-type";
import type { TargetProgress, TargetScope, TargetPeriod } from "@/types/emission-target";
import { getFuelTypeLabels } from "@/lib/utils/fuel-type-label";

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

type VehicleDataRow = {
  vehicleId: number;
  label: string;
  licensePlate: string;
  fuelType: string;
  fuelTypeLabel: string;
  co2GKm: number;
  fuelLitres: number;
  fuelKwh: number;
  kmTravelled: number;
  emissionFactor: number; // backward-compat: total kgCO2e / L approximation
  emissionContexts: EmissionContext[];
  carlistIds: number[];
  carlistNames: string[];
  periodKey: string;
  periodLabel: string;
  isHybrid: boolean;
  co2GKmWltp: number;
  co2GKmNedc: number;
};

// ---------------------------------------------------------------------------
// V2 emission helper
// ---------------------------------------------------------------------------

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
// V3 scope / per-gas helpers
// ---------------------------------------------------------------------------

function emptyPerGas(): PerGasResult {
  return { co2: 0, ch4: 0, n2o: 0, hfc: 0, pfc: 0, sf6: 0, nf3: 0 };
}

function addPerGas(a: PerGasResult, b: PerGasResult): PerGasResult {
  const result = emptyPerGas();
  for (const gas of KYOTO_GASES) {
    result[gas] = round2(a[gas] + b[gas]);
  }
  return result;
}

function computeScopeBreakdowns(
  contexts: EmissionContext[],
  fuelLitres: number,
  fuelKwh: number
): ScopeBreakdown[] {
  const breakdowns: ScopeBreakdown[] = [];
  for (const ctx of contexts) {
    const quantity = ctx.macroFuelType.scope === 1 ? fuelLitres : fuelKwh;
    const result = calculateScopedEmissions({
      quantity,
      gasFactors: ctx.gasFactors,
      gwpValues: ctx.gwpValues,
    });
    const scope = ctx.macroFuelType.scope as EmissionScope;
    breakdowns.push({
      scope,
      scopeLabel: SCOPE_LABELS[scope],
      emissions: result.totalCO2e,
      perGas: result.perGas,
    });
  }
  return breakdowns;
}

function mergeScopeBreakdowns(
  existing: ScopeBreakdown[],
  addition: ScopeBreakdown[]
): ScopeBreakdown[] {
  const map = new Map<EmissionScope, ScopeBreakdown>();
  for (const bd of existing) {
    map.set(bd.scope, { ...bd, perGas: { ...bd.perGas } });
  }
  for (const bd of addition) {
    const ex = map.get(bd.scope);
    if (ex) {
      ex.emissions = round2(ex.emissions + bd.emissions);
      ex.perGas = addPerGas(ex.perGas, bd.perGas);
    } else {
      map.set(bd.scope, { ...bd, perGas: { ...bd.perGas } });
    }
  }
  return [...map.values()].sort((a, b) => a.scope - b.scope);
}

function getPerformanceLevel(deviation: number): PerformanceLevel {
  if (deviation <= -10) return "good";
  if (deviation >= 10) return "poor";
  return "neutral";
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

  // 1. Load all tenant vehicles (optionally filtered by carlist and vehicle filters)
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
    granularity,
    fuelTypeLabels
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

type VehicleWithCatalog = {
  id: number;
  licensePlate: string;
  catalogVehicle: {
    marca: string;
    modello: string;
    isHybrid: boolean;
    prezzoListino: number | null;
    engines: Array<{
      fuelType: string;
      co2GKm: number | null;
      co2GKmWltp: number | null;
      co2GKmNedc: number | null;
      cilindrata: number | null;
      potenzaKw: number | null;
      potenzaCv: number | null;
    }>;
  };
};

async function loadVehicles(
  prisma: PrismaClientWithTenant,
  params: ReportParams
): Promise<VehicleWithCatalog[]> {
  const catalogInclude = {
    include: {
      engines: {
        select: {
          fuelType: true,
          co2GKm: true,
          co2GKmWltp: true,
          co2GKmNedc: true,
          cilindrata: true,
          potenzaKw: true,
          potenzaCv: true,
        },
      },
    },
  };

  // Build base where clause
  const baseWhere: Record<string, unknown> = {};
  if (!params.carlistId) {
    baseWhere.status = "ACTIVE";
  }

  // License plate filter (TenantVehicle level)
  const vf = params.vehicleFilters;
  if (vf?.licensePlates?.length) {
    baseWhere.licensePlate = { in: vf.licensePlates };
  }

  // Build catalog vehicle filter for advanced filters
  if (vf) {
    const catalogWhere: Record<string, unknown> = {};
    if (vf.marca?.length) catalogWhere.marca = { in: vf.marca };
    if (vf.modello) catalogWhere.modello = vf.modello;
    if (vf.carrozzeria?.length) catalogWhere.carrozzeria = { in: vf.carrozzeria };
    if (vf.isHybrid !== undefined) catalogWhere.isHybrid = vf.isHybrid;
    if (vf.prezzoListinoMin !== undefined || vf.prezzoListinoMax !== undefined) {
      const prezzoRange: Record<string, number> = {};
      if (vf.prezzoListinoMin !== undefined) prezzoRange.gte = vf.prezzoListinoMin;
      if (vf.prezzoListinoMax !== undefined) prezzoRange.lte = vf.prezzoListinoMax;
      catalogWhere.prezzoListino = prezzoRange;
    }

    // Engine-level filters via `some`
    const engineFilter: Record<string, unknown> = {};
    if (vf.fuelType?.length) engineFilter.fuelType = { in: vf.fuelType };
    if (vf.cilindrataMin !== undefined || vf.cilindrataMax !== undefined) {
      const range: Record<string, number> = {};
      if (vf.cilindrataMin !== undefined) range.gte = vf.cilindrataMin;
      if (vf.cilindrataMax !== undefined) range.lte = vf.cilindrataMax;
      engineFilter.cilindrata = range;
    }
    if (vf.potenzaKwMin !== undefined || vf.potenzaKwMax !== undefined) {
      const range: Record<string, number> = {};
      if (vf.potenzaKwMin !== undefined) range.gte = vf.potenzaKwMin;
      if (vf.potenzaKwMax !== undefined) range.lte = vf.potenzaKwMax;
      engineFilter.potenzaKw = range;
    }
    if (vf.potenzaCvMin !== undefined || vf.potenzaCvMax !== undefined) {
      const range: Record<string, number> = {};
      if (vf.potenzaCvMin !== undefined) range.gte = vf.potenzaCvMin;
      if (vf.potenzaCvMax !== undefined) range.lte = vf.potenzaCvMax;
      engineFilter.potenzaCv = range;
    }
    if (vf.co2GKmMin !== undefined || vf.co2GKmMax !== undefined) {
      const range: Record<string, number> = {};
      if (vf.co2GKmMin !== undefined) range.gte = vf.co2GKmMin;
      if (vf.co2GKmMax !== undefined) range.lte = vf.co2GKmMax;
      engineFilter.co2GKm = range;
    }

    if (Object.keys(engineFilter).length > 0) {
      catalogWhere.engines = { some: engineFilter };
    }

    if (Object.keys(catalogWhere).length > 0) {
      baseWhere.catalogVehicle = catalogWhere;
    }
  }

  // If carlistId is specified, only load vehicles in that carlist
  if (params.carlistId) {
    const carlistVehicles = await prisma.carlistVehicle.findMany({
      where: { carlistId: params.carlistId },
      select: { catalogVehicleId: true },
    });
    const catalogVehicleIds = carlistVehicles.map((cv) => cv.catalogVehicleId);
    if (catalogVehicleIds.length === 0) return [];

    return prisma.tenantVehicle.findMany({
      where: {
        catalogVehicleId: { in: catalogVehicleIds },
        ...baseWhere,
      },
      include: { catalogVehicle: catalogInclude },
    }) as unknown as VehicleWithCatalog[];
  }

  return prisma.tenantVehicle.findMany({
    where: baseWhere,
    include: { catalogVehicle: catalogInclude },
  }) as unknown as VehicleWithCatalog[];
}

async function loadFuelRecords(
  prisma: PrismaClientWithTenant,
  vehicleIds: number[],
  dateRange: { startDate: Date; endDate: Date }
): Promise<FuelRecordRow[]> {
  const rows = await prisma.fuelRecord.findMany({
    where: {
      vehicleId: { in: vehicleIds },
      date: { gte: dateRange.startDate, lte: dateRange.endDate },
    },
    orderBy: { date: "asc" },
  });
  return rows as unknown as FuelRecordRow[];
}

async function loadKmReadings(
  prisma: PrismaClientWithTenant,
  vehicleIds: number[],
  dateRange: { startDate: Date; endDate: Date }
): Promise<KmReadingRow[]> {
  const rows = await prisma.kmReading.findMany({
    where: {
      vehicleId: { in: vehicleIds },
      date: { gte: dateRange.startDate, lte: dateRange.endDate },
    },
    orderBy: { date: "asc" },
    select: { vehicleId: true, odometerKm: true, date: true },
  });
  return rows as unknown as KmReadingRow[];
}

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
  vehicleIds: number[]
) {
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

  const catalogToCarlist = new Map<
    number,
    Array<{ id: number; name: string }>
  >();
  for (const entry of entries) {
    const e = entry as unknown as {
      catalogVehicleId: number;
      carlist: { id: number; name: string };
    };
    const existing = catalogToCarlist.get(e.catalogVehicleId) ?? [];
    existing.push({ id: e.carlist.id, name: e.carlist.name });
    catalogToCarlist.set(e.catalogVehicleId, existing);
  }

  const map = new Map<number, Array<{ id: number; name: string }>>();
  for (const v of vehicles) {
    const carlists = catalogToCarlist.get(Number(v.catalogVehicleId));
    if (carlists) {
      map.set(Number(v.id), carlists);
    }
  }
  return map;
}

// ---------------------------------------------------------------------------
// Data row construction
// ---------------------------------------------------------------------------

type FuelRecordRow = {
  vehicleId: number;
  date: Date;
  fuelType: string;
  quantityLiters: number;
  quantityKwh: number | null;
  odometerKm: number;
};

type KmReadingRow = {
  vehicleId: number;
  odometerKm: number;
  date: Date;
};

function buildDataRows(
  vehicles: VehicleWithCatalog[],
  fuelRecords: FuelRecordRow[],
  kmReadings: KmReadingRow[],
  emissionContexts: Map<string, EmissionContext[]>,
  carlistMappings: Map<number, Array<{ id: number; name: string }>>,
  dateRange: { startDate: Date; endDate: Date },
  granularity: PeriodGranularity,
  fuelTypeLabels: Map<string, string>
): VehicleDataRow[] {
  const rows: VehicleDataRow[] = [];
  const fuelByVehicle = groupBy(fuelRecords, (r) => r.vehicleId);
  const kmByVehicle = groupBy(kmReadings, (r) => r.vehicleId);
  const periods = generatePeriods(dateRange, granularity);

  for (const vehicle of vehicles) {
    const vehicleFuelRecords = fuelByVehicle.get(vehicle.id) ?? [];
    const vehicleKmReadings = kmByVehicle.get(vehicle.id) ?? [];

    const fuelType = getEffectiveFuelType(vehicle.catalogVehicle, vehicleFuelRecords);
    if (!fuelType) continue;

    const co2GKm = getCombinedCo2GKm(
      vehicle.catalogVehicle.engines,
      vehicle.catalogVehicle.isHybrid
    );

    // WLTP / NEDC values — weighted average across non-electric engines
    const thermalEngines = vehicle.catalogVehicle.engines.filter(
      (e) => e.fuelType !== "ELETTRICO"
    );
    const co2GKmWltp = thermalEngines.length > 0
      ? thermalEngines.reduce((sum, e) => sum + (e.co2GKmWltp ?? e.co2GKm ?? 0), 0) / thermalEngines.length
      : 0;
    const co2GKmNedc = thermalEngines.length > 0
      ? thermalEngines.reduce((sum, e) => sum + (e.co2GKmNedc ?? 0), 0) / thermalEngines.length
      : 0;

    const carlists = carlistMappings.get(vehicle.id) ?? [];
    const label = `${vehicle.catalogVehicle.marca} ${vehicle.catalogVehicle.modello} (${vehicle.licensePlate})`;
    const contexts = emissionContexts.get(fuelType) ?? [];
    const fuelLabel = fuelTypeLabels.get(fuelType) ?? fuelType;

    for (const period of periods) {
      const periodFuel = vehicleFuelRecords.filter(
        (r) => r.date >= period.start && r.date <= period.end
      );
      const periodKm = vehicleKmReadings.filter(
        (r) => r.date >= period.start && r.date <= period.end
      );

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

      const realFromContexts = computeRealEmissionsFromContexts(contexts, fuelLitres, fuelKwh);
      const emissionFactor = fuelLitres > 0
        ? realFromContexts / fuelLitres
        : 0;

      rows.push({
        vehicleId: vehicle.id,
        label,
        licensePlate: vehicle.licensePlate,
        fuelType,
        fuelTypeLabel: fuelLabel,
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
        isHybrid: vehicle.catalogVehicle.isHybrid,
        co2GKmWltp: round2(co2GKmWltp),
        co2GKmNedc: round2(co2GKmNedc),
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
    string | number,
    { label: string; id: string | number; rows: VehicleDataRow[] }
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
    let totalFuelLitres = 0;
    let totalFuelKwh = 0;
    let scopeBreakdowns: ScopeBreakdown[] = [];
    let perGas = emptyPerGas();
    let weightedWltp = 0;
    let weightedNedc = 0;
    let wltpCount = 0;
    let nedcCount = 0;
    let hasHybrid = false;
    const fuelTypes = new Set<string>();
    let primaryFuelType = "";
    let primaryFuelLabel = "";

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
      totalFuelLitres += row.fuelLitres;
      totalFuelKwh += row.fuelKwh;

      // Scope breakdowns
      const rowScopes = computeScopeBreakdowns(
        row.emissionContexts,
        row.fuelLitres,
        row.fuelKwh
      );
      scopeBreakdowns = mergeScopeBreakdowns(scopeBreakdowns, rowScopes);

      // Per-gas totals
      for (const s of rowScopes) {
        perGas = addPerGas(perGas, s.perGas);
      }

      // WLTP / NEDC weighted average
      if (row.co2GKmWltp > 0) {
        weightedWltp += row.co2GKmWltp;
        wltpCount++;
      }
      if (row.co2GKmNedc > 0) {
        weightedNedc += row.co2GKmNedc;
        nedcCount++;
      }

      if (row.isHybrid) hasHybrid = true;
      fuelTypes.add(row.fuelType);
      primaryFuelType = row.fuelType;
      primaryFuelLabel = row.fuelTypeLabel;
    }

    totalTheoretical = round2(totalTheoretical);
    totalReal = round2(totalReal);

    const delta = calculateDelta(totalTheoretical, totalReal);

    // CO2e per km
    const realCO2ePerKm = totalKm > 0 ? round2((totalReal / totalKm) * 1000) : 0;
    const theoreticalCO2ePerKm = totalKm > 0 ? round2((totalTheoretical / totalKm) * 1000) : 0;

    const co2GKmWltp = wltpCount > 0 ? round2(weightedWltp / wltpCount) : 0;
    const co2GKmNedc = nedcCount > 0 ? round2(weightedNedc / nedcCount) : 0;

    // Fuel type label for multi-vehicle groups
    const fuelType = fuelTypes.size === 1 ? primaryFuelType : "MISTO";
    const fuelTypeLabel = fuelTypes.size === 1 ? primaryFuelLabel : "Misto";

    result.push({
      label: group.label,
      id: group.id,
      theoreticalEmissions: totalTheoretical,
      realEmissions: totalReal,
      deltaAbsolute: delta.absolute,
      deltaPercentage: delta.percentage,
      totalKm: round2(totalKm),
      totalFuel: round2(totalFuelLitres + totalFuelKwh),
      scopeBreakdowns,
      perGas,
      realCO2ePerKm,
      theoreticalCO2ePerKm,
      co2GKmWltp,
      co2GKmNedc,
      performanceLevel: "neutral", // placeholder, assigned below
      performanceDeviation: 0,     // placeholder, assigned below
      isHybrid: hasHybrid,
      fuelType,
      fuelTypeLabel,
      totalFuelLitres: round2(totalFuelLitres),
      totalFuelKwh: round2(totalFuelKwh),
    });
  }

  // Compute fleet average CO2e/km and assign performance levels
  const totalKmAll = result.reduce((s, a) => s + a.totalKm, 0);
  const totalRealAll = result.reduce((s, a) => s + a.realEmissions, 0);
  const avgFleetCO2ePerKm = totalKmAll > 0 ? (totalRealAll / totalKmAll) * 1000 : 0;

  for (const agg of result) {
    if (avgFleetCO2ePerKm > 0 && agg.realCO2ePerKm > 0) {
      agg.performanceDeviation = round2(
        ((agg.realCO2ePerKm - avgFleetCO2ePerKm) / avgFleetCO2ePerKm) * 100
      );
    } else {
      agg.performanceDeviation = 0;
    }
    agg.performanceLevel = getPerformanceLevel(agg.performanceDeviation);
  }

  // Sort by label
  result.sort((a, b) => a.label.localeCompare(b.label, "it"));

  return result;
}

function getGroupKeys(
  row: VehicleDataRow,
  level: ReportParams["aggregationLevel"],
  fuelTypeLabels: Map<string, string>
): Array<{ id: string | number; label: string }> {
  switch (level) {
    case "FLEET":
      return [{ id: "__fleet__", label: "Totale Parco" }];
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

  result.sort((a, b) => b.value - a.value);

  return result;
}

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

function computeMetadata(
  aggregations: EmissionAggregation[],
  vehicles: Array<{ id: number }>,
  dateRange: { startDate: Date; endDate: Date }
): ReportResult["metadata"] {
  let totalTheoretical = 0;
  let totalReal = 0;
  let totalKm = 0;
  let totalFuel = 0;
  let totalScope1 = 0;
  let totalScope2 = 0;
  const totalPerGas = emptyPerGas();

  for (const agg of aggregations) {
    totalTheoretical += agg.theoreticalEmissions;
    totalReal += agg.realEmissions;
    totalKm += agg.totalKm;
    totalFuel += agg.totalFuel;

    // Scope totals
    for (const sb of agg.scopeBreakdowns) {
      if (sb.scope === 1) totalScope1 += sb.emissions;
      if (sb.scope === 2) totalScope2 += sb.emissions;
    }

    // Per-gas totals
    for (const gas of KYOTO_GASES) {
      totalPerGas[gas] = round2(totalPerGas[gas] + agg.perGas[gas]);
    }
  }

  totalTheoretical = round2(totalTheoretical);
  totalReal = round2(totalReal);
  totalScope1 = round2(totalScope1);
  totalScope2 = round2(totalScope2);
  const delta = calculateDelta(totalTheoretical, totalReal);

  const totalEmissions = totalScope1 + totalScope2;
  const avgRealCO2ePerKm = totalKm > 0 ? round2((totalReal / totalKm) * 1000) : 0;
  const avgTheoreticalCO2ePerKm = totalKm > 0 ? round2((totalTheoretical / totalKm) * 1000) : 0;

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
    avgRealCO2ePerKm,
    avgTheoreticalCO2ePerKm,
    totalScope1,
    totalScope2,
    scope1Percentage: totalEmissions > 0 ? round2((totalScope1 / totalEmissions) * 100) : 0,
    scope2Percentage: totalEmissions > 0 ? round2((totalScope2 / totalEmissions) * 100) : 0,
    totalPerGas,
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

function groupBy<T, K = string>(items: T[], keyFn: (item: T) => K): Map<K, T[]> {
  const map = new Map<K, T[]>();
  for (const item of items) {
    const key = keyFn(item);
    const existing = map.get(key) ?? [];
    existing.push(item);
    map.set(key, existing);
  }
  return map;
}


function emptyResult(params: ReportParams): ReportResult {
  const emptyGas = emptyPerGas();
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
      avgRealCO2ePerKm: 0,
      avgTheoreticalCO2ePerKm: 0,
      totalScope1: 0,
      totalScope2: 0,
      scope1Percentage: 0,
      scope2Percentage: 0,
      totalPerGas: emptyGas,
    },
  };
}

// ---------------------------------------------------------------------------
// Drill-Down functions (Story 6.5)
// ---------------------------------------------------------------------------

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

  const carlistAggs = result.aggregations;

  const carlists = await prisma.carlist.findMany({
    select: {
      id: true,
      name: true,
      _count: { select: { vehicles: true } },
    },
  });
  const carlistCountMap = new Map(
    carlists.map((c) => [Number(c.id), c._count.vehicles])
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
    childCount: carlistCountMap.get(agg.id as number) ?? 0,
  }));

  items.sort((a, b) => b.realEmissions - a.realEmissions);

  return {
    level: "FLEET",
    parentLabel: "Flotta",
    items,
    totalEmissions: result.metadata.totalRealEmissions,
    totalTheoreticalEmissions: result.metadata.totalTheoreticalEmissions,
  };
}

export async function getCarlistDetail(
  prisma: PrismaClientWithTenant,
  carlistId: number,
  dateRange: { startDate: Date; endDate: Date }
): Promise<DrillDownResult> {
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

export async function getVehicleDetail(
  prisma: PrismaClientWithTenant,
  vehicleId: number,
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

  const fuelType = getEffectiveFuelType(vehicle.catalogVehicle, fuelRecords);
  const co2GKm = getCombinedCo2GKm(vehicle.catalogVehicle.engines, vehicle.catalogVehicle.isHybrid);

  const contexts = fuelType ? (emissionContexts.get(fuelType) ?? []) : [];

  const totalFuel = round2(
    fuelRecords.reduce((sum, r) => sum + r.quantityLiters, 0)
  );
  const totalKwh = fuelRecords.reduce(
    (sum, r) => sum + (r.quantityKwh ?? 0),
    0
  );

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
    vehicleId: Number(vehicle.id),
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
      quantityLiters: r.quantityLiters ?? 0,
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

export async function getTargetProgressForDashboard(
  prisma: PrismaClientWithTenant,
  scope: TargetScope,
  scopeId?: number,
  dateRange?: { startDate: Date; endDate: Date }
): Promise<{
  target: {
    id: number;
    description: string | null;
    scope: string;
    period: string;
    targetValue: number;
    startDate: Date;
    endDate: Date;
  };
  progress: TargetProgress;
} | null> {
  const whereClause: Record<string, unknown> = { scope };
  if (scope === "Carlist" && scopeId) {
    whereClause.carlistId = scopeId;
  }

  const target = await prisma.emissionTarget.findFirst({
    where: whereClause,
    orderBy: { startDate: "desc" },
  });

  if (!target) return null;

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
      id: Number(target.id),
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
