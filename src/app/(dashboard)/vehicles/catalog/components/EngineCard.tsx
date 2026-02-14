"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  formatDisplacement,
  formatPower,
  formatPowerCv,
  formatEmissions,
  formatConsumption,
} from "@/lib/utils/format";
import type { Engine } from "@/generated/prisma/client";

type EngineCardProps = {
  engine: Engine;
  fuelTypeLabels?: Record<string, string>;
};

// ---------------------------------------------------------------------------
// Colore badge in base al tipo di carburante
// ---------------------------------------------------------------------------

function fuelBadgeClasses(fuelType: string): string {
  switch (fuelType) {
    case "ELETTRICO":
      return "bg-emerald-100 text-emerald-800 border-emerald-200";
    case "IBRIDO_BENZINA":
    case "IBRIDO_DIESEL":
      return "bg-sky-100 text-sky-800 border-sky-200";
    case "DIESEL":
      return "bg-amber-100 text-amber-800 border-amber-200";
    case "BENZINA":
      return "bg-red-100 text-red-800 border-red-200";
    case "GPL":
    case "BIFUEL_BENZINA_GPL":
      return "bg-violet-100 text-violet-800 border-violet-200";
    case "METANO":
    case "BIFUEL_BENZINA_METANO":
      return "bg-teal-100 text-teal-800 border-teal-200";
    case "IDROGENO":
      return "bg-cyan-100 text-cyan-800 border-cyan-200";
    default:
      return "bg-secondary text-secondary-foreground";
  }
}

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

export function EngineCard({ engine, fuelTypeLabels = {} }: EngineCardProps) {
  const fuelLabel =
    fuelTypeLabels[engine.fuelType] ?? engine.fuelType;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">
            {engine.nucmot ? `Motore ${engine.nucmot}` : "Motorizzazione"}
          </CardTitle>
          <Badge
            variant="outline"
            className={fuelBadgeClasses(engine.fuelType)}
          >
            {fuelLabel}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          {engine.cilindrata && (
            <>
              <dt className="text-muted-foreground">Cilindrata</dt>
              <dd className="font-medium tabular-nums">
                {formatDisplacement(engine.cilindrata)}
              </dd>
            </>
          )}

          {engine.potenzaKw && (
            <>
              <dt className="text-muted-foreground">Potenza</dt>
              <dd className="font-medium tabular-nums">
                {formatPower(engine.potenzaKw)}
                {engine.potenzaCv && (
                  <span className="text-muted-foreground ml-1">
                    ({formatPowerCv(engine.potenzaCv)})
                  </span>
                )}
              </dd>
            </>
          )}

          {engine.co2GKm != null && (
            <>
              <dt className="text-muted-foreground">
                Emissioni CO2{" "}
                <span className="text-xs">({engine.co2Standard})</span>
              </dt>
              <dd className="font-medium tabular-nums">
                {formatEmissions(engine.co2GKm)}
              </dd>
            </>
          )}

          {engine.consumptionL100Km != null && (
            <>
              <dt className="text-muted-foreground">Consumo</dt>
              <dd className="font-medium tabular-nums">
                {formatConsumption(engine.consumptionL100Km)}
              </dd>
            </>
          )}
        </dl>
      </CardContent>
    </Card>
  );
}
