"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { EmissionTimeSeries } from "@/types/report";

// ---------------------------------------------------------------------------
// Chart config
// ---------------------------------------------------------------------------

const chartConfig = {
  theoreticalEmissions: {
    label: "Emissioni Teoriche",
    color: "var(--color-chart-theoretical)",
  },
  realEmissions: {
    label: "Emissioni Reali",
    color: "var(--color-chart-actual)",
  },
} satisfies ChartConfig;

// ---------------------------------------------------------------------------
// Tooltip formatter
// ---------------------------------------------------------------------------

const fmtIt = new Intl.NumberFormat("it-IT", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatValue(value: number): string {
  return `${fmtIt.format(value)} kgCO2e`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface EmissionTimeSeriesChartProps {
  data: EmissionTimeSeries[];
}

export function EmissionTimeSeriesChart({
  data,
}: EmissionTimeSeriesChartProps) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Andamento Emissioni</CardTitle>
          <CardDescription>
            Nessun dato disponibile per il periodo selezionato.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Andamento Emissioni</CardTitle>
        <CardDescription>
          Confronto emissioni teoriche e reali nel tempo
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <LineChart
            data={data}
            margin={{ top: 5, right: 10, left: 10, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="periodLabel"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(v: number) => fmtIt.format(v)}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value) => formatValue(value as number)}
                />
              }
            />
            <ChartLegend content={<ChartLegendContent />} />
            <Line
              type="monotone"
              dataKey="theoreticalEmissions"
              stroke="var(--color-theoreticalEmissions)"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
              activeDot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="realEmissions"
              stroke="var(--color-realEmissions)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
