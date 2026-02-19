"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Leaf,
  Car,
  Route,
  Fuel,
  type LucideIcon,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Icon name → component resolver (for Server→Client boundary)
// ---------------------------------------------------------------------------

const ICON_MAP: Record<string, LucideIcon> = {
  Leaf,
  Car,
  Route,
  Fuel,
};

function resolveIcon(icon?: LucideIcon | string): LucideIcon | undefined {
  if (!icon) return undefined;
  if (typeof icon === "string") return ICON_MAP[icon];
  return icon;
}
import { AreaChart, Area, ResponsiveContainer } from "recharts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface KPICardProps {
  /** Card label / metric name (preferred) */
  label?: string;
  /** @deprecated Use `label` instead — kept for backward compatibility */
  title?: string;
  /** Main value to display */
  value: string | number;
  /** Unit suffix (e.g. "kgCO2e", "km") — preferred */
  unit?: string;
  /** @deprecated Use `unit` instead — kept for backward compatibility */
  suffix?: string;
  /** Lucide icon component or registered icon name string */
  icon?: LucideIcon | string;
  /** Trend indicator */
  trend?: {
    value: number; // percentage
    direction: "up" | "down" | "neutral";
    label?: string; // e.g. "vs mese precedente"
  };
  /** Array of 12 data points for sparkline */
  sparklineData?: number[];
  /** Visual variant */
  variant?: "default" | "compact" | "hero";
  /** When true, DOWN is good (green) and UP is bad (red) -- for emissions */
  invertTrendColor?: boolean;
  /** Card state */
  state?: "loading" | "populated" | "no-data" | "error";
  /** Additional CSS classes */
  className?: string;
}

// ---------------------------------------------------------------------------
// Trend color logic
// ---------------------------------------------------------------------------

type TrendColor = "success" | "destructive" | "muted";

function getTrendColor(
  direction: "up" | "down" | "neutral",
  invert: boolean
): TrendColor {
  if (direction === "neutral") return "muted";
  if (invert) {
    return direction === "down" ? "success" : "destructive";
  }
  return direction === "up" ? "success" : "destructive";
}

const TREND_TEXT_CLASSES: Record<TrendColor, string> = {
  success: "text-emerald-700 dark:text-emerald-400",
  destructive: "text-red-700 dark:text-red-400",
  muted: "text-muted-foreground",
};

const SPARKLINE_COLORS: Record<TrendColor, { stroke: string; fill: string }> = {
  success: { stroke: "var(--color-emerald-500, #10b981)", fill: "var(--color-emerald-500, #10b981)" },
  destructive: { stroke: "var(--color-red-500, #ef4444)", fill: "var(--color-red-500, #ef4444)" },
  muted: { stroke: "var(--color-gray-400, #9ca3af)", fill: "var(--color-gray-400, #9ca3af)" },
};

// ---------------------------------------------------------------------------
// Trend icon
// ---------------------------------------------------------------------------

function TrendIcon({ direction }: { direction: "up" | "down" | "neutral" }) {
  if (direction === "up") return <TrendingUp className="size-3" aria-hidden="true" />;
  if (direction === "down") return <TrendingDown className="size-3" aria-hidden="true" />;
  return <Minus className="size-3" aria-hidden="true" />;
}

// ---------------------------------------------------------------------------
// Sparkline sub-component (minimal: no axes, just line + area gradient)
// ---------------------------------------------------------------------------

function Sparkline({
  data,
  color,
  height,
}: {
  data: number[];
  color: TrendColor;
  height: number;
}) {
  const chartData = data.map((v, i) => ({ idx: i, val: v }));
  const colors = SPARKLINE_COLORS[color];
  const gradientId = `kpi-spark-${color}`;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={chartData} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colors.fill} stopOpacity={0.25} />
            <stop offset="100%" stopColor={colors.fill} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="val"
          stroke={colors.stroke}
          strokeWidth={1.5}
          fill={`url(#${gradientId})`}
          dot={false}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ---------------------------------------------------------------------------
// Loading skeleton per variant
// ---------------------------------------------------------------------------

function KPICardSkeleton({ variant }: { variant: "default" | "compact" | "hero" }) {
  if (variant === "compact") {
    return (
      <div data-slot="card" className="rounded-xl border p-4 bg-card">
        <div className="flex items-center gap-3">
          <Skeleton className="size-8 rounded-lg" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-5 w-16" />
          </div>
        </div>
      </div>
    );
  }

  if (variant === "hero") {
    return (
      <div data-slot="card" className="rounded-xl border p-5 bg-card">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="size-10 rounded-lg" />
          </div>
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-5 w-24" />
          <Skeleton className="mt-2 h-12 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div data-slot="card" className="rounded-xl border p-5 bg-card">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="size-8 rounded-lg" />
        </div>
        <Skeleton className="h-7 w-20" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="mt-1 h-9 w-full" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// No data state
// ---------------------------------------------------------------------------

function NoDataValue() {
  const t = useTranslations("common");
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="text-muted-foreground tabular-nums cursor-default">--</span>
        </TooltipTrigger>
        <TooltipContent>{t("noDataAvailable")}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ---------------------------------------------------------------------------
// Error state
// ---------------------------------------------------------------------------

function ErrorValue() {
  const t = useTranslations("common");
  return (
    <div className="flex items-center gap-1.5 text-destructive">
      <AlertTriangle className="size-4" aria-hidden="true" />
      <span className="text-sm font-medium">{t("error")}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// IT locale trend formatter
// ---------------------------------------------------------------------------

const trendFmt = new Intl.NumberFormat("it-IT", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
  signDisplay: "exceptZero",
});

function formatTrendValue(value: number): string {
  return `${trendFmt.format(value)}%`;
}

// ---------------------------------------------------------------------------
// Accessibility aria-label builder
// ---------------------------------------------------------------------------

function buildAriaLabel(
  label: string,
  value: string | number,
  tCommon: (key: string) => string,
  unit?: string,
  trend?: KPICardProps["trend"],
  state?: KPICardProps["state"]
): string {
  if (state === "loading") return `${label}: ${tCommon("loadingInProgress")}`;
  if (state === "error") return `${label}: ${tCommon("errorLoading")}`;
  if (state === "no-data") return `${label}: ${tCommon("dataNotAvailable")}`;

  let text = `${label}: ${value}`;
  if (unit) text += ` ${unit}`;
  if (trend) {
    text += `. Trend: ${formatTrendValue(trend.value)}`;
    if (trend.label) text += ` ${trend.label}`;
  }
  return text;
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function KPICard({
  label: labelProp,
  title: titleProp,
  value,
  unit: unitProp,
  suffix: suffixProp,
  icon: iconProp,
  trend,
  sparklineData,
  variant = "default",
  invertTrendColor = false,
  state = "populated",
  className,
}: KPICardProps) {
  const tCommon = useTranslations("common");
  const label = labelProp ?? titleProp ?? "";
  const unit = unitProp ?? suffixProp;
  const Icon = resolveIcon(iconProp);

  if (state === "loading") {
    return <KPICardSkeleton variant={variant} />;
  }

  const trendColor = trend
    ? getTrendColor(trend.direction, invertTrendColor)
    : "muted";

  const ariaLabel = buildAriaLabel(label, value, (k: string) => tCommon(k as "error"), unit, trend, state);

  // -- Compact variant --
  if (variant === "compact") {
    return (
      <div data-slot="card" className={cn("rounded-xl border p-4 bg-card transition-all duration-200", className)} role="region" aria-label={ariaLabel}>
        <div className="flex items-center gap-3">
          {Icon && (
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Icon className="size-4 text-primary" aria-hidden="true" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-muted-foreground">
              {label}
            </p>
            <div className="flex items-baseline gap-1.5">
              {state === "error" ? (
                <ErrorValue />
              ) : state === "no-data" ? (
                <NoDataValue />
              ) : (
                <>
                  <span className="text-lg font-bold tabular-nums tracking-tight">
                    {value}
                  </span>
                  {unit && (
                    <span className="text-xs text-muted-foreground">{unit}</span>
                  )}
                </>
              )}
              {trend && state === "populated" && (
                <span
                  className={cn(
                    "flex items-center gap-0.5 text-xs font-medium",
                    TREND_TEXT_CLASSES[trendColor]
                  )}
                >
                  <TrendIcon direction={trend.direction} />
                  {formatTrendValue(trend.value)}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // -- Hero variant --
  if (variant === "hero") {
    return (
      <div data-slot="card" className={cn("rounded-xl border p-5 bg-card transition-all duration-200", className)} role="region" aria-label={ariaLabel}>
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            {Icon && (
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <Icon className="size-5 text-primary" aria-hidden="true" />
              </div>
            )}
          </div>
          <div className="flex items-baseline gap-2">
            {state === "error" ? (
              <ErrorValue />
            ) : state === "no-data" ? (
              <span className="text-3xl font-bold tabular-nums text-muted-foreground">
                --
              </span>
            ) : (
              <>
                <span className="text-3xl font-bold tabular-nums tracking-tight">
                  {value}
                </span>
                {unit && (
                  <span className="text-sm text-muted-foreground">{unit}</span>
                )}
              </>
            )}
          </div>
          {trend && state === "populated" && (
            <div
              className={cn(
                "flex items-center gap-1 text-sm font-medium",
                TREND_TEXT_CLASSES[trendColor]
              )}
            >
              <TrendIcon direction={trend.direction} />
              <span className="tabular-nums">{formatTrendValue(trend.value)}</span>
              {trend.label && (
                <span className="text-xs font-normal text-muted-foreground">
                  {trend.label}
                </span>
              )}
            </div>
          )}
          {sparklineData && sparklineData.length > 1 && state === "populated" && (
            <div className="mt-2">
              <Sparkline data={sparklineData} color={trendColor} height={48} />
            </div>
          )}
        </div>
      </div>
    );
  }

  // -- Default variant --
  return (
    <div data-slot="card" className={cn("rounded-xl border p-5 bg-card transition-all duration-200", className)} role="region" aria-label={ariaLabel}>
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          {Icon && (
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Icon className="size-4 text-primary" aria-hidden="true" />
            </div>
          )}
        </div>
        <div className="flex items-baseline gap-1.5">
          {state === "error" ? (
            <ErrorValue />
          ) : state === "no-data" ? (
            <NoDataValue />
          ) : (
            <>
              <span className="text-2xl font-bold tabular-nums tracking-tight">
                {value}
              </span>
              {unit && (
                <span className="text-xs text-muted-foreground">{unit}</span>
              )}
            </>
          )}
        </div>
        {trend && state === "populated" && (
          <div
            className={cn(
              "flex items-center gap-1 text-xs font-medium",
              TREND_TEXT_CLASSES[trendColor]
            )}
          >
            <TrendIcon direction={trend.direction} />
            <span className="tabular-nums">{formatTrendValue(trend.value)}</span>
            {trend.label && (
              <span className="font-normal text-muted-foreground">{trend.label}</span>
            )}
          </div>
        )}
        {sparklineData && sparklineData.length > 1 && state === "populated" && (
          <div className="mt-1">
            <Sparkline data={sparklineData} color={trendColor} height={36} />
          </div>
        )}
      </div>
    </div>
  );
}
