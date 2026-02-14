"use client";

import { KPICard } from "@/components/data-display/KPICard";
import type { FleetSummaryKPIs } from "@/types/fleet-overview";

interface FleetKPISummaryProps {
  kpis: FleetSummaryKPIs;
}

export function FleetKPISummary({ kpis }: FleetKPISummaryProps) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
      <KPICard
        title="Veicoli totali"
        value={kpis.totalVehicles}
        suffix={`${kpis.activeVehicles} attivi`}
      />
      <KPICard
        title="Veicoli assegnati"
        value={kpis.assignedVehicles}
        suffix={`${kpis.freeVehicles} liberi`}
      />
      <KPICard
        title="Contratti attivi"
        value={kpis.activeContracts}
        suffix={
          kpis.expiringContracts > 0
            ? `${kpis.expiringContracts} in scadenza`
            : undefined
        }
      />
      <KPICard
        title="Documenti scaduti"
        value={kpis.expiredDocuments}
      />
      <KPICard
        title="Dipendenti"
        value={kpis.activeEmployees}
        suffix={
          kpis.unassignedEmployees > 0
            ? `${kpis.unassignedEmployees} senza veicolo`
            : undefined
        }
      />
    </div>
  );
}
