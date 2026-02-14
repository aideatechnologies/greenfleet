"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Milestone {
  /** Position as percentage (0-100) */
  position: number;
  /** Label shown on hover or beside the dot */
  label: string;
  /** Whether this milestone has been reached */
  reached?: boolean;
}

interface ProgressTargetProps {
  /** Current value */
  value: number;
  /** Maximum / target value */
  target: number;
  /** Optional label for current value (e.g. "12.5 tCO2e") */
  valueLabel?: string;
  /** Optional label for the target (e.g. "Target: 20 tCO2e") */
  targetLabel?: string;
  /** Milestones along the progress bar */
  milestones?: Milestone[];
  /** Whether exceeding target is bad (over-budget) — default true */
  overTargetIsBad?: boolean;
  /** Visual variant */
  variant?: "full" | "compact";
  /** Additional CSS classes */
  className?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * ProgressTarget - A progress bar with milestone markers for target tracking.
 *
 * Used for emissions targets, budget tracking, etc.
 *
 * Variants:
 * - full: labels above/below, milestone dots, delta badge
 * - compact: minimal bar with percentage
 */
export function ProgressTarget({
  value,
  target,
  valueLabel,
  targetLabel,
  milestones,
  overTargetIsBad = true,
  variant = "full",
  className,
}: ProgressTargetProps) {
  const safeTarget = Math.max(target, 1);
  const percentage = Math.min((value / safeTarget) * 100, 120); // cap at 120% visual
  const pctValue = (value / safeTarget) * 100;
  const isOver = value > target;

  const fmt = new Intl.NumberFormat("it-IT", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  });

  // Determine color
  const barColor = isOver && overTargetIsBad
    ? "bg-destructive"
    : isOver && !overTargetIsBad
      ? "bg-success"
      : "bg-primary";

  if (variant === "compact") {
    return (
      <div className={cn("flex items-center gap-2", className)} data-tabular-nums>
        <div className="relative h-2 flex-1 rounded-full bg-muted">
          <div
            className={cn("h-full rounded-full transition-all duration-500", barColor)}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
        <span className="min-w-[40px] text-right text-xs font-medium tabular-nums text-muted-foreground">
          {fmt.format(pctValue)}%
        </span>
      </div>
    );
  }

  // "full" variant
  return (
    <div className={cn("flex flex-col gap-2", className)} data-tabular-nums>
      {/* Labels row */}
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium">
          {valueLabel ?? fmt.format(value)}
        </span>
        <span className="text-muted-foreground">
          {targetLabel ?? `Target: ${fmt.format(target)}`}
        </span>
      </div>

      {/* Bar with milestones */}
      <div className="relative h-3 rounded-full bg-muted">
        {/* Progress fill */}
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            barColor
          )}
          style={{ width: `${Math.min(percentage, 100)}%` }}
          role="progressbar"
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={target}
          aria-label={
            valueLabel
              ? `${valueLabel} su ${targetLabel ?? fmt.format(target)}`
              : `${fmt.format(pctValue)}% del target`
          }
        />

        {/* Milestone dots */}
        {milestones?.map((milestone, idx) => (
          <div
            key={idx}
            className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${Math.min(milestone.position, 100)}%` }}
          >
            <div
              className={cn(
                "size-2.5 rounded-full border-2 border-background",
                milestone.reached ? "bg-primary" : "bg-muted-foreground/30"
              )}
              title={milestone.label}
            />
          </div>
        ))}

        {/* 100% marker line */}
        {percentage < 100 && (
          <div
            className="absolute right-0 top-0 h-full w-px bg-foreground/20"
            aria-hidden="true"
          />
        )}
      </div>

      {/* Delta badge */}
      <div className="flex items-center justify-between">
        {milestones && milestones.length > 0 ? (
          <div className="flex gap-3">
            {milestones.map((m, idx) => (
              <span
                key={idx}
                className={cn(
                  "text-[10px]",
                  m.reached ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {m.label}
              </span>
            ))}
          </div>
        ) : (
          <span />
        )}
        <Badge
          variant="outline"
          className={cn(
            "text-xs tabular-nums",
            isOver && overTargetIsBad && "border-destructive/30 bg-destructive/10 text-destructive",
            isOver && !overTargetIsBad && "border-emerald-200 bg-emerald-100 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
            !isOver && "text-muted-foreground"
          )}
        >
          {fmt.format(pctValue)}%
        </Badge>
      </div>
    </div>
  );
}
