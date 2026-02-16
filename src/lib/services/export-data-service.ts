// ---------------------------------------------------------------------------
// Export Data Builder — Builds ReportExportData from DB (Story 6.6)
// ---------------------------------------------------------------------------
// Loads report aggregations, vehicle details, emission factors, and
// tenant info to assemble a fully typed ReportExportData for PDF/CSV export.
// ---------------------------------------------------------------------------

import type { PrismaClientWithTenant } from "@/lib/db/client";
import type {
  AggregationLevel,
  ReportExportData,
  ReportParams,
} from "@/types/report";
import { getFuelTypeLabels } from "@/lib/utils/fuel-type-label";
import { getAggregatedEmissions } from "@/lib/services/report-service";
import { getEffectiveFuelType, getCombinedCo2GKm } from "@/lib/utils/fuel-type";
import {
  calculateTheoreticalEmissions,
  calculateRealEmissions,
  calculateDelta,
  round2,
} from "@/lib/services/emission-calculator";
import { prisma } from "@/lib/db/client";

// ---------------------------------------------------------------------------
// Main builder
// ---------------------------------------------------------------------------

export async function buildExportData(
  tenantPrisma: PrismaClientWithTenant,
  params: {
    organizationId: string;
    startDate: Date;
    endDate: Date;
    aggregationLevel: AggregationLevel;
    includeVehicleDetail: boolean;
    includeMethodology: boolean;
    carlistId?: number;
  }
): Promise<ReportExportData> {
  const reportParams: ReportParams = {
    dateRange: { startDate: params.startDate, endDate: params.endDate },
    aggregationLevel: params.aggregationLevel,
    carlistId: params.carlistId,
  };

  // Run queries in parallel where possible
  const [reportResult, organization, carlistCount] = await Promise.all([
    getAggregatedEmissions(tenantPrisma, reportParams),
    prisma.organization.findUnique({
      where: { id: params.organizationId },
      select: { name: true },
    }),
    tenantPrisma.carlist.count(),
  ]);

  const tenantName = organization?.name ?? "Greenfleet";

  // Build vehicle details if requested
  let vehicleDetails: ReportExportData["vehicleDetails"];
  if (params.includeVehicleDetail) {
    vehicleDetails = await buildVehicleDetails(tenantPrisma, reportParams);
  }

  // Build methodology section
  const formatDate = (d: Date) =>
    `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;

  const periodStr = `${formatDate(params.startDate)} - ${formatDate(params.endDate)}`;
  const perimeterStr = params.carlistId
    ? "Carlist selezionata"
    : "Intera flotta";

  let methodology: ReportExportData["methodology"];
  if (params.includeMethodology) {
    const methodBase = await buildMethodology(
      tenantPrisma,
      params.startDate,
      params.endDate,
      params.carlistId
    );
    methodology = {
      ...methodBase,
      period: periodStr,
      perimeter: perimeterStr,
    };
  } else {
    methodology = {
      technicalDataSource: "",
      theoreticalFormula: "",
      realFormula: "",
      emissionFactorSource: "",
      emissionFactors: [],
      period: periodStr,
      perimeter: perimeterStr,
    };
  }

  return {
    tenantName,
    dateRange: { startDate: params.startDate, endDate: params.endDate },
    aggregationLevel: params.aggregationLevel,
    aggregations: reportResult.aggregations,
    vehicleDetails,
    metadata: {
      totalTheoreticalEmissions: reportResult.metadata.totalTheoreticalEmissions,
      totalRealEmissions: reportResult.metadata.totalRealEmissions,
      totalDeltaAbsolute: reportResult.metadata.totalDeltaAbsolute,
      totalDeltaPercentage: reportResult.metadata.totalDeltaPercentage,
      totalKm: reportResult.metadata.totalKm,
      totalFuel: reportResult.metadata.totalFuel,
      vehicleCount: reportResult.metadata.vehicleCount,
      carlistCount,
      generatedAt: new Date(),
    },
    methodology,
  };
}

// ---------------------------------------------------------------------------
// Vehicle detail builder
// ---------------------------------------------------------------------------

async function buildVehicleDetails(
  tenantPrisma: PrismaClientWithTenant,
  params: ReportParams
): Promise<ReportExportData["vehicleDetails"]> {
  const fuelTypeLabels = await getFuelTypeLabels();
  // Load vehicles, optionally filtered by carlist
  let vehicles;
  if (params.carlistId) {
    const carlistVehicles = await tenantPrisma.carlistVehicle.findMany({
      where: { carlistId: params.carlistId },
      select: { catalogVehicleId: true },
    });
    const catalogVehicleIds = carlistVehicles.map((cv) => cv.catalogVehicleId);
    if (catalogVehicleIds.length === 0) return [];

    vehicles = await tenantPrisma.tenantVehicle.findMany({
      where: { catalogVehicleId: { in: catalogVehicleIds } },
      include: {
        catalogVehicle: {
          include: { engines: true },
        },
      },
    });
  } else {
    vehicles = await tenantPrisma.tenantVehicle.findMany({
      where: { status: "ACTIVE" },
      include: {
        catalogVehicle: {
          include: { engines: true },
        },
      },
    });
  }

  if (vehicles.length === 0) return [];

  const vehicleIds = vehicles.map((v) => v.id);

  // Load fuel records and km readings in parallel
  const [fuelRecords, kmReadings, emissionFactors] = await Promise.all([
    tenantPrisma.fuelRecord.findMany({
      where: {
        vehicleId: { in: vehicleIds },
        date: { gte: params.dateRange.startDate, lte: params.dateRange.endDate },
      },
    }),
    tenantPrisma.kmReading.findMany({
      where: {
        vehicleId: { in: vehicleIds },
        date: { gte: params.dateRange.startDate, lte: params.dateRange.endDate },
      },
      select: { vehicleId: true, odometerKm: true, date: true },
    }),
    tenantPrisma.emissionFactor.findMany({
      orderBy: [{ fuelType: "asc" }, { effectiveDate: "desc" }],
    }),
  ]);

  // Build emission factor map
  const factorMap = new Map<
    string,
    Array<{ effectiveDate: Date; value: number }>
  >();
  for (const f of emissionFactors) {
    if (!f.fuelType) continue; // skip V2 records without legacy fuelType
    const existing = factorMap.get(f.fuelType) ?? [];
    existing.push({ effectiveDate: f.effectiveDate, value: f.value ?? 0 });
    factorMap.set(f.fuelType, existing);
  }

  function getEffectiveFactor(fuelType: string, refDate: Date): number {
    const factors = factorMap.get(fuelType);
    if (!factors || factors.length === 0) return 0;
    for (const f of factors) {
      if (f.effectiveDate <= refDate) return f.value;
    }
    return 0;
  }

  // Group by vehicle
  const fuelByVehicle = new Map<number, typeof fuelRecords>();
  for (const r of fuelRecords) {
    const arr = fuelByVehicle.get(r.vehicleId) ?? [];
    arr.push(r);
    fuelByVehicle.set(r.vehicleId, arr);
  }

  const kmByVehicle = new Map<number, typeof kmReadings>();
  for (const r of kmReadings) {
    const arr = kmByVehicle.get(r.vehicleId) ?? [];
    arr.push(r);
    kmByVehicle.set(r.vehicleId, arr);
  }

  const details: NonNullable<ReportExportData["vehicleDetails"]> = [];

  for (const vehicle of vehicles) {
    const vFuel = fuelByVehicle.get(vehicle.id) ?? [];
    const vKm = kmByVehicle.get(vehicle.id) ?? [];

    // Determine fuel type (hybrid-aware)
    const fuelType = getEffectiveFuelType(vehicle.catalogVehicle, vFuel) ?? "BENZINA";

    // Engine co2GKm (hybrid-aware)
    const co2GKm = getCombinedCo2GKm(
      vehicle.catalogVehicle.engines,
      vehicle.catalogVehicle.isHybrid
    );

    // Calculate km travelled
    const allOdometer = [
      ...vFuel.map((r) => ({ km: r.odometerKm, date: r.date })),
      ...vKm.map((r) => ({ km: r.odometerKm, date: r.date })),
    ].sort((a, b) => a.date.getTime() - b.date.getTime());

    let kmTravelled = 0;
    if (allOdometer.length >= 2) {
      kmTravelled = allOdometer[allOdometer.length - 1].km - allOdometer[0].km;
    }

    const fuelLitres = vFuel.reduce((sum, r) => sum + r.quantityLiters, 0);

    // Get emission factor at midpoint of period
    const midDate = new Date(
      (params.dateRange.startDate.getTime() + params.dateRange.endDate.getTime()) / 2
    );
    const emissionFactor = getEffectiveFactor(fuelType, midDate);

    const theoretical = calculateTheoreticalEmissions(co2GKm, kmTravelled);
    const real = calculateRealEmissions(fuelLitres, emissionFactor);
    const delta = calculateDelta(theoretical, real);

    details.push({
      plate: vehicle.licensePlate,
      make: vehicle.catalogVehicle.marca,
      model: vehicle.catalogVehicle.modello,
      fuelType: fuelTypeLabels.get(fuelType) ?? fuelType,
      km: round2(kmTravelled),
      theoreticalEmissions: theoretical,
      realEmissions: real,
      delta: delta.absolute,
      deltaPercentage: delta.percentage,
    });
  }

  // Sort by plate
  details.sort((a, b) => a.plate.localeCompare(b.plate, "it"));

  return details;
}

// ---------------------------------------------------------------------------
// Methodology builder
// ---------------------------------------------------------------------------

async function buildMethodology(
  tenantPrisma: PrismaClientWithTenant,
  startDate: Date,
  endDate: Date,
  _carlistId?: number
): Promise<Omit<ReportExportData["methodology"], "period" | "perimeter">> {
  const fuelTypeLabels = await getFuelTypeLabels();
  // Load unique emission factors used in the period
  const factors = await tenantPrisma.emissionFactor.findMany({
    where: {
      effectiveDate: { lte: endDate },
    },
    orderBy: [{ fuelType: "asc" }, { effectiveDate: "desc" }],
  });

  // Deduplicate: keep only the latest per fuel type
  const latestFactors = new Map<string, { value: number; source: string }>();
  for (const f of factors) {
    if (!f.fuelType) continue; // skip V2 records without legacy fuelType
    if (!latestFactors.has(f.fuelType)) {
      latestFactors.set(f.fuelType, { value: f.value ?? 0, source: f.source });
    }
  }

  const emissionFactors = Array.from(latestFactors.entries()).map(
    ([fuelType, data]) => ({
      fuelType: fuelTypeLabels.get(fuelType) ?? fuelType,
      value: data.value,
      unit: "kgCO2e/L",
    })
  );

  // Determine source from factors
  const sources = new Set(
    Array.from(latestFactors.values()).map((f) => f.source)
  );
  const emissionFactorSource =
    sources.size > 0 ? Array.from(sources).join(", ") : "ISPRA / DEFRA";

  return {
    technicalDataSource: "InfocarData - Dati tecnici veicoli omologati",
    theoreticalFormula: "Emissioni Teoriche (kgCO2e) = (gCO2e/km WLTP * km percorsi) / 1000",
    realFormula: "Emissioni Reali (kgCO2e) = Litri carburante * Fattore di emissione (kgCO2e/L)",
    emissionFactorSource,
    emissionFactors,
  };
}
