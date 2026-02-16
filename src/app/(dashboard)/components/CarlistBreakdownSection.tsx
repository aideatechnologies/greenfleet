"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Cell,
} from "recharts";
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
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { exportToCsv } from "@/lib/utils/csv-export";
import type {
  CarlistBreakdownItem,
  CarlistBreakdownResult,
} from "@/lib/services/dashboard-service";
import {
  formatKm,
  formatEmission,
  formatFuelConsumption,
} from "@/lib/utils/number";

// ---------------------------------------------------------------------------
// Colors for carlist bars (cycle through chart palette)
// ---------------------------------------------------------------------------

const CARLIST_COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
];

function getCarlistColor(index: number): string {
  return CARLIST_COLORS[index % CARLIST_COLORS.length];
}

// ---------------------------------------------------------------------------
// IT number formatter
// ---------------------------------------------------------------------------

const fmtIt = new Intl.NumberFormat("it-IT", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const fmtIt1 = new Intl.NumberFormat("it-IT", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

// ---------------------------------------------------------------------------
// Chart config
// ---------------------------------------------------------------------------

const emissionsChartConfig = {
  emissionsKgCO2e: { label: "Emissioni CO2e" },
} satisfies ChartConfig;

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface CarlistBreakdownSectionProps {
  data: CarlistBreakdownResult;
}

export function CarlistBreakdownSection({
  data,
}: CarlistBreakdownSectionProps) {
  if (data.items.length === 0) {
    return null;
  }

  const emissionsItems = data.items.filter((i) => i.emissionsKgCO2e > 0);

  function todayStr() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  function handleExportCarlist() {
    exportToCsv(
      `flotta-per-parco-auto-${todayStr()}`,
      [
        { header: "Parco Auto", accessor: (r: CarlistBreakdownItem) => r.carlistName },
        { header: "Veicoli", accessor: (r: CarlistBreakdownItem) => r.vehicleCount, format: "integer" },
        { header: "Km", accessor: (r: CarlistBreakdownItem) => r.totalKm, format: "integer" },
        { header: "Litri", accessor: (r: CarlistBreakdownItem) => r.totalLitres, format: "decimal2" },
        { header: "kWh", accessor: (r: CarlistBreakdownItem) => r.totalKwh, format: "decimal2" },
        { header: "Emissioni kgCO2e", accessor: (r: CarlistBreakdownItem) => r.emissionsKgCO2e, format: "decimal2" },
        { header: "%", accessor: (r: CarlistBreakdownItem) => r.emissionsPercentage, format: "percentage" },
      ],
      data.items
    );
  }

  return (
    <div className="space-y-4">
      {/* Row 1: Bar chart emissions per carlist */}
      {emissionsItems.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              Emissioni per Parco Auto
            </CardTitle>
            <CardDescription>
              Totale: {formatEmission(data.totals.emissions, true)} (
              {data.totals.vehicles} veicoli)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={emissionsChartConfig}
              className="h-[280px] w-full"
            >
              <BarChart
                data={emissionsItems}
                layout="vertical"
                margin={{ top: 5, right: 10, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <YAxis
                  dataKey="carlistName"
                  type="category"
                  tickLine={false}
                  axisLine={false}
                  width={120}
                  tick={{ fontSize: 12 }}
                />
                <XAxis
                  type="number"
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: number) =>
                    v >= 1000
                      ? `${fmtIt1.format(v / 1000)} t`
                      : `${fmtIt.format(v)} kg`
                  }
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value) =>
                        formatEmission(value as number, true)
                      }
                      nameKey="carlistName"
                    />
                  }
                />
                <Bar dataKey="emissionsKgCO2e" radius={[0, 4, 4, 0]}>
                  {emissionsItems.map((_, index) => (
                    <Cell
                      key={index}
                      fill={getCarlistColor(index)}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

      {/* Row 2: Summary table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="text-base">
              Riepilogo per Parco Auto
            </CardTitle>
            <CardDescription>
              {data.unassignedVehicles > 0
                ? `${data.unassignedVehicles} veicoli non assegnati a nessun parco auto`
                : "Tutti i veicoli sono assegnati a un parco auto"}
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={handleExportCarlist}>
            <Download className="h-4 w-4 mr-1" />
            Esporta CSV
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Parco Auto</TableHead>
                <TableHead className="text-right">Veicoli</TableHead>
                <TableHead className="text-right">Km</TableHead>
                <TableHead className="text-right">Consumi</TableHead>
                <TableHead className="text-right">Emissioni CO2e</TableHead>
                <TableHead className="text-right">%</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((item, index) => (
                <TableRow key={item.carlistId}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-block size-3 rounded-full shrink-0"
                        style={{
                          backgroundColor: getCarlistColor(index),
                        }}
                      />
                      <span className="font-medium">{item.carlistName}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {item.vehicleCount}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {item.totalKm > 0 ? formatKm(item.totalKm) : "\u2014"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {item.totalLitres > 0 || item.totalKwh > 0
                      ? formatFuelConsumption(item.totalLitres, item.totalKwh)
                      : "\u2014"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatEmission(item.emissionsKgCO2e, true)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {fmtIt1.format(item.emissionsPercentage)}%
                  </TableCell>
                </TableRow>
              ))}
              {/* Totals */}
              <TableRow className="border-t-2 font-semibold">
                <TableCell>Totale</TableCell>
                <TableCell className="text-right tabular-nums">
                  {data.totals.vehicles}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatKm(data.totals.km)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {"\u2014"}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatEmission(data.totals.emissions, true)}
                </TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">
                  100%
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
