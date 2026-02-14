"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Variant definitions
// ---------------------------------------------------------------------------

export type StatusBadgeVariant =
  | "success"
  | "warning"
  | "destructive"
  | "secondary"
  | "default"
  | "outline"
  | "info";

export type StatusBadgeDomain =
  | "matching"
  | "document"
  | "contract"
  | "vehicle";

const VARIANT_CLASSES: Record<StatusBadgeVariant, string> = {
  success:
    "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800",
  warning:
    "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800",
  destructive:
    "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800",
  secondary:
    "bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800/30 dark:text-gray-400 dark:border-gray-700",
  default:
    "bg-primary/10 text-primary border-primary/20",
  outline:
    "bg-transparent border-border text-foreground",
  info:
    "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800",
};

const DOT_COLORS: Record<StatusBadgeVariant, string> = {
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  destructive: "bg-red-500",
  secondary: "bg-gray-400",
  default: "bg-primary",
  outline: "bg-foreground/50",
  info: "bg-blue-500",
};

// ---------------------------------------------------------------------------
// Domain-based status mapping
// ---------------------------------------------------------------------------

/**
 * Maps domain + status string to a badge variant.
 * This centralizes all status-to-variant logic.
 */
function resolveVariantFromDomain(
  domain: StatusBadgeDomain,
  status: string
): StatusBadgeVariant {
  const s = status.toLowerCase();

  switch (domain) {
    case "matching":
      if (s === "validato" || s === "validated") return "success";
      if (s === "da validare" || s === "pending") return "warning";
      if (s === "anomalia" || s === "anomaly") return "destructive";
      return "secondary";

    case "document":
      if (s === "ok" || s === "valido") return "success";
      if (s.startsWith("scade tra") || s === "in scadenza") return "warning";
      if (s === "scaduto" || s === "expired") return "destructive";
      return "secondary";

    case "contract":
      if (s === "attivo" || s === "active") return "success";
      if (s.startsWith("scade tra") || s === "in scadenza") return "warning";
      if (s === "scaduto" || s === "expired") return "destructive";
      return "secondary";

    case "vehicle":
      if (s === "attivo" || s === "active") return "success";
      if (s === "manutenzione" || s === "maintenance") return "warning";
      if (s === "dismesso" || s === "decommissioned") return "secondary";
      return "secondary";

    default:
      return "secondary";
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface StatusBadgeProps {
  /** Display text for the badge */
  label: string;
  /** Explicit variant override (takes precedence over domain resolution) */
  variant?: StatusBadgeVariant;
  /** Domain for automatic variant resolution based on status label */
  domain?: StatusBadgeDomain;
  /** Status string for domain-based resolution (defaults to label if not provided) */
  status?: string;
  /** Badge size */
  size?: "sm" | "md";
  /** Show colored dot indicator */
  showDot?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * StatusBadge - A shared, styled badge component for displaying status values.
 *
 * Can be used in two modes:
 * 1. Explicit variant: `<StatusBadge label="Attivo" variant="success" />`
 * 2. Domain-based: `<StatusBadge label="Attivo" domain="vehicle" />`
 *    (variant is automatically resolved from domain + label)
 *
 * The dot indicator provides a color-independent visual cue for accessibility.
 */
export function StatusBadge({
  label,
  variant,
  domain,
  status,
  size = "md",
  showDot = true,
  className,
}: StatusBadgeProps) {
  // Resolve the effective variant
  const effectiveVariant =
    variant ?? (domain ? resolveVariantFromDomain(domain, status ?? label) : "default");

  return (
    <Badge
      variant="outline"
      role="status"
      className={cn(
        "border font-medium",
        size === "sm" && "px-1.5 py-0 text-[10px]",
        VARIANT_CLASSES[effectiveVariant],
        className
      )}
    >
      {showDot && (
        <svg
          className={cn("mr-1 size-2 shrink-0", size === "sm" && "size-1.5")}
          viewBox="0 0 8 8"
          aria-hidden="true"
        >
          <circle
            cx="4"
            cy="4"
            r="4"
            className={DOT_COLORS[effectiveVariant]}
            fill="currentColor"
          />
        </svg>
      )}
      {label}
    </Badge>
  );
}
