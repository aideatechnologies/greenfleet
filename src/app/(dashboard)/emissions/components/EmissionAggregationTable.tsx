"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/data-display/StatusBadge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  formatEmission,
  formatKm,
  formatFuel,
  formatDeltaPercentage,
  formatCO2Intensity,
  formatPercentage,
} from "@/lib/utils/number";
import { cn } from "@/lib/utils";
import { exportToCsv, type CsvColumn } from "@/lib/utils/csv-export";
import { KYOTO_GAS_LABELS, type KyotoGas, KYOTO_GASES } from "@/types/emission";
import type { EmissionAggregation, ReportResult, PerformanceLevel } from "@/types/report";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PERFORMANCE_CONFIG: Record<
  PerformanceLevel,
  {
    symbol: string;
    variant: "success" | "warning" | "destructive";
    label: string;
    rowClass: string;
    stickyClass: string;
  }
> = {
  good: {
    symbol: "\u2193",
    variant: "success",
    label: "Sotto la media",
    rowClass: "bg-emerald-50/60 dark:bg-emerald-950/20 border-l-2 border-l-emerald-500",
    stickyClass: "bg-emerald-50/80 dark:bg-emerald-950/30",
  },
  neutral: {
    symbol: "\u2248",
    variant: "warning",
    label: "Nella media",
    rowClass: "",
    stickyClass: "bg-background",
  },
  poor: {
    symbol: "\u2191",
    variant: "destructive",
    label: "Sopra la media",
    rowClass: "bg-red-50/60 dark:bg-red-950/20 border-l-2 border-l-red-500",
    stickyClass: "bg-red-50/80 dark:bg-red-950/30",
  },
};

// ---------------------------------------------------------------------------
// CSV column definitions
// ---------------------------------------------------------------------------

const CSV_COLUMNS: CsvColumn<EmissionAggregation>[] = [
  { header: "Gruppo", accessor: (r) => r.label },
  { header: "Alimentazione", accessor: (r) => r.fuelTypeLabel },
  { header: "Emissioni Teoriche (kgCO2e)", accessor: (r) => r.theoreticalEmissions, format: "decimal2" },
  { header: "Emissioni Reali (kgCO2e)", accessor: (r) => r.realEmissions, format: "decimal2" },
  { header: "Delta (kgCO2e)", accessor: (r) => r.deltaAbsolute, format: "decimal2" },
  { header: "Delta %", accessor: (r) => r.deltaPercentage, format: "decimal2" },
  { header: "gCO2e/km Reale", accessor: (r) => r.realCO2ePerKm, format: "decimal2" },
  { header: "WLTP gCO2/km", accessor: (r) => r.co2GKmWltp, format: "decimal2" },
  { header: "NEDC gCO2/km", accessor: (r) => r.co2GKmNedc, format: "decimal2" },
  {
    header: "Scope 1 (kgCO2e)",
    accessor: (r) => r.scopeBreakdowns.find((s) => s.scope === 1)?.emissions ?? 0,
    format: "decimal2",
  },
  {
    header: "Scope 2 (kgCO2e)",
    accessor: (r) => r.scopeBreakdowns.find((s) => s.scope === 2)?.emissions ?? 0,
    format: "decimal2",
  },
  { header: "CO2 (kgCO2e)", accessor: (r) => r.perGas.co2, format: "decimal2" },
  { header: "CH4 (kgCO2e)", accessor: (r) => r.perGas.ch4, format: "decimal2" },
  { header: "N2O (kgCO2e)", accessor: (r) => r.perGas.n2o, format: "decimal2" },
  { header: "HFC (kgCO2e)", accessor: (r) => r.perGas.hfc, format: "decimal2" },
  { header: "PFC (kgCO2e)", accessor: (r) => r.perGas.pfc, format: "decimal2" },
  { header: "SF6 (kgCO2e)", accessor: (r) => r.perGas.sf6, format: "decimal2" },
  { header: "NF3 (kgCO2e)", accessor: (r) => r.perGas.nf3, format: "decimal2" },
  { header: "Performance", accessor: (r) => r.performanceLevel },
  { header: "Deviazione %", accessor: (r) => r.performanceDeviation, format: "decimal2" },
  { header: "Km", accessor: (r) => r.totalKm, format: "decimal2" },
  { header: "Carburante L", accessor: (r) => r.totalFuelLitres, format: "decimal2" },
  { header: "Carburante kWh", accessor: (r) => r.totalFuelKwh, format: "decimal2" },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface EmissionAggregationTableProps {
  data: EmissionAggregation[];
  metadata: ReportResult["metadata"];
}

export function EmissionAggregationTable({
  data,
  metadata,
}: EmissionAggregationTableProps) {
  const handleExportCsv = () => {
    exportToCsv("emissioni-aggregazioni", CSV_COLUMNS, data);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Dettaglio Aggregazioni</CardTitle>
            <CardDescription>
          {data.length} {data.length === 1 ? "gruppo" : "gruppi"} nel periodo
          selezionato — {KYOTO_GASES.length + 15} colonne, scroll orizzontale
            </CardDescription>
          </div>
          {data.length > 0 && (
            <Button variant="outline" size="sm" onClick={handleExportCsv}>
              <Download className="mr-1 size-3.5" />
              Esporta CSV
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {data.length > 0 && (
          <div className="mb-3 flex items-center gap-4 text-xs text-muted-foreground">
            <span className="font-medium">Legenda:</span>
            <span className="flex items-center gap-1">
              <span className="inline-block size-3 rounded-sm border border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30" />
              Sotto la media (buono)
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block size-3 rounded-sm border border-red-500 bg-red-50 dark:bg-red-950/30" />
              Sopra la media (critico)
            </span>
          </div>
        )}
        <div className="overflow-x-auto rounded-md border">
          <Table className="min-w-[2200px]">
            <TableHeader>
              {/* Row 1: Group headers */}
              <TableRow className="border-b-2">
                <TableHead
                  className="sticky left-0 z-20 bg-muted border-r text-center font-bold shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)]"
                >
                  {/* empty — aligns with sticky "Gruppo" below */}
                </TableHead>
                <TableHead className="text-center font-bold">
                  {/* Aliment. — standalone */}
                </TableHead>
                <TableHead colSpan={4} className="text-center font-bold">
                  Emissioni
                </TableHead>
                <TableHead colSpan={3} className="text-center font-bold">
                  Intensita
                </TableHead>
                <TableHead colSpan={2} className="text-center font-bold">
                  Scope
                </TableHead>
                <TableHead colSpan={7} className="text-center font-bold">
                  Gas Kyoto
                </TableHead>
                <TableHead colSpan={2} className="text-center font-bold">
                  Performance
                </TableHead>
                <TableHead colSpan={3} className="text-center font-bold">
                  Operativo
                </TableHead>
              </TableRow>
              {/* Row 2: Column headers */}
              <TableRow>
                <TableHead className="sticky left-0 z-20 min-w-[200px] bg-muted border-r shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)]">
                  Gruppo
                </TableHead>
                <TableHead className="min-w-[100px]">Aliment.</TableHead>
                {/* Emissioni */}
                <TableHead className="min-w-[120px] text-right">Teoriche</TableHead>
                <TableHead className="min-w-[120px] text-right">Reali</TableHead>
                <TableHead className="min-w-[110px] text-right">Delta</TableHead>
                <TableHead className="min-w-[80px] text-right">Delta%</TableHead>
                {/* Intensita */}
                <TableHead className="min-w-[110px] text-right">gCO2e/km Reale</TableHead>
                <TableHead className="min-w-[100px] text-right">WLTP</TableHead>
                <TableHead className="min-w-[100px] text-right">NEDC</TableHead>
                {/* Scope */}
                <TableHead className="min-w-[110px] text-right">Scope 1</TableHead>
                <TableHead className="min-w-[110px] text-right">Scope 2</TableHead>
                {/* Gas Kyoto */}
                {KYOTO_GASES.map((gas) => (
                  <TableHead key={gas} className="min-w-[90px] text-right">
                    {KYOTO_GAS_LABELS[gas]}
                  </TableHead>
                ))}
                {/* Performance */}
                <TableHead className="min-w-[80px] text-center">Livello</TableHead>
                <TableHead className="min-w-[80px] text-right">Dev.%</TableHead>
                {/* Operativo */}
                <TableHead className="min-w-[100px] text-right">Km</TableHead>
                <TableHead className="min-w-[90px] text-right">Carb. L</TableHead>
                <TableHead className="min-w-[90px] text-right">Carb. kWh</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={23}
                    className="h-24 text-center text-muted-foreground"
                  >
                    Nessun dato disponibile.
                  </TableCell>
                </TableRow>
              ) : (
                data.map((row) => (
                  <AggregationRow key={row.id} row={row} />
                ))
              )}
            </TableBody>
            {data.length > 0 && (
              <TableFooter>
                <TableRow className="font-semibold">
                  <TableCell className="sticky left-0 z-20 bg-muted border-r shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)]">
                    Totale
                  </TableCell>
                  <TableCell />
                  <TableCell className="text-right tabular-nums">
                    {formatEmission(metadata.totalTheoreticalEmissions)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatEmission(metadata.totalRealEmissions)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatEmission(metadata.totalDeltaAbsolute)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatDeltaPercentage(metadata.totalDeltaPercentage)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCO2Intensity(metadata.avgRealCO2ePerKm)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCO2Intensity(metadata.avgTheoreticalCO2ePerKm)}
                  </TableCell>
                  <TableCell />
                  <TableCell className="text-right tabular-nums">
                    {formatEmission(metadata.totalScope1)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatEmission(metadata.totalScope2)}
                  </TableCell>
                  {KYOTO_GASES.map((gas) => (
                    <TableCell key={gas} className="text-right tabular-nums">
                      <GasValue value={metadata.totalPerGas[gas]} />
                    </TableCell>
                  ))}
                  <TableCell />
                  <TableCell />
                  <TableCell className="text-right tabular-nums">
                    {formatKm(metadata.totalKm)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatFuel(metadata.totalFuel)}
                  </TableCell>
                  <TableCell />
                </TableRow>
              </TableFooter>
            )}
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Row component
// ---------------------------------------------------------------------------

function AggregationRow({ row }: { row: EmissionAggregation }) {
  const scope1 = row.scopeBreakdowns.find((s) => s.scope === 1);
  const scope2 = row.scopeBreakdowns.find((s) => s.scope === 2);
  const perf = PERFORMANCE_CONFIG[row.performanceLevel];

  return (
    <TableRow className={perf.rowClass}>
      {/* Base */}
      <TableCell className={cn("sticky left-0 z-10 border-r font-medium shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)]", perf.stickyClass)}>
        {row.label}
      </TableCell>
      <TableCell className="text-xs">{row.fuelTypeLabel}</TableCell>
      {/* Emissioni */}
      <TableCell className="text-right tabular-nums">
        {formatEmission(row.theoreticalEmissions)}
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {formatEmission(row.realEmissions)}
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {formatEmission(row.deltaAbsolute)}
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {formatDeltaPercentage(row.deltaPercentage)}
      </TableCell>
      {/* Intensita */}
      <TableCell className="text-right tabular-nums">
        {row.realCO2ePerKm > 0 ? formatCO2Intensity(row.realCO2ePerKm) : "-"}
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {row.co2GKmWltp > 0 ? formatCO2Intensity(row.co2GKmWltp) : "-"}
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {row.co2GKmNedc > 0 ? formatCO2Intensity(row.co2GKmNedc) : "-"}
      </TableCell>
      {/* Scope */}
      <TableCell className="text-right tabular-nums">
        {scope1 ? formatEmission(scope1.emissions) : <span className="text-muted-foreground">-</span>}
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {scope2 ? formatEmission(scope2.emissions) : <span className="text-muted-foreground">-</span>}
      </TableCell>
      {/* Gas Kyoto */}
      {KYOTO_GASES.map((gas) => (
        <TableCell key={gas} className="text-right tabular-nums">
          <GasValue value={row.perGas[gas]} />
        </TableCell>
      ))}
      {/* Performance */}
      <TableCell className="text-center">
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger>
              <StatusBadge
                label={`${perf.symbol} ${formatPercentage(row.performanceDeviation)}`}
                variant={perf.variant}
                size="sm"
                showDot={false}
              />
            </TooltipTrigger>
            <TooltipContent>
              <p>{perf.label} flotta ({formatPercentage(row.performanceDeviation)})</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {formatPercentage(row.performanceDeviation)}
      </TableCell>
      {/* Operativo */}
      <TableCell className="text-right tabular-nums">
        {formatKm(row.totalKm)}
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {row.totalFuelLitres > 0 ? formatFuel(row.totalFuelLitres) : "-"}
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {row.totalFuelKwh > 0 ? `${row.totalFuelKwh.toLocaleString("it-IT", { maximumFractionDigits: 1 })} kWh` : "-"}
      </TableCell>
    </TableRow>
  );
}

// ---------------------------------------------------------------------------
// Gas value cell helper
// ---------------------------------------------------------------------------

function GasValue({ value }: { value: number }) {
  if (value < 0.01) {
    return <span className="text-muted-foreground">-</span>;
  }
  return <>{formatEmission(value)}</>;
}
