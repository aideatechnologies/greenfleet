"use client";

import { useState, useTransition } from "react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X, Loader2 } from "lucide-react";
import { formatEmission } from "@/lib/utils/number";
import { fetchFilteredTrend } from "../actions/dashboard-actions";
import type {
  EmissionsTrendPoint,
  EmissionFilterOptions,
} from "@/lib/services/dashboard-service";

// ---------------------------------------------------------------------------
// Chart config
// ---------------------------------------------------------------------------

const trendChartConfig = {
  value: { label: "Emissioni CO2e", color: "var(--color-primary)" },
} satisfies ChartConfig;

// ---------------------------------------------------------------------------
// IT number formatter
// ---------------------------------------------------------------------------

const fmtIt = new Intl.NumberFormat("it-IT", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface EmissionsTrendCardProps {
  initialData: EmissionsTrendPoint[];
  filterOptions: EmissionFilterOptions;
  className?: string;
}

export function EmissionsTrendCard({
  initialData,
  filterOptions,
  className,
}: EmissionsTrendCardProps) {
  const [data, setData] = useState(initialData);
  const [scope, setScope] = useState<string>("");
  const [fuelTypes, setFuelTypes] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();

  const hasFilters = scope !== "" || fuelTypes.length > 0;

  function applyFilters(nextScope: string, nextFuelTypes: string[]) {
    startTransition(async () => {
      const result = await fetchFilteredTrend({
        scope: nextScope ? Number(nextScope) : undefined,
        fuelTypes: nextFuelTypes.length > 0 ? nextFuelTypes : undefined,
      });
      setData(result);
    });
  }

  function handleScopeChange(value: string) {
    const next = value === "all" ? "" : value;
    setScope(next);
    applyFilters(next, fuelTypes);
  }

  function handleFuelTypeToggle(ft: string) {
    const next = fuelTypes.includes(ft)
      ? fuelTypes.filter((f) => f !== ft)
      : [...fuelTypes, ft];
    setFuelTypes(next);
    applyFilters(scope, next);
  }

  function handleClearFilters() {
    setScope("");
    setFuelTypes([]);
    setData(initialData);
  }

  if (initialData.length < 2) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-base">Andamento Emissioni</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="py-8 text-center text-sm italic text-muted-foreground">
            Dati insufficienti per visualizzare il trend
          </p>
        </CardContent>
      </Card>
    );
  }

  const total = data.reduce((sum, p) => sum + p.value, 0);

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base">Andamento Emissioni</CardTitle>
            <CardDescription>
              Ultimi {data.length} mesi &middot; Totale: {formatEmission(total, true)}
              {isPending && (
                <Loader2 className="ml-2 inline-block size-3 animate-spin" />
              )}
            </CardDescription>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Scope filter */}
            <Select value={scope || "all"} onValueChange={handleScopeChange}>
              <SelectTrigger className="h-8 w-[180px] text-xs">
                <SelectValue placeholder="Tutti gli scope" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti gli scope</SelectItem>
                {filterOptions.scopes.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Fuel type filter badges */}
            {filterOptions.fuelTypes.map((ft) => (
              <Badge
                key={ft.value}
                variant={fuelTypes.includes(ft.value) ? "default" : "outline"}
                className="cursor-pointer text-xs"
                onClick={() => handleFuelTypeToggle(ft.value)}
              >
                {ft.label}
              </Badge>
            ))}

            {/* Clear filters */}
            {hasFilters && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={handleClearFilters}
              >
                <X className="mr-1 size-3" />
                Reset
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={trendChartConfig} className="h-[260px] w-full">
          <AreaChart
            data={data}
            margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.3} />
                <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 12 }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={60}
              tickFormatter={(v: number) =>
                v >= 1000
                  ? `${fmtIt.format(Math.round(v / 1000))} t`
                  : `${fmtIt.format(v)} kg`
              }
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value) =>
                    formatEmission(value as number, true)
                  }
                  nameKey="month"
                />
              }
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="var(--color-primary)"
              strokeWidth={2}
              fill="url(#trendGradient)"
              dot={false}
              activeDot={{ r: 4, strokeWidth: 2, fill: "var(--color-background)" }}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
