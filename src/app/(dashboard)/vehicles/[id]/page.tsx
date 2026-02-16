import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSessionContext, isTenantAdmin } from "@/lib/auth/permissions";
import { getPrismaForTenant } from "@/lib/db/client";
import { getTenantVehicleById } from "@/lib/services/tenant-vehicle-service";
import {
  getCurrentAssignment,
  getAssignmentHistory,
} from "@/lib/services/assignment-service";
import { getPlateHistory } from "@/lib/services/license-plate-service";
import { getContractsByVehicle } from "@/lib/services/contract-service";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ChevronRight, Car, Plus } from "lucide-react";
import {
  VehicleStatus,
  VEHICLE_STATUS_LABELS,
} from "@/types/vehicle";
import { getFuelTypeLabels } from "@/lib/utils/fuel-type-label";
import {
  formatEmissions,
  formatPower,
  formatPowerCv,
  formatConsumption,
  formatDisplacement,
  formatTankCapacity,
} from "@/lib/utils/format";
import { UNCATALOGED_VEHICLE_ID } from "@/lib/utils/constants";
import { VehicleEditSection } from "./VehicleEditSection";
import { AssignmentPanel } from "../components/AssignmentPanel";
import { AssignmentHistory } from "../components/AssignmentHistory";
import { PlateHistoryPanel } from "../components/PlateHistoryPanel";
import { PlateHistoryList } from "../components/PlateHistoryList";
import { ContractTimeline } from "../../contracts/components/ContractTimeline";
import { DocumentTab } from "./components/DocumentTab";

export default async function VehicleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: rawId } = await params;
  const id = Number(rawId);
  if (Number.isNaN(id)) notFound();

  const ctx = await getSessionContext();
  if (!ctx || !ctx.organizationId) {
    redirect("/login");
  }

  const tenantId = ctx.organizationId;
  const canEdit = await isTenantAdmin(ctx, tenantId);
  const prisma = getPrismaForTenant(tenantId);
  const vehicle = await getTenantVehicleById(prisma, id);

  if (!vehicle) {
    notFound();
  }

  // Fetch assignment, plate history, contract data, and fuel type labels in parallel
  const [
    currentAssignmentData,
    assignmentHistoryData,
    plateHistoryData,
    contractsData,
    fuelTypeLabelsMap,
  ] = await Promise.all([
    getCurrentAssignment(prisma, id),
    getAssignmentHistory(prisma, id),
    getPlateHistory(prisma, id),
    getContractsByVehicle(prisma, id),
    getFuelTypeLabels(),
  ]);

  const catalog = vehicle.catalogVehicle;
  const isUncataloged = vehicle.catalogVehicleId === UNCATALOGED_VEHICLE_ID;
  const status = vehicle.status as VehicleStatus;

  function statusBadgeClasses(s: string): string {
    switch (s) {
      case VehicleStatus.ACTIVE:
        return "bg-green-600 hover:bg-green-600/90";
      case VehicleStatus.INACTIVE:
        return "bg-amber-100 text-amber-700 hover:bg-amber-100/90";
      case VehicleStatus.DISPOSED:
        return "bg-red-100 text-red-700 hover:bg-red-100/90";
      default:
        return "";
    }
  }

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
        <span className="text-foreground">
          {vehicle.licensePlate}
        </span>
      </nav>

      {/* Vehicle Header */}
      <div className="flex items-start gap-4">
        <div className="flex size-20 shrink-0 items-center justify-center rounded-lg bg-muted">
          {!isUncataloged && catalog.imageUrl ? (
            <img
              src={catalog.imageUrl}
              alt={`${catalog.marca} ${catalog.modello}`}
              className="size-20 rounded-lg object-cover"
            />
          ) : (
            <Car className="size-10 text-muted-foreground" />
          )}
        </div>
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-3">
            <h2 className="font-mono text-2xl font-bold uppercase tracking-wider">
              {vehicle.licensePlate}
            </h2>
            <Badge
              variant={
                status === VehicleStatus.ACTIVE ? "default" : "secondary"
              }
              className={statusBadgeClasses(status)}
            >
              {VEHICLE_STATUS_LABELS[status] ?? status}
            </Badge>
          </div>
          {isUncataloged ? (
            <p className="text-sm text-muted-foreground italic">
              Nessun modello da catalogo associato
            </p>
          ) : (
            <>
              <p className="text-lg text-muted-foreground">
                {catalog.marca} {catalog.modello}
              </p>
              {catalog.allestimento && (
                <p className="text-sm text-muted-foreground">
                  {catalog.allestimento}
                </p>
              )}
            </>
          )}
        </div>
      </div>

      <Separator />

      <div className={`grid gap-6 ${isUncataloged ? "" : "lg:grid-cols-2"}`}>
        {/* Technical Data (read-only from catalog) — hidden for uncataloged */}
        {!isUncataloged && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Dati tecnici (catalogo)</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                  <dt className="text-muted-foreground">Marca</dt>
                  <dd className="font-medium">{catalog.marca}</dd>
                  <dt className="text-muted-foreground">Modello</dt>
                  <dd className="font-medium">{catalog.modello}</dd>
                  {catalog.allestimento && (
                    <>
                      <dt className="text-muted-foreground">Allestimento</dt>
                      <dd className="font-medium">{catalog.allestimento}</dd>
                    </>
                  )}
                  {catalog.carrozzeria && (
                    <>
                      <dt className="text-muted-foreground">Carrozzeria</dt>
                      <dd className="font-medium">{catalog.carrozzeria}</dd>
                    </>
                  )}
                  {catalog.normativa && (
                    <>
                      <dt className="text-muted-foreground">Normativa</dt>
                      <dd>
                        <Badge variant="secondary">{catalog.normativa}</Badge>
                      </dd>
                    </>
                  )}
                  {catalog.capacitaSerbatoioL != null && (
                    <>
                      <dt className="text-muted-foreground">
                        Capacita serbatoio
                      </dt>
                      <dd className="font-medium">
                        {formatTankCapacity(catalog.capacitaSerbatoioL)}
                      </dd>
                    </>
                  )}
                </dl>
              </CardContent>
            </Card>

            {/* Engines */}
            {catalog.engines.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>
                    Motorizzazioni ({catalog.engines.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {catalog.engines.map((engine) => {
                    const fuelLabel =
                      fuelTypeLabelsMap.get(engine.fuelType) ??
                      engine.fuelType;
                    return (
                      <div key={engine.id} className="space-y-2 rounded-lg border p-3">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">
                            {engine.nucmot
                              ? `Motore ${engine.nucmot}`
                              : "Motorizzazione"}
                          </span>
                          <Badge variant="outline">{fuelLabel}</Badge>
                        </div>
                        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                          {engine.cilindrata && (
                            <>
                              <dt className="text-muted-foreground">
                                Cilindrata
                              </dt>
                              <dd className="font-medium tabular-nums">
                                {formatDisplacement(engine.cilindrata)}
                              </dd>
                            </>
                          )}
                          {engine.potenzaKw != null && (
                            <>
                              <dt className="text-muted-foreground">Potenza</dt>
                              <dd className="font-medium tabular-nums">
                                {formatPower(engine.potenzaKw)}
                                {engine.potenzaCv != null && (
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
                                CO2 ({engine.co2Standard})
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
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Operational Data (editable) */}
        <div className="space-y-6">
          <VehicleEditSection vehicle={vehicle} canEdit={canEdit} />
          <PlateHistoryPanel
            vehicleId={vehicle.id}
            currentPlate={vehicle.licensePlate}
            canEdit={canEdit}
          />
          <AssignmentPanel
            vehicleId={vehicle.id}
            currentAssignment={currentAssignmentData}
            canEdit={canEdit}
          />
        </div>
      </div>

      {/* Contracts */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Contratti</CardTitle>
            {canEdit && (
              <Button asChild size="sm" variant="outline">
                <Link href={`/contracts/new?vehicleId=${vehicle.id}`}>
                  <Plus className="mr-1 h-4 w-4" />
                  Nuovo contratto
                </Link>
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <ContractTimeline
            contracts={contractsData}
            vehicleId={vehicle.id}
          />
        </CardContent>
      </Card>

      {/* Documents */}
      <DocumentTab
        vehicleId={vehicle.id}
        tenantId={tenantId}
        canEdit={canEdit}
      />

      {/* Plate History */}
      <PlateHistoryList history={plateHistoryData} />

      {/* Assignment History */}
      <AssignmentHistory assignments={assignmentHistoryData} />
    </div>
  );
}
