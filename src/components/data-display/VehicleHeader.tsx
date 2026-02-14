"use client";

import Link from "next/link";
import { Fuel, Calendar, Route, Leaf, User } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatNumber, formatDisplacement, formatPower } from "@/lib/utils/format";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface VehicleData {
  id: string;
  marca: string;
  modello: string;
  allestimento?: string | null;
  targa?: string | null;
  codiceAllestimento?: string | null;
  annoImmatricolazione?: number | null;
  imageUrl?: string | null;
}

interface EngineData {
  fuelType: string;
  cilindrata?: number | null;
  potenzaKw?: number | null;
  potenzaCv?: number | null;
}

interface AssignedEmployee {
  id: string;
  firstName: string;
  lastName: string;
}

interface VehicleKpi {
  emissionsTco2eYtd?: number | null;
  kmPercorsi?: number | null;
  contractType?: string | null;
  contractExpires?: string | null;
}

export interface VehicleHeaderProps {
  /** Dati principali del veicolo */
  vehicle: VehicleData;
  /** Dati motore (opzionale, se disponibile) */
  engine?: EngineData | null;
  /** Stato operativo del veicolo */
  status?: "attivo" | "manutenzione" | "dismesso";
  /** Dipendente assegnato (opzionale) */
  assignedEmployee?: AssignedEmployee | null;
  /** KPI operativi (opzionale) */
  kpi?: VehicleKpi | null;
  /** Slot per azioni aggiuntive (es. DropdownMenu) */
  actions?: React.ReactNode;
  /** Classe CSS aggiuntiva per il container */
  className?: string;
}

// ---------------------------------------------------------------------------
// Sotto-componenti interni
// ---------------------------------------------------------------------------

const STATUS_CONFIG = {
  attivo: {
    label: "Attivo",
    className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  },
  manutenzione: {
    label: "Manutenzione",
    className: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  },
  dismesso: {
    label: "Dismesso",
    className: "bg-gray-100 text-gray-600 dark:bg-gray-800/30 dark:text-gray-400",
  },
} as const;

function StatusBadge({ status }: { status: "attivo" | "manutenzione" | "dismesso" }) {
  const config = STATUS_CONFIG[status];
  return (
    <Badge variant="outline" className={cn("border-transparent", config.className)}>
      {config.label}
    </Badge>
  );
}

function VehicleImage({ vehicle }: { vehicle: VehicleData }) {
  const imageUrl = vehicle.imageUrl ?? buildImageUrl(vehicle);
  const altText = [vehicle.marca, vehicle.modello, vehicle.allestimento]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="relative h-[120px] w-[160px] shrink-0 overflow-hidden rounded-lg bg-muted">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imageUrl ?? "/images/vehicle-placeholder.svg"}
        alt={altText || "Veicolo"}
        loading="lazy"
        className="h-full w-full object-cover"
        onError={(e) => {
          const target = e.currentTarget;
          if (target.src !== window.location.origin + "/images/vehicle-placeholder.svg") {
            target.src = "/images/vehicle-placeholder.svg";
          }
        }}
      />
    </div>
  );
}

function buildImageUrl(vehicle: VehicleData): string | null {
  if (!vehicle.codiceAllestimento || !vehicle.annoImmatricolazione) {
    return null;
  }
  // Converte l'anno di immatricolazione in formato YYYY-MM (default mese 01)
  const year = vehicle.annoImmatricolazione;
  const dateParam = `${year}-01`;
  return `/api/images/vehicle/${encodeURIComponent(vehicle.codiceAllestimento)}?date=${dateParam}`;
}

function EngineSummary({ engine }: { engine: EngineData }) {
  const parts: string[] = [engine.fuelType];

  if (engine.cilindrata) {
    parts.push(formatDisplacement(engine.cilindrata));
  }

  if (engine.potenzaCv) {
    parts.push(`${formatNumber(engine.potenzaCv)} CV`);
  } else if (engine.potenzaKw) {
    parts.push(formatPower(engine.potenzaKw));
  }

  return (
    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
      <Fuel className="h-3.5 w-3.5 shrink-0" />
      <span>{parts.join(" \u00B7 ")}</span>
    </div>
  );
}

function KpiItem({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Componente principale
// ---------------------------------------------------------------------------

/**
 * VehicleHeader - Componente condiviso per l'intestazione veicolo.
 *
 * Layout CSS Grid a 3 colonne:
 * - Sinistra: foto veicolo (160x120px) dal servizio Codall o placeholder
 * - Centro: dati chiave (targa, marca/modello, stato, dipendente, motore)
 * - Destra: KPI operativi (emissioni, km, contratto)
 *
 * Responsive: su mobile il layout diventa stacked verticale.
 */
export function VehicleHeader({
  vehicle,
  engine,
  status,
  assignedEmployee,
  kpi,
  actions,
  className,
}: VehicleHeaderProps) {
  return (
    <Card className={cn("py-4", className)}>
      <CardContent className="px-4 sm:px-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[160px_1fr] lg:grid-cols-[160px_1fr_200px]">
          {/* Colonna sinistra: foto veicolo */}
          <div className="flex justify-center md:justify-start">
            <VehicleImage vehicle={vehicle} />
          </div>

          {/* Colonna centrale: dati chiave */}
          <div className="flex min-w-0 flex-col gap-2">
            {/* Riga titolo con azioni */}
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                {vehicle.targa && (
                  <p className="mb-0.5 font-mono text-lg font-bold uppercase tracking-wider">
                    {vehicle.targa}
                  </p>
                )}
                <h2 className="truncate text-base font-semibold leading-tight">
                  {vehicle.marca} {vehicle.modello}
                  {vehicle.allestimento && (
                    <span className="font-normal text-muted-foreground">
                      {" "}
                      {vehicle.allestimento}
                    </span>
                  )}
                </h2>
              </div>
              {actions && <div className="shrink-0">{actions}</div>}
            </div>

            {/* Badge stato */}
            {status && <StatusBadge status={status} />}

            {/* Dipendente assegnato */}
            {assignedEmployee && (
              <div className="flex items-center gap-1.5 text-sm">
                <User className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <Link
                  href={`/employees/${assignedEmployee.id}`}
                  className="text-primary hover:underline"
                >
                  {assignedEmployee.firstName} {assignedEmployee.lastName}
                </Link>
              </div>
            )}

            {/* Motore */}
            {engine && <EngineSummary engine={engine} />}
          </div>

          {/* Colonna destra: KPI sidebar */}
          {kpi && (
            <div className="flex flex-row flex-wrap gap-4 border-t pt-4 md:flex-row lg:flex-col lg:gap-3 lg:border-l lg:border-t-0 lg:pl-4 lg:pt-0">
              {kpi.emissionsTco2eYtd != null && (
                <KpiItem
                  icon={Leaf}
                  label="Emissioni YTD"
                  value={`${formatNumber(kpi.emissionsTco2eYtd, 1)} tCO2e`}
                />
              )}
              {kpi.kmPercorsi != null && (
                <KpiItem
                  icon={Route}
                  label="Km percorsi"
                  value={`${formatNumber(kpi.kmPercorsi)} km`}
                />
              )}
              {kpi.contractType && (
                <KpiItem
                  icon={Calendar}
                  label="Contratto"
                  value={
                    kpi.contractExpires
                      ? `${kpi.contractType} (scade ${kpi.contractExpires})`
                      : kpi.contractType
                  }
                />
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Skeleton loader
// ---------------------------------------------------------------------------

/** Skeleton loader per il VehicleHeader (da usare durante il caricamento) */
export function VehicleHeaderSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn("py-4", className)}>
      <CardContent className="px-4 sm:px-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[160px_1fr] lg:grid-cols-[160px_1fr_200px]">
          <Skeleton className="h-[120px] w-[160px] rounded-lg" />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-4 w-36" />
          </div>
          <div className="flex flex-col gap-3 lg:border-l lg:pl-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
