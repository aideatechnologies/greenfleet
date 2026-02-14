"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft } from "lucide-react";
import { formatTankCapacity } from "@/lib/utils/format";
import { EngineCard } from "./EngineCard";
import type { CatalogVehicleWithEngines } from "@/lib/services/catalog-service";

type CatalogVehicleDetailProps = {
  vehicle: CatalogVehicleWithEngines;
};

export function CatalogVehicleDetail({ vehicle }: CatalogVehicleDetailProps) {
  return (
    <div className="space-y-6">
      {/* Navigazione indietro */}
      <Button variant="ghost" size="sm" asChild>
        <Link href="/vehicles/catalog">
          <ArrowLeft className="mr-1.5 size-4" />
          Torna al catalogo
        </Link>
      </Button>

      {/* Titolo */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          {vehicle.marca} {vehicle.modello}
        </h2>
        {vehicle.allestimento && (
          <p className="text-muted-foreground">{vehicle.allestimento}</p>
        )}
      </div>

      {/* Layout 2 colonne */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Colonna sinistra: Dati identificativi + tecnici */}
        <div className="space-y-6">
          {/* Dati identificativi */}
          <Card>
            <CardHeader>
              <CardTitle>Dati identificativi</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <DetailRow label="Marca" value={vehicle.marca} />
                <DetailRow label="Modello" value={vehicle.modello} />
                <DetailRow
                  label="Allestimento"
                  value={vehicle.allestimento}
                />
                <DetailRow
                  label="Carrozzeria"
                  value={vehicle.carrozzeria}
                />
                <DetailRow
                  label="Codice allestimento"
                  value={vehicle.codiceAllestimento}
                />
                <DetailRow
                  label="Codice InfocarData"
                  value={vehicle.codiceInfocarData}
                />
                <DetailRow label="Fonte" value={vehicle.source} />
                {vehicle.annoImmatricolazione && (
                  <DetailRow
                    label="Anno immatricolazione"
                    value={String(vehicle.annoImmatricolazione)}
                  />
                )}
              </dl>
            </CardContent>
          </Card>

          {/* Dati tecnici */}
          <Card>
            <CardHeader>
              <CardTitle>Dati tecnici</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <DetailRow
                  label="Normativa"
                  value={
                    vehicle.normativa ? (
                      <Badge variant="secondary">{vehicle.normativa}</Badge>
                    ) : null
                  }
                />
                <DetailRow
                  label="Ibrido"
                  value={vehicle.isHybrid ? "Si" : "No"}
                />
                <DetailRow
                  label="Capacita serbatoio"
                  value={
                    vehicle.capacitaSerbatoioL
                      ? formatTankCapacity(vehicle.capacitaSerbatoioL)
                      : null
                  }
                />
              </dl>
            </CardContent>
          </Card>
        </div>

        {/* Colonna destra: Motori */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">
              Motorizzazioni ({vehicle.engines.length})
            </h3>
          </div>
          <Separator />
          {vehicle.engines.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">
              Nessuna motorizzazione disponibile
            </p>
          ) : (
            <div className="space-y-4">
              {vehicle.engines.map((engine) => (
                <EngineCard key={engine.id} engine={engine} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Riga dettaglio generica
// ---------------------------------------------------------------------------

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode | string | null | undefined;
}) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value ?? "-"}</dd>
    </>
  );
}
