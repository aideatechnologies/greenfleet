"use client";

import { useState, useEffect, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DeltaBar } from "@/components/data-display/DeltaBar";
import { ProgressTarget } from "@/components/data-display/ProgressTarget";
import { formatEmission, formatKm } from "@/lib/utils/number";
import type { ReportResult } from "@/types/report";
import { EmissionReportFilters } from "./EmissionReportFilters";
import { EmissionTimeSeriesChart } from "./EmissionTimeSeriesChart";
import { EmissionBreakdownChart } from "./EmissionBreakdownChart";
import { EmissionAreaChart } from "./EmissionAreaChart";
import { EmissionAggregationTable } from "./EmissionAggregationTable";
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
  id: string;
  name: string;
};

interface EmissionDashboardProps {
  initialReport: ReportResult;
  carlists: CarlistOption[];
  defaultStartDate: Date;
  defaultEndDate: Date;
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
}: EmissionDashboardProps) {
  const [report, setReport] = useState<ReportResult>(initialReport);
  const [targetProgress, setTargetProgress] =
    useState<TargetProgressResult | null>(null);
  const [targetLoaded, setTargetLoaded] = useState(false);
  const [_isLoadingTarget, startTargetTransition] = useTransition();

  const { metadata } = report;

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
      {/* Filters + Export */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <EmissionReportFilters
          carlists={carlists}
          onReportGenerated={setReport}
          defaultStartDate={defaultStartDate}
          defaultEndDate={defaultEndDate}
        />
        <ExportButtons
          dateRange={{ startDate: defaultStartDate, endDate: defaultEndDate }}
          aggregationLevel="VEHICLE"
          disabled={report.aggregations.length === 0}
        />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Emissioni Teoriche"
          value={formatEmission(metadata.totalTheoreticalEmissions, true)}
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
    </div>
  );
}
