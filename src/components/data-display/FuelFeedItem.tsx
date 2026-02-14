"use client";

import Link from "next/link";
import { Fuel, Zap, Flame, Droplets } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/data-display/StatusBadge";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FuelFeedItemData {
  id: string;
  vehiclePlate: string;
  vehicleId?: string;
  fuelType: string;
  quantity: number;
  amount: number;
  km: number;
  date: string | Date;
  status: "validated" | "pending" | "anomaly" | "manual";
  notes?: string;
  supplier?: string;
}

interface FuelFeedItemProps {
  item: FuelFeedItemData;
  /** Whether to show the expanded detail inline */
  expanded?: boolean;
  /** Callback on item click to toggle expansion */
  onToggle?: (id: string) => void;
  /** Additional CSS classes */
  className?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const numberFmt = new Intl.NumberFormat("it-IT", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const currencyFmt = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR",
});

const kmFmt = new Intl.NumberFormat("it-IT");

const dateTimeFmt = new Intl.DateTimeFormat("it-IT", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function getFuelIcon(fuelType: string) {
  const ft = fuelType.toLowerCase();
  if (ft === "elettrico" || ft.includes("electric")) return Zap;
  if (ft === "metano" || ft === "gpl" || ft.includes("gas")) return Flame;
  if (ft === "idrogeno" || ft.includes("hydrogen")) return Droplets;
  return Fuel;
}

function getFuelIconColor(fuelType: string): string {
  const ft = fuelType.toLowerCase();
  if (ft === "elettrico" || ft.includes("electric")) return "text-fuel-elettrico";
  if (ft === "metano") return "text-fuel-metano";
  if (ft === "gpl") return "text-fuel-gpl";
  if (ft === "benzina") return "text-fuel-benzina";
  if (ft === "diesel") return "text-fuel-diesel";
  if (ft.includes("ibrid")) return "text-fuel-ibrido";
  return "text-muted-foreground";
}

const STATUS_MAP: Record<
  FuelFeedItemData["status"],
  { label: string; variant: "success" | "warning" | "destructive" | "info" }
> = {
  validated: { label: "Validato", variant: "success" },
  pending: { label: "Da validare", variant: "warning" },
  anomaly: { label: "Anomalia", variant: "destructive" },
  manual: { label: "Manuale", variant: "info" },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * FuelFeedItem - A single item in the fuel feed.
 *
 * Shows fuel type icon, license plate, quantity, amount, date, and status badge.
 * Can be expanded inline to show additional details (km, notes, supplier).
 */
export function FuelFeedItem({
  item,
  expanded = false,
  onToggle,
  className,
}: FuelFeedItemProps) {
  const Icon = getFuelIcon(item.fuelType);
  const iconColor = getFuelIconColor(item.fuelType);
  const statusConfig = STATUS_MAP[item.status];
  const dateStr = dateTimeFmt.format(
    typeof item.date === "string" ? new Date(item.date) : item.date
  );

  return (
    <div
      role="article"
      aria-label={`Rifornimento ${item.vehiclePlate} - ${numberFmt.format(item.quantity)} L`}
      className={cn(
        "rounded-lg border bg-card transition-colors",
        expanded ? "bg-accent/20" : "hover:bg-accent/30",
        className
      )}
    >
      {/* Main row */}
      <button
        type="button"
        onClick={() => onToggle?.(item.id)}
        className="flex w-full items-center gap-3 p-3 text-left"
      >
        {/* Fuel icon */}
        <div
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-full bg-muted",
            iconColor
          )}
        >
          <Icon className="size-5" />
        </div>

        {/* Content */}
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="flex items-center gap-2">
            {/* Plate */}
            {item.vehicleId ? (
              <Link
                href={`/vehicles/${item.vehicleId}`}
                onClick={(e) => e.stopPropagation()}
                className="text-mono text-primary hover:underline"
              >
                {item.vehiclePlate}
              </Link>
            ) : (
              <span className="text-mono">{item.vehiclePlate}</span>
            )}
            <StatusBadge
              label={statusConfig.label}
              variant={statusConfig.variant}
              size="sm"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="secondary" className="text-[10px]">
              {item.fuelType}
            </Badge>
            <span>{numberFmt.format(item.quantity)} L</span>
            <span className="text-muted-foreground/50">|</span>
            <span>{dateStr}</span>
          </div>
        </div>

        {/* Amount */}
        <span className="shrink-0 text-sm font-semibold tabular-nums">
          {currencyFmt.format(item.amount)}
        </span>
      </button>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t px-3 pb-3 pt-2">
          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
            <div>
              <span className="font-medium text-foreground">Km: </span>
              {kmFmt.format(item.km)}
            </div>
            {item.supplier && (
              <div>
                <span className="font-medium text-foreground">Fornitore: </span>
                {item.supplier}
              </div>
            )}
            {item.notes && (
              <div>
                <span className="font-medium text-foreground">Note: </span>
                {item.notes}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
