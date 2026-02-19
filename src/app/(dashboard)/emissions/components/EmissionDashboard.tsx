"use client";

import { useState, useCallback, useEffect, useTransition, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DeltaBar } from "@/components/data-display/DeltaBar";
import { ProgressTarget } from "@/components/data-display/ProgressTarget";
import { formatEmission, formatTheoreticalEmission, formatKm, formatCO2Intensity, formatPercentage } from "@/lib/utils/number";
import type { ReportResult, FilterOptions, ReportFilterPreset } from "@/types/report";
import { EmissionReportFilters } from "./EmissionReportFilters";
import { EmissionTimeSeriesChart } from "./EmissionTimeSeriesChart";
import { EmissionBreakdownChart } from "./EmissionBreakdownChart";
import { EmissionAreaChart } from "./EmissionAreaChart";
import { EmissionAggregationTable } from "./EmissionAggregationTable";
import { ScopeComparisonChart } from "./ScopeComparisonChart";
import { DrillDownNavigator } from "./DrillDownNavigator";
import { ExportButtons } from "./ExportButtons";
import {
  getTargetProgressAction,
  type TargetProgressResult,
} from "../actions/get-target-progress";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type CarlistOption = {
  id: number;
  name: string;
};

interface EmissionDashboardProps {
  initialReport: ReportResult;
  carlists: CarlistOption[];
  defaultStartDate: Date;
  defaultEndDate: Date;
  filterOptions: FilterOptions;
  initialPresets: ReportFilterPreset[];
}

// ---------------------------------------------------------------------------
// KPI Card
// ---------------------------------------------------------------------------

function KPICard({
  title,
  value,
  subtitle,
  children,
}: {
  title: string;
  value: string;
  subtitle?: string;
  children?: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tabular-nums">{value}</div>
        {subtitle && (
          <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
        )}
        {children && <div className="mt-2">{children}</div>}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function EmissionDashboard({
  initialReport,
  carlists,
  defaultStartDate,
  defaultEndDate,
  filterOptions,
  initialPresets,
}: EmissionDashboardProps) {
  const [report, setReport] = useState<ReportResult>(initialReport);
  const [presets, setPresets] = useState<ReportFilterPreset[]>(initialPresets);
  const [targetProgress, setTargetProgress] =
    useState<TargetProgressResult | null>(null);
  const [targetLoaded, setTargetLoaded] = useState(false);
  const [_isLoadingTarget, startTargetTransition] = useTransition();
  const resultsRef = useRef<HTMLDivElement>(null);

  const { metadata } = report;

  const handlePresetSaved = useCallback((preset: ReportFilterPreset) => {
    setPresets((prev) => [...prev, preset].sort((a, b) => a.name.localeCompare(b.name)));
  }, []);

  const handlePresetDeleted = useCallback((presetId: number) => {
    setPresets((prev) => prev.filter((p) => p.id !== presetId));
  }, []);

  // Derive date strings for drill-down and target progress
  const startDateISO = defaultStartDate.toISOString();
  const endDateISO = defaultEndDate.toISOString();

  // Load target progress on mount
  useEffect(() => {
    startTargetTransition(async () => {
      const result = await getTargetProgressAction(
        "Fleet",
        null,
        startDateISO,
        endDateISO
      );
      if (result.success && result.data) {
        setTargetProgress(result.data);
      }
      setTargetLoaded(true);
    });
  }, [startDateISO, endDateISO]);

  return (
    <div className="space-y-6">
      {/* Filters */}
      <EmissionReportFilters
        carlists={carlists}
        onReportGenerated={setReport}
        defaultStartDate={defaultStartDate}
        defaultEndDate={defaultEndDate}
        filterOptions={filterOptions}
        presets={presets}
        onPresetSaved={handlePresetSaved}
        onPresetDeleted={handlePresetDeleted}
        resultsRef={resultsRef}
      />

      {/* Results section */}
      <div ref={resultsRef} className="space-y-6">

      {/* Export bar */}
      <Card className="bg-muted/30">
        <CardContent className="flex items-center justify-between py-3">
          <p className="text-sm font-medium text-muted-foreground">
            Report generato: {metadata.vehicleCount} veicoli —{" "}
            {formatEmission(metadata.totalRealEmissions, true)} emissioni reali
          </p>
          <ExportButtons
            dateRange={{ startDate: defaultStartDate, endDate: defaultEndDate }}
            aggregationLevel="VEHICLE"
            disabled={report.aggregations.length === 0}
          />
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <KPICard
          title="Emissioni Teoriche"
          value={formatTheoreticalEmission(metadata.totalTheoreticalEmissions, true)}
          subtitle={`${metadata.vehicleCount} veicoli`}
        />
        <KPICard
          title="Emissioni Reali"
          value={formatEmission(metadata.totalRealEmissions, true)}
        />
        <KPICard title="Delta Emissioni" value="">
          <DeltaBar
            theoretical={metadata.totalTheoreticalEmissions}
            real={metadata.totalRealEmissions}
            variant="full"
          />
        </KPICard>
        <KPICard
          title="Km Totali"
          value={formatKm(metadata.totalKm)}
          subtitle={`${metadata.vehicleCount} veicoli nel periodo`}
        />
        <KPICard
          title="Media CO2e/km"
          value={formatCO2Intensity(metadata.avgRealCO2ePerKm)}
          subtitle={`Teorica: ${formatCO2Intensity(metadata.avgTheoreticalCO2ePerKm)}`}
        />
        <KPICard
          title="Totale Emissioni (S1+S2)"
          value={formatEmission(metadata.totalScope1 + metadata.totalScope2, true)}
          subtitle={`S1: ${formatPercentage(metadata.scope1Percentage)} — S2: ${formatPercentage(metadata.scope2Percentage)}`}
        />
      </div>

      {/* Target Progress (visible only if target exists) */}
      {targetLoaded && targetProgress && (
        <Card>
          <CardHeader>
            <CardTitle>Progresso Target Emissioni</CardTitle>
          </CardHeader>
          <CardContent>
            <ProgressTarget
              value={targetProgress.progress.currentValue}
              target={targetProgress.progress.targetValue}
              valueLabel={formatEmission(
                targetProgress.progress.currentValue,
                true
              )}
              targetLabel={`Target: ${formatEmission(
                targetProgress.progress.targetValue,
                true
              )}`}
              milestones={targetProgress.progress.milestones.map((m) => ({
                position:
                  targetProgress.progress.targetValue === 0
                    ? 0
                    : (m.expectedValue / targetProgress.progress.targetValue) *
                      100,
                label: m.label,
                reached: m.achieved,
              }))}
              variant="full"
            />
            {targetProgress.target.description && (
              <p className="mt-2 text-xs text-muted-foreground">
                {targetProgress.target.description}
              </p>
            )}
          </CardContent>
        </Card>
      )}
      {targetLoaded && !targetProgress && (
        <Card>
          <CardHeader>
            <CardTitle>Target Emissioni</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Nessun target emissioni configurato.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Charts — 2 columns on desktop */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <EmissionTimeSeriesChart data={report.timeSeries} />
        <EmissionBreakdownChart data={report.breakdown} />
      </div>

      {/* Scope 1 vs Scope 2 comparison + gas detail */}
      <ScopeComparisonChart
        scope1={metadata.totalScope1}
        scope2={metadata.totalScope2}
        scope1Percentage={metadata.scope1Percentage}
        scope2Percentage={metadata.scope2Percentage}
        aggregations={report.aggregations}
      />

      {/* Cumulative Area Chart — full width */}
      <EmissionAreaChart data={report.timeSeries} />

      {/* Aggregation Table */}
      <EmissionAggregationTable
        data={report.aggregations}
        metadata={report.metadata}
      />

      {/* Drill-Down Navigator */}
      <DrillDownNavigator
        startDate={startDateISO}
        endDate={endDateISO}
      />

      </div>{/* end resultsRef */}
    </div>
  );
}
