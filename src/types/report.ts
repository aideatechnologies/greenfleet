// ---------------------------------------------------------------------------
// Report / Emission Aggregation types (Story 6.4)
// ---------------------------------------------------------------------------

import type { PerGasResult, EmissionScope } from "@/types/emission";

export type AggregationLevel = "FLEET" | "VEHICLE" | "CARLIST" | "FUEL_TYPE" | "PERIOD";
export type PeriodGranularity = "MONTHLY" | "QUARTERLY" | "YEARLY";

// ---------------------------------------------------------------------------
// Vehicle Filters (advanced filtering)
// ---------------------------------------------------------------------------

export type VehicleFilters = {
  licensePlates?: string[];
  marca?: string[];
  modello?: string;
  fuelType?: string[];
  carrozzeria?: string[];
  isHybrid?: boolean;
  cilindrataMin?: number;
  cilindrataMax?: number;
  potenzaKwMin?: number;
  potenzaKwMax?: number;
  potenzaCvMin?: number;
  potenzaCvMax?: number;
  co2GKmMin?: number;
  co2GKmMax?: number;
  prezzoListinoMin?: number;
  prezzoListinoMax?: number;
};

// ---------------------------------------------------------------------------
// Scope / Performance
// ---------------------------------------------------------------------------

export type ScopeBreakdown = {
  scope: EmissionScope;
  scopeLabel: string;
  emissions: number;
  perGas: PerGasResult;
};

export type PerformanceLevel = "good" | "neutral" | "poor";

// ---------------------------------------------------------------------------
// Report params
// ---------------------------------------------------------------------------

export type ReportParams = {
  dateRange: { startDate: Date; endDate: Date };
  aggregationLevel: AggregationLevel;
  periodGranularity?: PeriodGranularity;
  carlistId?: string;
  vehicleFilters?: VehicleFilters;
};

// ---------------------------------------------------------------------------
// Aggregation result
// ---------------------------------------------------------------------------

export type EmissionAggregation = {
  // --- Campi esistenti ---
  label: string;
  id: string;
  theoreticalEmissions: number;
  realEmissions: number;
  deltaAbsolute: number;
  deltaPercentage: number;
  totalKm: number;
  totalFuel: number;
  // --- NUOVI ---
  scopeBreakdowns: ScopeBreakdown[];
  perGas: PerGasResult;
  realCO2ePerKm: number;
  theoreticalCO2ePerKm: number;
  co2GKmWltp: number;
  co2GKmNedc: number;
  performanceLevel: PerformanceLevel;
  performanceDeviation: number;
  isHybrid: boolean;
  fuelType: string;
  fuelTypeLabel: string;
  totalFuelLitres: number;
  totalFuelKwh: number;
};

// ---------------------------------------------------------------------------
// Time series / Breakdown (unchanged)
// ---------------------------------------------------------------------------

export type EmissionTimeSeries = {
  period: string;
  periodLabel: string;
  theoreticalEmissions: number;
  realEmissions: number;
  delta: number;
};

export type EmissionBreakdown = {
  category: string;
  categoryId: string;
  value: number;
  percentage: number;
};

// ---------------------------------------------------------------------------
// Report result
// ---------------------------------------------------------------------------

export type ReportResult = {
  aggregations: EmissionAggregation[];
  timeSeries: EmissionTimeSeries[];
  breakdown: EmissionBreakdown[];
  metadata: {
    totalTheoreticalEmissions: number;
    totalRealEmissions: number;
    totalDeltaAbsolute: number;
    totalDeltaPercentage: number;
    totalKm: number;
    totalFuel: number;
    vehicleCount: number;
    dateRange: { startDate: Date; endDate: Date };
    generatedAt: Date;
    // --- NUOVI ---
    avgRealCO2ePerKm: number;
    avgTheoreticalCO2ePerKm: number;
    totalScope1: number;
    totalScope2: number;
    scope1Percentage: number;
    scope2Percentage: number;
    totalPerGas: PerGasResult;
  };
};

// ---------------------------------------------------------------------------
// Drill-Down types (Story 6.5)
// ---------------------------------------------------------------------------

export type DrillDownLevel = "FLEET" | "CARLIST" | "VEHICLE";

export type DrillDownItem = {
  id: string;
  label: string;
  subtitle?: string;
  theoreticalEmissions: number;
  realEmissions: number;
  delta: number;
  deltaPercentage: number;
  totalKm: number;
  contributionPercentage: number;
  childCount?: number;
};

export type DrillDownResult = {
  level: DrillDownLevel;
  parentLabel: string;
  parentId?: string;
  items: DrillDownItem[];
  totalEmissions: number;
  totalTheoreticalEmissions: number;
};

export type VehicleEmissionDetail = {
  vehicleId: string;
  plate: string;
  makeModel: string;
  imageUrl?: string;
  theoreticalEmissions: number;
  realEmissions: number;
  delta: number;
  deltaPercentage: number;
  totalKm: number;
  totalFuel: number;
  monthlySeries: Array<{
    period: string;
    periodLabel: string;
    theoretical: number;
    real: number;
  }>;
  fuelRecords: Array<{
    date: Date;
    fuelType: string;
    quantityLiters: number;
    amount: number;
    odometerKm: number;
  }>;
  kmReadings: Array<{ date: Date; odometerKm: number; source: string }>;
};

// ---------------------------------------------------------------------------
// Export types (Story 6.6)
// ---------------------------------------------------------------------------

export type ReportExportData = {
  tenantName: string;
  dateRange: { startDate: Date; endDate: Date };
  aggregationLevel: AggregationLevel;
  aggregations: EmissionAggregation[];
  vehicleDetails?: Array<{
    plate: string;
    make: string;
    model: string;
    fuelType: string;
    km: number;
    theoreticalEmissions: number;
    realEmissions: number;
    delta: number;
    deltaPercentage: number;
  }>;
  metadata: {
    totalTheoreticalEmissions: number;
    totalRealEmissions: number;
    totalDeltaAbsolute: number;
    totalDeltaPercentage: number;
    totalKm: number;
    totalFuel: number;
    vehicleCount: number;
    carlistCount: number;
    generatedAt: Date;
  };
  methodology: {
    technicalDataSource: string;
    theoreticalFormula: string;
    realFormula: string;
    emissionFactorSource: string;
    emissionFactors: Array<{ fuelType: string; value: number; unit: string }>;
    period: string;
    perimeter: string;
  };
};

export type CSVOptions = {
  separator: string;
  decimalSeparator: string;
  includeHeaders: boolean;
};

// ---------------------------------------------------------------------------
// Filter Preset
// ---------------------------------------------------------------------------

export type ReportFilterPreset = {
  id: string;
  name: string;
  filters: VehicleFilters & {
    carlistId?: string;
    aggregationLevel?: AggregationLevel;
    periodGranularity?: PeriodGranularity;
  };
};

// ---------------------------------------------------------------------------
// Filter Options (distinct values for selects)
// ---------------------------------------------------------------------------

export type FilterOptions = {
  targhe: string[];
  marche: string[];
  carrozzerie: string[];
  carburanti: string[];
};
