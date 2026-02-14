// ---------------------------------------------------------------------------
// Report / Emission Aggregation types (Story 6.4)
// ---------------------------------------------------------------------------

export type AggregationLevel = "VEHICLE" | "CARLIST" | "FUEL_TYPE" | "PERIOD";
export type PeriodGranularity = "MONTHLY" | "QUARTERLY" | "YEARLY";

export type ReportParams = {
  dateRange: { startDate: Date; endDate: Date };
  aggregationLevel: AggregationLevel;
  periodGranularity?: PeriodGranularity;
  carlistId?: string;
};

export type EmissionAggregation = {
  label: string;
  id: string;
  theoreticalEmissions: number;
  realEmissions: number;
  deltaAbsolute: number;
  deltaPercentage: number;
  totalKm: number;
  totalFuel: number;
};

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
