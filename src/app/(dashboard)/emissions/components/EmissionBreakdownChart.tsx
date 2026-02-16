"use client";

import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
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
import type { EmissionBreakdown } from "@/types/report";

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
// Color mapping for fuel types (DB-driven)
// ---------------------------------------------------------------------------

/**
 * Maps a vehicleFuelType code (e.g. "DIESEL", "IBRIDO_BENZINA") to its
 * CSS custom-property name. The convention is: lowercase + underscores
 * become hyphens, prefixed with "--color-fuel-".
 *
 * Example: "IBRIDO_BENZINA" -> "var(--color-fuel-ibrido-benzina)"
 *
 * Falls back to a sequential palette for codes that have no dedicated
 * CSS variable defined in globals.css.
 */

/** Fuel type codes that have a matching --color-fuel-* CSS variable. */
const KNOWN_FUEL_CSS_CODES = new Set([
  "DIESEL",
  "BENZINA",
  "GPL",
  "METANO",
  "IBRIDO",
  "IBRIDO_BENZINA",
  "IBRIDO_DIESEL",
  "IDROGENO",
  "ELETTRICO",
]);

const FALLBACK_PALETTE = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
];

function getFuelColor(categoryId: string, index: number): string {
  if (KNOWN_FUEL_CSS_CODES.has(categoryId)) {
    return `var(--color-fuel-${categoryId.toLowerCase().replace(/_/g, "-")})`;
  }
  return FALLBACK_PALETTE[index % FALLBACK_PALETTE.length];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface EmissionBreakdownChartProps {
  data: EmissionBreakdown[];
  onBarClick?: (categoryId: string) => void;
}

export function EmissionBreakdownChart({
  data,
  onBarClick,
}: EmissionBreakdownChartProps) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Distribuzione per Carburante</CardTitle>
          <CardDescription>
            Nessun dato disponibile per il periodo selezionato.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // Enrich data with fill colors derived from the fuel type code
  const enrichedData = data.map((item, index) => ({
    ...item,
    fill: getFuelColor(item.categoryId, index),
  }));

  // Build dynamic chart config for legend
  const dynamicConfig: ChartConfig = {};
  for (const item of enrichedData) {
    dynamicConfig[item.categoryId] = {
      label: item.category,
      color: item.fill,
    };
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Distribuzione per Carburante</CardTitle>
        <CardDescription>
          Emissioni reali suddivise per tipo di alimentazione
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Color legend */}
        <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs">
          {enrichedData.map((item) => (
            <span key={item.categoryId} className="flex items-center gap-1.5">
              <span
                className="inline-block size-2.5 rounded-sm"
                style={{ backgroundColor: item.fill }}
              />
              {item.category} ({fmtIt.format(item.percentage)}%)
            </span>
          ))}
        </div>
        <ChartContainer config={dynamicConfig} className="h-[300px] w-full">
          <BarChart
            data={enrichedData}
            margin={{ top: 5, right: 10, left: 10, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="category"
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
                  formatter={(value, name) => {
                    if (name === "percentage") {
                      return `${fmtIt.format(value as number)}%`;
                    }
                    return formatValue(value as number);
                  }}
                />
              }
            />
            {/* Legend rendered above the chart */}
            <Bar
              dataKey="value"
              radius={[4, 4, 0, 0]}
              className={onBarClick ? "cursor-pointer" : ""}
              onClick={(barData) => {
                if (onBarClick && barData?.categoryId) {
                  onBarClick(barData.categoryId as string);
                }
              }}
              activeBar={{ opacity: onBarClick ? 0.8 : 1 }}
            >
              {enrichedData.map((entry) => (
                <Cell key={entry.categoryId} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
