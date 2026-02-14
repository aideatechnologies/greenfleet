"use client";

import { cn } from "@/lib/utils";
import { formatEmission, formatDeltaPercentage } from "@/lib/utils/number";
import { calculateDelta } from "@/lib/services/emission-calculator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface DeltaBarProps {
  theoretical: number;
  real: number;
  variant: "inline" | "full" | "mini";
  loading?: boolean;
  className?: string;
}

// ---------------------------------------------------------------------------
// Delta color logic
// ---------------------------------------------------------------------------

type DeltaColor = "destructive" | "success" | "muted";

function getDeltaColor(percentage: number): DeltaColor {
  if (percentage > 2) return "destructive";
  if (percentage < -2) return "success";
  return "muted";
}

const COLOR_CLASSES: Record<DeltaColor, { text: string; bg: string; badge: string }> = {
  destructive: {
    text: "text-red-700 dark:text-red-400",
    bg: "bg-red-500 dark:bg-red-600",
    badge:
      "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800",
  },
  success: {
    text: "text-emerald-700 dark:text-emerald-400",
    bg: "bg-emerald-500 dark:bg-emerald-600",
    badge:
      "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800",
  },
  muted: {
    text: "text-muted-foreground",
    bg: "bg-muted-foreground/40",
    badge:
      "bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800/30 dark:text-gray-400 dark:border-gray-700",
  },
};

// ---------------------------------------------------------------------------
// Directional arrow
// ---------------------------------------------------------------------------

function DeltaArrow({ percentage }: { percentage: number }) {
  if (percentage > 2) {
    return <span aria-hidden="true">&#9650;</span>; // up triangle
  }
  if (percentage < -2) {
    return <span aria-hidden="true">&#9660;</span>; // down triangle
  }
  return <span aria-hidden="true">&#8776;</span>; // approximately equal
}

// ---------------------------------------------------------------------------
// Accessibility label builder
// ---------------------------------------------------------------------------

function buildAriaLabel(theoretical: number, real: number, percentage: number): string {
  const theoreticalText = formatEmission(theoretical);
  const realText = formatEmission(real);
  const deltaText = formatDeltaPercentage(percentage);
  return `Emissioni teoriche: ${theoreticalText}. Emissioni reali: ${realText}. Delta: ${deltaText}`;
}

// ---------------------------------------------------------------------------
// Bar width calculation
// ---------------------------------------------------------------------------

function getBarWidthPercent(value: number, maxValue: number): number {
  if (maxValue <= 0) return 0;
  return Math.min((value / maxValue) * 100, 100);
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function DeltaBarSkeleton({ variant }: { variant: DeltaBarProps["variant"] }) {
  if (variant === "mini") {
    return <Skeleton className="h-5 w-16" />;
  }
  if (variant === "inline") {
    return <Skeleton className="h-6 w-24" />;
  }
  return (
    <div className="flex flex-col gap-2">
      <Skeleton className="h-5 w-full" />
      <Skeleton className="h-5 w-full" />
      <Skeleton className="h-5 w-16" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// No data state
// ---------------------------------------------------------------------------

function DeltaBarNoData() {
  return (
    <span className="text-sm text-muted-foreground italic">
      Dati insufficienti
    </span>
  );
}

// ---------------------------------------------------------------------------
// Variant: full
// ---------------------------------------------------------------------------

function DeltaBarFull({
  theoretical,
  real,
  delta,
  color,
  ariaLabel,
}: {
  theoretical: number;
  real: number;
  delta: { absolute: number; percentage: number };
  color: DeltaColor;
  ariaLabel: string;
}) {
  const maxValue = Math.max(theoretical, real);

  return (
    <div className="flex flex-col gap-2" aria-label={ariaLabel}>
      {/* Theoretical bar */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground font-medium">Teorico</span>
          <span className="tabular-nums font-medium">
            {formatEmission(theoretical)}
          </span>
        </div>
        <div
          className="h-3 w-full rounded-full bg-muted overflow-hidden"
          role="meter"
          aria-label={`Emissioni teoriche: ${formatEmission(theoretical)}`}
          aria-valuenow={theoretical}
          aria-valuemin={0}
          aria-valuemax={maxValue}
        >
          <div
            className="h-full rounded-full bg-primary/60 transition-all duration-300"
            style={{ width: `${getBarWidthPercent(theoretical, maxValue)}%` }}
          />
        </div>
      </div>

      {/* Real bar */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground font-medium">Reale</span>
          <span className="tabular-nums font-medium">
            {formatEmission(real)}
          </span>
        </div>
        <div
          className="h-3 w-full rounded-full bg-muted overflow-hidden"
          role="meter"
          aria-label={`Emissioni reali: ${formatEmission(real)}`}
          aria-valuenow={real}
          aria-valuemin={0}
          aria-valuemax={maxValue}
        >
          <div
            className={cn(
              "h-full rounded-full transition-all duration-300",
              COLOR_CLASSES[color].bg
            )}
            style={{ width: `${getBarWidthPercent(real, maxValue)}%` }}
          />
        </div>
      </div>

      {/* Delta badge */}
      <div className="flex items-center gap-1.5">
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
            COLOR_CLASSES[color].badge
          )}
        >
          <DeltaArrow percentage={delta.percentage} />
          {formatDeltaPercentage(delta.percentage)}
        </span>
        <span className="text-xs text-muted-foreground">
          ({formatEmission(delta.absolute)})
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Variant: inline
// ---------------------------------------------------------------------------

function DeltaBarInline({
  theoretical,
  real,
  delta,
  color,
  ariaLabel,
}: {
  theoretical: number;
  real: number;
  delta: { absolute: number; percentage: number };
  color: DeltaColor;
  ariaLabel: string;
}) {
  const maxValue = Math.max(theoretical, real);

  const tooltipContent = (
    <div className="flex flex-col gap-1 text-xs">
      <div>Teorico: {formatEmission(theoretical)}</div>
      <div>Reale: {formatEmission(real)}</div>
      <div>
        Delta: {formatDeltaPercentage(delta.percentage)} (
        {formatEmission(delta.absolute)})
      </div>
    </div>
  );

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className="flex items-center gap-1.5"
            aria-label={ariaLabel}
          >
            {/* Compact stacked bars */}
            <div className="flex flex-col gap-0.5 w-16">
              <div
                className="h-1.5 rounded-full bg-muted overflow-hidden"
                role="meter"
                aria-label={`Emissioni teoriche: ${formatEmission(theoretical)}`}
                aria-valuenow={theoretical}
                aria-valuemin={0}
                aria-valuemax={maxValue}
              >
                <div
                  className="h-full rounded-full bg-primary/60"
                  style={{
                    width: `${getBarWidthPercent(theoretical, maxValue)}%`,
                  }}
                />
              </div>
              <div
                className="h-1.5 rounded-full bg-muted overflow-hidden"
                role="meter"
                aria-label={`Emissioni reali: ${formatEmission(real)}`}
                aria-valuenow={real}
                aria-valuemin={0}
                aria-valuemax={maxValue}
              >
                <div
                  className={cn(
                    "h-full rounded-full",
                    COLOR_CLASSES[color].bg
                  )}
                  style={{
                    width: `${getBarWidthPercent(real, maxValue)}%`,
                  }}
                />
              </div>
            </div>
            {/* Compact delta */}
            <span
              className={cn(
                "text-xs font-medium tabular-nums",
                COLOR_CLASSES[color].text
              )}
            >
              <DeltaArrow percentage={delta.percentage} />{" "}
              {formatDeltaPercentage(delta.percentage)}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent>{tooltipContent}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ---------------------------------------------------------------------------
// Variant: mini
// ---------------------------------------------------------------------------

function DeltaBarMini({
  delta,
  color,
  ariaLabel,
}: {
  delta: { absolute: number; percentage: number };
  color: DeltaColor;
  ariaLabel: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-sm font-medium tabular-nums",
        COLOR_CLASSES[color].text
      )}
      aria-label={ariaLabel}
    >
      <DeltaArrow percentage={delta.percentage} />
      {formatDeltaPercentage(delta.percentage)}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

/**
 * DeltaBar - Displays a comparison between theoretical and real emissions
 * with a visual delta indicator.
 *
 * Variants:
 * - `full`: Two horizontal bars with labels, values, and delta badge (dashboard/detail)
 * - `inline`: Compact bars with tooltip (table rows)
 * - `mini`: Just delta percentage with directional arrow (KPICard)
 *
 * Colors:
 * - destructive (red): real > theoretical by more than 2%
 * - success (green): real < theoretical by more than 2%
 * - muted (gray): within +/-2%
 */
export function DeltaBar({
  theoretical,
  real,
  variant,
  loading,
  className,
}: DeltaBarProps) {
  if (loading) {
    return (
      <div className={className}>
        <DeltaBarSkeleton variant={variant} />
      </div>
    );
  }

  // No data: both values are 0
  if (theoretical === 0 && real === 0) {
    return (
      <div className={className}>
        <DeltaBarNoData />
      </div>
    );
  }

  const delta = calculateDelta(theoretical, real);
  const color = getDeltaColor(delta.percentage);
  const ariaLabel = buildAriaLabel(theoretical, real, delta.percentage);

  return (
    <div className={className}>
      {variant === "full" && (
        <DeltaBarFull
          theoretical={theoretical}
          real={real}
          delta={delta}
          color={color}
          ariaLabel={ariaLabel}
        />
      )}
      {variant === "inline" && (
        <DeltaBarInline
          theoretical={theoretical}
          real={real}
          delta={delta}
          color={color}
          ariaLabel={ariaLabel}
        />
      )}
      {variant === "mini" && (
        <DeltaBarMini
          delta={delta}
          color={color}
          ariaLabel={ariaLabel}
        />
      )}
    </div>
  );
}
