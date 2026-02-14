"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Fuel,
  Zap,
  Flame,
  Droplets,
  Gauge,
  MoreVertical,
  Pencil,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { deleteFuelRecordAction } from "@/app/(dashboard)/fuel-records/actions/delete-fuel-record";
import type { FuelRecordWithDetails } from "@/lib/services/fuel-record-service";
import type { FuelFeedItem } from "@/lib/services/fuel-record-service";
import type { FuelAnomaly } from "@/lib/services/anomaly-detection-service";

// ---------------------------------------------------------------------------
// Formatting helpers
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

const dateFmt = new Intl.DateTimeFormat("it-IT", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

const shortDateFmt = new Intl.DateTimeFormat("it-IT", {
  day: "2-digit",
  month: "short",
});

// ---------------------------------------------------------------------------
// Fuel type icon helper
// ---------------------------------------------------------------------------

function getFuelIcon(fuelType: string) {
  switch (fuelType) {
    case "ELETTRICO":
      return Zap;
    case "METANO":
    case "GPL":
      return Flame;
    case "IDROGENO":
      return Droplets;
    default:
      return Fuel;
  }
}

function getFuelIconColor(fuelType: string) {
  switch (fuelType) {
    case "ELETTRICO":
      return "text-blue-500";
    case "METANO":
    case "GPL":
      return "text-orange-500";
    case "BENZINA":
      return "text-green-600";
    case "DIESEL":
      return "text-amber-700";
    case "IDROGENO":
      return "text-cyan-500";
    default:
      return "text-muted-foreground";
  }
}

// ---------------------------------------------------------------------------
// Group records by date
// ---------------------------------------------------------------------------

function groupByDate(
  records: FuelRecordWithDetails[]
): Map<string, FuelRecordWithDetails[]> {
  const groups = new Map<string, FuelRecordWithDetails[]>();
  for (const record of records) {
    const dateKey = dateFmt.format(new Date(record.date));
    const existing = groups.get(dateKey) ?? [];
    existing.push(record);
    groups.set(dateKey, existing);
  }
  return groups;
}

function groupFeedByDate(
  items: FuelFeedItem[]
): Map<string, FuelFeedItem[]> {
  const groups = new Map<string, FuelFeedItem[]>();
  for (const item of items) {
    const dateKey = dateFmt.format(new Date(item.date));
    const existing = groups.get(dateKey) ?? [];
    existing.push(item);
    groups.set(dateKey, existing);
  }
  return groups;
}

// ---------------------------------------------------------------------------
// FuelFeed component
// ---------------------------------------------------------------------------

type FuelFeedVariant = "full" | "compact" | "validation";

type FuelFeedProps = {
  records: FuelRecordWithDetails[];
  variant?: FuelFeedVariant;
  canEdit?: boolean;
  showVehicle?: boolean;
  anomalies?: FuelAnomaly[];
  fuelTypeLabels?: Record<string, string>;
};

export function FuelFeed({
  records,
  variant = "full",
  canEdit = false,
  showVehicle = true,
  anomalies,
  fuelTypeLabels = {},
}: FuelFeedProps) {
  const grouped = groupByDate(records);
  const anomalyMap = useMemo(() => {
    if (!anomalies) return new Map<string, FuelAnomaly[]>();
    const map = new Map<string, FuelAnomaly[]>();
    for (const a of anomalies) {
      const existing = map.get(a.fuelRecordId) ?? [];
      existing.push(a);
      map.set(a.fuelRecordId, existing);
    }
    return map;
  }, [anomalies]);

  if (records.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Fuel className="mb-3 h-10 w-10 text-muted-foreground/40" />
        <p className="text-sm font-medium text-muted-foreground">
          Nessun rifornimento registrato
        </p>
        <p className="text-xs text-muted-foreground/70">
          I rifornimenti appariranno qui una volta inseriti.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {Array.from(grouped.entries()).map(([dateLabel, dateRecords]) => (
        <div key={dateLabel}>
          {/* Date header */}
          <div className="mb-3 flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {dateLabel}
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>

          {/* Records for this date */}
          <div className="space-y-2">
            {dateRecords.map((record) => (
              <FuelFeedItemCard
                key={record.id}
                record={record}
                variant={variant}
                canEdit={canEdit}
                showVehicle={showVehicle}
                anomalies={anomalyMap.get(record.id)}
                fuelTypeLabels={fuelTypeLabels}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Unified Feed (FuelRecord + KmReading)
// ---------------------------------------------------------------------------

type UnifiedFuelFeedProps = {
  items: FuelFeedItem[];
  variant?: FuelFeedVariant;
  canEdit?: boolean;
  showVehicle?: boolean;
  anomalies?: FuelAnomaly[];
  fuelTypeLabels?: Record<string, string>;
};

export function UnifiedFuelFeed({
  items,
  variant = "full",
  canEdit = false,
  showVehicle = true,
  anomalies,
  fuelTypeLabels = {},
}: UnifiedFuelFeedProps) {
  const grouped = groupFeedByDate(items);
  const anomalyMap = useMemo(() => {
    if (!anomalies) return new Map<string, FuelAnomaly[]>();
    const map = new Map<string, FuelAnomaly[]>();
    for (const a of anomalies) {
      const existing = map.get(a.fuelRecordId) ?? [];
      existing.push(a);
      map.set(a.fuelRecordId, existing);
    }
    return map;
  }, [anomalies]);

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Fuel className="mb-3 h-10 w-10 text-muted-foreground/40" />
        <p className="text-sm font-medium text-muted-foreground">
          Nessun dato registrato
        </p>
        <p className="text-xs text-muted-foreground/70">
          Rifornimenti e rilevazioni km appariranno qui una volta inseriti.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {Array.from(grouped.entries()).map(([dateLabel, dateItems]) => (
        <div key={dateLabel}>
          {/* Date header */}
          <div className="mb-3 flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {dateLabel}
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>

          {/* Items for this date */}
          <div className="space-y-2">
            {dateItems.map((item) =>
              item.type === "km_reading" ? (
                <KmReadingFeedItem
                  key={`km-${item.id}`}
                  item={item}
                  variant={variant}
                  showVehicle={showVehicle}
                />
              ) : (
                <FuelFeedItemCard
                  key={`fuel-${item.id}`}
                  record={{
                    id: item.id,
                    date: item.date,
                    odometerKm: item.odometerKm,
                    fuelType: item.fuelType,
                    quantityLiters: item.quantityLiters,
                    amountEur: item.amountEur,
                    notes: item.notes,
                    source: item.source,
                    vehicle: item.vehicle,
                  } as unknown as FuelRecordWithDetails}
                  variant={variant}
                  canEdit={canEdit}
                  showVehicle={showVehicle}
                  anomalies={anomalyMap.get(item.id)}
                  fuelTypeLabels={fuelTypeLabels}
                />
              )
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// KmReading feed item
// ---------------------------------------------------------------------------

function KmReadingFeedItem({
  item,
  variant,
  showVehicle,
}: {
  item: Extract<FuelFeedItem, { type: "km_reading" }>;
  variant: FuelFeedVariant;
  showVehicle: boolean;
}) {
  if (variant === "compact") {
    return (
      <div className="flex items-center gap-3 rounded-lg border p-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-indigo-500">
          <Gauge className="h-4 w-4" />
        </div>
        <div className="flex min-w-0 flex-1 items-center justify-between">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">
              Rilevazione km
            </p>
            <p className="text-xs text-muted-foreground">
              {shortDateFmt.format(new Date(item.date))}
            </p>
          </div>
          <span className="shrink-0 text-sm font-semibold tabular-nums">
            {kmFmt.format(item.odometerKm)} km
          </span>
        </div>
      </div>
    );
  }

  // "full" and "validation" variant
  return (
    <div className="group flex items-start gap-3 rounded-lg border bg-card p-4 transition-colors hover:bg-accent/30">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-indigo-500">
        <Gauge className="h-5 w-5" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            {showVehicle && (
              <p className="truncate text-sm font-medium">
                <span className="font-mono uppercase">
                  {item.vehicle.licensePlate}
                </span>
                <span className="ml-2 text-muted-foreground">
                  {item.vehicle.catalogVehicle.marca}{" "}
                  {item.vehicle.catalogVehicle.modello}
                </span>
              </p>
            )}
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="outline" className="text-xs">
                Rilevazione Km
              </Badge>
              <span>{kmFmt.format(item.odometerKm)} km</span>
            </div>
          </div>
        </div>
        {item.notes && (
          <p className="text-xs text-muted-foreground italic">{item.notes}</p>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Individual feed item (fuel record card)
// ---------------------------------------------------------------------------

function FuelFeedItemCard({
  record,
  variant,
  canEdit,
  showVehicle,
  anomalies: recordAnomalies,
  fuelTypeLabels = {},
}: {
  record: FuelRecordWithDetails;
  variant: FuelFeedVariant;
  canEdit: boolean;
  showVehicle: boolean;
  anomalies?: FuelAnomaly[];
  fuelTypeLabels?: Record<string, string>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const Icon = getFuelIcon(record.fuelType);
  const iconColor = getFuelIconColor(record.fuelType);
  const fuelLabel =
    fuelTypeLabels[record.fuelType] ?? record.fuelType;

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteFuelRecordAction(record.id);
      if (result.success) {
        toast.success("Rifornimento eliminato");
        setDeleteDialogOpen(false);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  if (variant === "compact") {
    return (
      <div className="flex items-center gap-3 rounded-lg border p-3">
        <div
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted",
            iconColor
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex min-w-0 flex-1 items-center justify-between">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">
              {numberFmt.format(record.quantityLiters)} L
            </p>
            <p className="text-xs text-muted-foreground">
              {shortDateFmt.format(new Date(record.date))} -{" "}
              {fuelLabel}
            </p>
          </div>
          <span className="shrink-0 text-sm font-semibold">
            {currencyFmt.format(record.amountEur)}
          </span>
        </div>
      </div>
    );
  }

  if (variant === "validation") {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-dashed p-3">
        <div
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted",
            iconColor
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">
              {numberFmt.format(record.quantityLiters)} L {fuelLabel}
            </span>
            <Badge variant="outline" className="text-xs">
              {kmFmt.format(record.odometerKm)} km
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            {currencyFmt.format(record.amountEur)} -{" "}
            {dateFmt.format(new Date(record.date))}
          </p>
        </div>
      </div>
    );
  }

  const hasAnomalies = recordAnomalies && recordAnomalies.length > 0;
  const hasCritical = recordAnomalies?.some((a) => a.severity === "critical");

  // "full" variant
  return (
    <>
      <div
        className={cn(
          "group flex items-start gap-3 rounded-lg border bg-card p-4 transition-colors hover:bg-accent/30",
          hasAnomalies && !hasCritical && "border-amber-400/50",
          hasCritical && "border-destructive/50"
        )}
      >
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted",
            iconColor
          )}
        >
          <Icon className="h-5 w-5" />
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          {/* Top row: vehicle + amount */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              {showVehicle && (
                <p className="truncate text-sm font-medium">
                  <span className="font-mono uppercase">
                    {record.vehicle.licensePlate}
                  </span>
                  <span className="ml-2 text-muted-foreground">
                    {record.vehicle.catalogVehicle.marca}{" "}
                    {record.vehicle.catalogVehicle.modello}
                  </span>
                </p>
              )}
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <Badge variant="secondary" className="text-xs">
                  {fuelLabel}
                </Badge>
                <span>
                  {numberFmt.format(record.quantityLiters)} L
                </span>
                <span className="text-muted-foreground/50">|</span>
                <span>
                  {kmFmt.format(record.odometerKm)} km
                </span>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-1">
              <span className="text-base font-semibold">
                {currencyFmt.format(record.amountEur)}
              </span>
              {canEdit && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 opacity-0 group-hover:opacity-100"
                    >
                      <MoreVertical className="h-4 w-4" />
                      <span className="sr-only">Azioni</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() =>
                        router.push(`/fuel-records/${record.id}/edit`)
                      }
                    >
                      <Pencil className="mr-2 h-4 w-4" />
                      Modifica
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => setDeleteDialogOpen(true)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Elimina
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>

          {/* Notes */}
          {record.notes && (
            <p className="text-xs text-muted-foreground italic">
              {record.notes}
            </p>
          )}

          {/* Anomaly warnings */}
          {recordAnomalies && recordAnomalies.length > 0 && (
            <div className="mt-1 space-y-1">
              {recordAnomalies.map((anomaly, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "flex items-center gap-1.5 rounded px-2 py-1 text-xs",
                    anomaly.severity === "critical"
                      ? "bg-destructive/10 text-destructive"
                      : "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                  )}
                >
                  <AlertTriangle className="h-3 w-3 shrink-0" />
                  <span>{anomaly.message}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare il rifornimento?</AlertDialogTitle>
            <AlertDialogDescription>
              Il rifornimento di {numberFmt.format(record.quantityLiters)} L del{" "}
              {dateFmt.format(new Date(record.date))} verra eliminato
              permanentemente. Questa azione non e reversibile.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isPending ? "Eliminazione..." : "Elimina"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
