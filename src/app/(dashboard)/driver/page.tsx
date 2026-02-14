import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Route, Leaf, Fuel } from "lucide-react";
import { Car } from "lucide-react";

import { getSessionContext, isDriver } from "@/lib/auth/permissions";
import { prisma, getPrismaForTenant } from "@/lib/db/client";
import { getDriverDashboardData } from "@/lib/services/driver-dashboard-service";
import { formatNumber } from "@/lib/utils/format";

import { VehicleHeader } from "@/components/data-display/VehicleHeader";
import { EmptyState } from "@/components/data-display/EmptyState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { DocumentStatusList } from "./components/DocumentStatusList";
import { ContractSummary } from "./components/ContractSummary";

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export const metadata = {
  title: "Dashboard Personale | Greenfleet",
  description: "Dashboard personale del conducente",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const dateFormatter = new Intl.DateTimeFormat("it-IT", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const currencyFormatter = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR",
});

function formatEmissionsValue(kgCO2e: number): string {
  if (kgCO2e >= 1000) {
    return `${formatNumber(kgCO2e / 1000, 2)} tCO2e`;
  }
  return `${formatNumber(kgCO2e, 1)} kgCO2e`;
}

function mapVehicleStatus(
  status: string
): "attivo" | "manutenzione" | "dismesso" {
  switch (status) {
    case "ACTIVE":
      return "attivo";
    case "INACTIVE":
      return "manutenzione";
    case "DISPOSED":
      return "dismesso";
    default:
      return "attivo";
  }
}

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default async function DriverDashboardPage() {
  const ctx = await getSessionContext();
  if (!ctx) {
    redirect("/login");
  }

  // Only drivers (member role) should access this page
  if (!isDriver(ctx)) {
    redirect("/");
  }

  if (!ctx.organizationId) {
    redirect("/login?error=no_organization");
  }

  const tenantPrisma = getPrismaForTenant(ctx.organizationId);
  const data = await getDriverDashboardData(prisma, tenantPrisma, ctx.userId);

  // No vehicle assigned
  if (!data) {
    return (
      <div className="pb-16 md:pb-0">
        <h1 className="mb-6 text-2xl font-bold">La mia Dashboard</h1>
        <EmptyState
          variant="info"
          icon={Car}
          title="Nessun veicolo assegnato"
          description="Al momento non hai nessun veicolo assegnato. Contatta il Fleet Manager per maggiori informazioni."
        />
      </div>
    );
  }

  const { vehicle, kpis } = data;
  const cv = vehicle.catalogVehicle;

  return (
    <div className="space-y-6 pb-16 md:pb-0">
      <h1 className="text-2xl font-bold">La mia Dashboard</h1>

      {/* Vehicle Header — read-only, no actions */}
      <Suspense fallback={null}>
        <VehicleHeader
          vehicle={{
            id: vehicle.id,
            marca: cv.marca,
            modello: cv.modello,
            allestimento: cv.allestimento,
            targa: vehicle.licensePlate,
            codiceAllestimento: cv.codiceAllestimento,
            annoImmatricolazione: cv.annoImmatricolazione,
            imageUrl: cv.imageUrl,
          }}
          engine={vehicle.engine}
          status={mapVehicleStatus(vehicle.status)}
          assignedEmployee={vehicle.assignedEmployee}
          actions={undefined}
        />
      </Suspense>

      {/* KPI Cards — 3 columns desktop, 2 tablet, 1 mobile */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {/* KPI: Km percorsi (mese) */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Route className="h-4 w-4" />
              Km percorsi (mese)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums">
              {kpis.kmThisMonth != null
                ? `${formatNumber(kpis.kmThisMonth)} km`
                : "-"}
            </p>
            {kpis.kmThisMonth == null && (
              <p className="text-xs text-muted-foreground">
                Dati insufficienti per il calcolo
              </p>
            )}
          </CardContent>
        </Card>

        {/* KPI: Emissioni personali (mese) */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Leaf className="h-4 w-4" />
              Emissioni personali (mese)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums">
              {kpis.emissionsThisMonthKg != null
                ? formatEmissionsValue(kpis.emissionsThisMonthKg)
                : "-"}
            </p>
            {kpis.emissionsThisMonthKg == null && (
              <p className="text-xs text-muted-foreground">
                Nessun rifornimento registrato questo mese
              </p>
            )}
          </CardContent>
        </Card>

        {/* KPI: Ultimo rifornimento */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Fuel className="h-4 w-4" />
              Ultimo rifornimento
            </CardTitle>
          </CardHeader>
          <CardContent>
            {kpis.lastFuelRecord ? (
              <div className="space-y-1">
                <p className="text-2xl font-bold tabular-nums">
                  {formatNumber(kpis.lastFuelRecord.quantityLiters, 1)} L
                </p>
                <p className="text-sm text-muted-foreground">
                  {dateFormatter.format(new Date(kpis.lastFuelRecord.date))}
                  {" \u00B7 "}
                  {currencyFormatter.format(kpis.lastFuelRecord.amountEur)}
                </p>
              </div>
            ) : (
              <>
                <p className="text-2xl font-bold">-</p>
                <p className="text-xs text-muted-foreground">
                  Nessun rifornimento registrato
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Documents + Contract — 2 columns on desktop, stacked on mobile */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <DocumentStatusList documents={vehicle.documents} />
        <ContractSummary contracts={vehicle.contracts} />
      </div>
    </div>
  );
}
