"use client";

import { useMemo } from "react";
import {
  AreaChart,
  Area,
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
  cumulativeTheoretical: {
    label: "Teoriche Cumulate",
    color: "var(--color-chart-theoretical)",
  },
  cumulativeReal: {
    label: "Reali Cumulate",
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

interface EmissionAreaChartProps {
  data: EmissionTimeSeries[];
}

export function EmissionAreaChart({ data }: EmissionAreaChartProps) {
  // Build cumulative data
  const cumulativeData = useMemo(() => {
    let cumTheoretical = 0;
    let cumReal = 0;
    return data.map((d) => {
      cumTheoretical += d.theoreticalEmissions;
      cumReal += d.realEmissions;
      return {
        periodLabel: d.periodLabel,
        cumulativeTheoretical: Math.round(cumTheoretical * 100) / 100,
        cumulativeReal: Math.round(cumReal * 100) / 100,
      };
    });
  }, [data]);

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Trend Cumulativo</CardTitle>
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
        <CardTitle>Trend Cumulativo</CardTitle>
        <CardDescription>
          Emissioni cumulative nel periodo selezionato
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <AreaChart
            data={cumulativeData}
            margin={{ top: 5, right: 10, left: 10, bottom: 0 }}
          >
            <defs>
              <linearGradient
                id="fillTheoretical"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="5%"
                  stopColor="var(--color-cumulativeTheoretical)"
                  stopOpacity={0.3}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-cumulativeTheoretical)"
                  stopOpacity={0.05}
                />
              </linearGradient>
              <linearGradient
                id="fillReal"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="5%"
                  stopColor="var(--color-cumulativeReal)"
                  stopOpacity={0.3}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-cumulativeReal)"
                  stopOpacity={0.05}
                />
              </linearGradient>
            </defs>
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
            <Area
              type="monotone"
              dataKey="cumulativeTheoretical"
              stroke="var(--color-cumulativeTheoretical)"
              strokeWidth={2}
              strokeDasharray="5 5"
              fill="url(#fillTheoretical)"
            />
            <Area
              type="monotone"
              dataKey="cumulativeReal"
              stroke="var(--color-cumulativeReal)"
              strokeWidth={2}
              fill="url(#fillReal)"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
