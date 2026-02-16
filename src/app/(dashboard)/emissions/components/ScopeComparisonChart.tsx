"use client";

import { useMemo } from "react";
import { PieChart, Pie, Cell } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
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
import { formatEmission, formatPercentage } from "@/lib/utils/number";
import {
  KYOTO_GASES,
  KYOTO_GAS_LABELS,
  type KyotoGas,
  type PerGasResult,
} from "@/types/emission";
import type { EmissionAggregation } from "@/types/report";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ScopeComparisonChartProps {
  scope1: number;
  scope2: number;
  scope1Percentage: number;
  scope2Percentage: number;
  aggregations: EmissionAggregation[];
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const SCOPE_COLORS = {
  scope1: "var(--color-chart-1)",
  scope2: "var(--color-chart-3)",
} as const;

const chartConfig: ChartConfig = {
  scope1: { label: "Scope 1", color: SCOPE_COLORS.scope1 },
  scope2: { label: "Scope 2", color: SCOPE_COLORS.scope2 },
};

const emptyGas: PerGasResult = {
  co2: 0, ch4: 0, n2o: 0, hfc: 0, pfc: 0, sf6: 0, nf3: 0,
};

// ---------------------------------------------------------------------------
// Helper: sum per-gas across all aggregation rows for a given scope
// ---------------------------------------------------------------------------

function sumGasPerScope(
  aggregations: EmissionAggregation[],
  scope: 1 | 2
): PerGasResult {
  const result = { ...emptyGas };
  for (const agg of aggregations) {
    const sb = agg.scopeBreakdowns.find((s) => s.scope === scope);
    if (!sb) continue;
    for (const gas of KYOTO_GASES) {
      result[gas] += sb.perGas[gas];
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Number formatter
// ---------------------------------------------------------------------------

const fmtIt = new Intl.NumberFormat("it-IT", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function fmtGas(value: number): string {
  if (value < 0.01) return "-";
  return fmtIt.format(value);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ScopeComparisonChart({
  scope1,
  scope2,
  scope1Percentage,
  scope2Percentage,
  aggregations,
}: ScopeComparisonChartProps) {
  const total = scope1 + scope2;

  const gasScope1 = useMemo(() => sumGasPerScope(aggregations, 1), [aggregations]);
  const gasScope2 = useMemo(() => sumGasPerScope(aggregations, 2), [aggregations]);

  if (total === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Scope 1 vs Scope 2</CardTitle>
          <CardDescription>
            Nessun dato disponibile per il periodo selezionato.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const data = [
    { name: "Scope 1", value: scope1, fill: SCOPE_COLORS.scope1 },
    { name: "Scope 2", value: scope2, fill: SCOPE_COLORS.scope2 },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Scope 1 vs Scope 2</CardTitle>
        <CardDescription>
          Ripartizione emissioni per scope e gas — Totale: {formatEmission(total, true)}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Top section: donut + scope summaries */}
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:gap-8">
          {/* Donut chart */}
          <ChartContainer config={chartConfig} className="h-[200px] w-[200px] shrink-0">
            <PieChart>
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value) => formatEmission(value as number, true)}
                  />
                }
              />
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={85}
                strokeWidth={2}
                stroke="var(--background)"
              >
                {data.map((entry) => (
                  <Cell key={entry.name} fill={entry.fill} />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>

          {/* Scope summaries */}
          <div className="flex flex-col gap-3 text-sm">
            <div className="flex items-center gap-3">
              <span
                className="inline-block size-4 rounded-sm shrink-0"
                style={{ backgroundColor: SCOPE_COLORS.scope1 }}
              />
              <div>
                <p className="font-semibold">Scope 1 — Emissioni dirette</p>
                <p className="text-muted-foreground text-xs">
                  Combustione diretta del carburante nel veicolo
                </p>
                <p className="mt-1 tabular-nums text-lg font-bold">
                  {formatEmission(scope1, true)}
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    ({formatPercentage(scope1Percentage)})
                  </span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span
                className="inline-block size-4 rounded-sm shrink-0"
                style={{ backgroundColor: SCOPE_COLORS.scope2 }}
              />
              <div>
                <p className="font-semibold">Scope 2 — Emissioni indirette</p>
                <p className="text-muted-foreground text-xs">
                  Produzione e distribuzione dell&apos;energia consumata
                </p>
                <p className="mt-1 tabular-nums text-lg font-bold">
                  {formatEmission(scope2, true)}
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    ({formatPercentage(scope2Percentage)})
                  </span>
                </p>
              </div>
            </div>
            {/* Delta between scopes */}
            <div className="mt-1 rounded-md border bg-muted/50 px-3 py-2">
              <p className="text-xs text-muted-foreground">Differenza Scope 1 − Scope 2</p>
              <p className="tabular-nums text-base font-semibold">
                {formatEmission(Math.abs(scope1 - scope2), true)}
                <span className="ml-1 text-xs font-normal text-muted-foreground">
                  ({scope1 > scope2 ? "Scope 1 maggiore" : scope2 > scope1 ? "Scope 2 maggiore" : "Identici"})
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Gas breakdown table per scope */}
        <div>
          <h4 className="mb-2 text-sm font-semibold">Dettaglio Gas per Scope (kgCO2e)</h4>
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[120px]">Gas</TableHead>
                  <TableHead className="min-w-[130px] text-right">
                    <span className="flex items-center justify-end gap-1.5">
                      <span
                        className="inline-block size-2.5 rounded-sm"
                        style={{ backgroundColor: SCOPE_COLORS.scope1 }}
                      />
                      Scope 1
                    </span>
                  </TableHead>
                  <TableHead className="min-w-[130px] text-right">
                    <span className="flex items-center justify-end gap-1.5">
                      <span
                        className="inline-block size-2.5 rounded-sm"
                        style={{ backgroundColor: SCOPE_COLORS.scope2 }}
                      />
                      Scope 2
                    </span>
                  </TableHead>
                  <TableHead className="min-w-[130px] text-right font-semibold">
                    Totale
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {KYOTO_GASES.map((gas: KyotoGas) => {
                  const s1 = gasScope1[gas];
                  const s2 = gasScope2[gas];
                  const gasTotal = s1 + s2;
                  // Skip rows where both scopes are zero
                  if (gasTotal < 0.01) return null;
                  return (
                    <TableRow key={gas}>
                      <TableCell className="font-medium">
                        {KYOTO_GAS_LABELS[gas]}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {fmtGas(s1)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {fmtGas(s2)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-semibold">
                        {fmtGas(gasTotal)}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {/* Show message if all gases are zero */}
                {KYOTO_GASES.every(
                  (gas) => gasScope1[gas] + gasScope2[gas] < 0.01
                ) && (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="h-16 text-center text-muted-foreground"
                    >
                      Nessun dettaglio gas disponibile.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
              <TableFooter>
                <TableRow className="font-semibold">
                  <TableCell>Totale</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatEmission(scope1)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatEmission(scope2)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatEmission(total)}
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
