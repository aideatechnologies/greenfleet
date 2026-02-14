"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { TenantVehicleForm } from "../components/TenantVehicleForm";
import { CatalogVehicleSelector } from "../components/CatalogVehicleSelector";
import type { CatalogVehicleWithEngines } from "@/lib/services/catalog-service";
import { UNCATALOGED_VEHICLE_ID } from "@/lib/utils/constants";

export function AddVehicleFlow() {
  const [selectedVehicle, setSelectedVehicle] =
    useState<CatalogVehicleWithEngines | null>(null);

  const catalogVehicleId = selectedVehicle?.id ?? UNCATALOGED_VEHICLE_ID;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link
          href="/vehicles"
          className="hover:text-foreground transition-colors"
        >
          Veicoli
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground">Aggiungi veicolo</span>
      </nav>

      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          Aggiungi veicolo
        </h2>
        <p className="text-muted-foreground">
          Compila i dati operativi del veicolo. L&apos;associazione a un modello
          da catalogo è opzionale.
        </p>
      </div>

      {/* Step 1: Dati operativi (sempre visibile) */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="flex size-6 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
            1
          </span>
          <h3 className="text-lg font-semibold">Dati operativi</h3>
        </div>
        <TenantVehicleForm catalogVehicleId={catalogVehicleId} />
      </div>

      {/* Step 2: Associa modello da catalogo (opzionale) */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span
            className={`flex size-6 items-center justify-center rounded-full text-xs font-semibold ${
              selectedVehicle
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            }`}
          >
            2
          </span>
          <h3 className="text-lg font-semibold">
            Modello da catalogo{" "}
            <span className="text-sm font-normal text-muted-foreground">
              (opzionale)
            </span>
          </h3>
        </div>
        <CatalogVehicleSelector
          onSelect={setSelectedVehicle}
          selectedVehicle={selectedVehicle}
          onClear={() => setSelectedVehicle(null)}
        />
      </div>
    </div>
  );
}
