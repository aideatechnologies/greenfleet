import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSessionContext, isTenantAdmin } from "@/lib/auth/permissions";
import { getPrismaForTenant } from "@/lib/db/client";
import { getContractById } from "@/lib/services/contract-service";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ChevronRight, Pencil } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import {
  ContractType,
  CONTRACT_TYPE_LABELS,
  ContractStatus,
  CONTRACT_STATUS_LABELS,
  type ContractType as ContractTypeT,
  type ContractStatus as ContractStatusT,
} from "@/types/contract";
import { CloseContractButton } from "./CloseContractButton";

// ---------------------------------------------------------------------------
// Formatters
// ---------------------------------------------------------------------------

const formatCurrency = (amount: number | null | undefined) => {
  if (amount == null) return "-";
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
};

function formatDateLong(date: Date | string | null | undefined) {
  if (!date) return "-";
  return format(new Date(date), "dd MMMM yyyy", { locale: it });
}

// ---------------------------------------------------------------------------
// Badge helpers
// ---------------------------------------------------------------------------

function typeBadgeClasses(type: string): string {
  switch (type) {
    case ContractType.PROPRIETARIO:
      return "bg-blue-100 text-blue-800 border-blue-200";
    case ContractType.BREVE_TERMINE:
      return "bg-amber-100 text-amber-800 border-amber-200";
    case ContractType.LUNGO_TERMINE:
      return "bg-purple-100 text-purple-800 border-purple-200";
    case ContractType.LEASING_FINANZIARIO:
      return "bg-emerald-100 text-emerald-800 border-emerald-200";
    default:
      return "";
  }
}

function statusBadgeClasses(status: string): string {
  return status === ContractStatus.ACTIVE
    ? "bg-green-600 hover:bg-green-600/90"
    : "bg-gray-100 text-gray-600 hover:bg-gray-100/90";
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function ContractDetailPage({
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
  const contract = await getContractById(prisma, id);

  if (!contract) {
    notFound();
  }

  const contractType = contract.type as ContractTypeT;
  const contractStatus = contract.status as ContractStatusT;
  const vehicle = contract.vehicle;
  const catalog = vehicle.catalogVehicle;
  const isActive = contractStatus === ContractStatus.ACTIVE;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link
          href="/contracts"
          className="hover:text-foreground transition-colors"
        >
          Contratti
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground">{vehicle.licensePlate}</span>
      </nav>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold tracking-tight">
              Contratto {CONTRACT_TYPE_LABELS[contractType]}
            </h2>
            <Badge variant="outline" className={typeBadgeClasses(contractType)}>
              {CONTRACT_TYPE_LABELS[contractType]}
            </Badge>
            <Badge
              variant={isActive ? "default" : "secondary"}
              className={statusBadgeClasses(contractStatus)}
            >
              {CONTRACT_STATUS_LABELS[contractStatus]}
            </Badge>
          </div>
          <p className="text-muted-foreground">
            <Link
              href={`/vehicles/${vehicle.id}`}
              className="hover:text-foreground transition-colors underline underline-offset-4"
            >
              <span className="font-mono font-medium uppercase">
                {vehicle.licensePlate}
              </span>
              {" - "}
              {catalog.marca} {catalog.modello}
            </Link>
          </p>
          {!isActive && contract.closedAt && (
            <p className="text-sm text-muted-foreground">
              Contratto chiuso il{" "}
              {formatDateLong(contract.closedAt)}
            </p>
          )}
        </div>

        {/* Actions */}
        {canEdit && isActive && (
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={`/contracts/${id}/edit`}>
                <Pencil className="mr-1 h-4 w-4" />
                Modifica
              </Link>
            </Button>
            <CloseContractButton contractId={String(id)} />
          </div>
        )}
      </div>

      <Separator />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Vehicle Info */}
        <Card>
          <CardHeader>
            <CardTitle>Veicolo</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <dt className="text-muted-foreground">Targa</dt>
              <dd className="font-mono font-medium uppercase">
                {vehicle.licensePlate}
              </dd>
              <dt className="text-muted-foreground">Marca / Modello</dt>
              <dd className="font-medium">
                {catalog.marca} {catalog.modello}
              </dd>
              {catalog.allestimento && (
                <>
                  <dt className="text-muted-foreground">Allestimento</dt>
                  <dd className="font-medium">{catalog.allestimento}</dd>
                </>
              )}
            </dl>
          </CardContent>
        </Card>

        {/* Contract Details — type-specific */}
        <Card>
          <CardHeader>
            <CardTitle>Dettagli contratto</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              {contractType === "PROPRIETARIO" && (
                <>
                  <dt className="text-muted-foreground">Data acquisto</dt>
                  <dd className="font-medium">
                    {formatDateLong(contract.purchaseDate)}
                  </dd>
                  <dt className="text-muted-foreground">Prezzo acquisto</dt>
                  <dd className="font-medium tabular-nums">
                    {formatCurrency(contract.purchasePrice)}
                  </dd>
                  {contract.residualValue != null && (
                    <>
                      <dt className="text-muted-foreground">Valore residuo</dt>
                      <dd className="font-medium tabular-nums">
                        {formatCurrency(contract.residualValue)}
                      </dd>
                    </>
                  )}
                </>
              )}

              {contractType === "BREVE_TERMINE" && (
                <>
                  <dt className="text-muted-foreground">Fornitore</dt>
                  <dd className="font-medium">{contract.supplierRef?.name ?? contract.supplier ?? "-"}</dd>
                  <dt className="text-muted-foreground">Data inizio</dt>
                  <dd className="font-medium">
                    {formatDateLong(contract.startDate)}
                  </dd>
                  <dt className="text-muted-foreground">Data fine</dt>
                  <dd className="font-medium">
                    {formatDateLong(contract.endDate)}
                  </dd>
                  <dt className="text-muted-foreground">
                    Canone giornaliero
                  </dt>
                  <dd className="font-medium tabular-nums">
                    {formatCurrency(contract.dailyRate)}
                  </dd>
                  {contract.includedKm != null && (
                    <>
                      <dt className="text-muted-foreground">Km inclusi</dt>
                      <dd className="font-medium tabular-nums">
                        {contract.includedKm.toLocaleString("it-IT")} km
                      </dd>
                    </>
                  )}
                </>
              )}

              {contractType === "LUNGO_TERMINE" && (
                <>
                  <dt className="text-muted-foreground">Fornitore</dt>
                  <dd className="font-medium">{contract.supplierRef?.name ?? contract.supplier ?? "-"}</dd>
                  <dt className="text-muted-foreground">Data inizio</dt>
                  <dd className="font-medium">
                    {formatDateLong(contract.startDate)}
                  </dd>
                  <dt className="text-muted-foreground">Data fine</dt>
                  <dd className="font-medium">
                    {formatDateLong(contract.endDate)}
                  </dd>
                  <dt className="text-muted-foreground">Canone mensile</dt>
                  <dd className="font-medium tabular-nums">
                    {formatCurrency(contract.monthlyRate)}
                  </dd>
                  {contract.franchiseKm != null && (
                    <>
                      <dt className="text-muted-foreground">
                        Km in franchigia
                      </dt>
                      <dd className="font-medium tabular-nums">
                        {contract.franchiseKm.toLocaleString("it-IT")} km
                      </dd>
                    </>
                  )}
                  {contract.extraKmPenalty != null && (
                    <>
                      <dt className="text-muted-foreground">
                        Penale extra km
                      </dt>
                      <dd className="font-medium tabular-nums">
                        {formatCurrency(contract.extraKmPenalty)}/km
                      </dd>
                    </>
                  )}
                  {contract.includedServices && (
                    <>
                      <dt className="text-muted-foreground sm:col-span-2">
                        Servizi inclusi
                      </dt>
                      <dd className="font-medium sm:col-span-2">
                        {contract.includedServices}
                      </dd>
                    </>
                  )}
                </>
              )}

              {contractType === "LEASING_FINANZIARIO" && (
                <>
                  <dt className="text-muted-foreground">
                    Societa di leasing
                  </dt>
                  <dd className="font-medium">{contract.supplierRef?.name ?? contract.leasingCompany ?? "-"}</dd>
                  <dt className="text-muted-foreground">Data inizio</dt>
                  <dd className="font-medium">
                    {formatDateLong(contract.startDate)}
                  </dd>
                  <dt className="text-muted-foreground">Data fine</dt>
                  <dd className="font-medium">
                    {formatDateLong(contract.endDate)}
                  </dd>
                  <dt className="text-muted-foreground">Canone mensile</dt>
                  <dd className="font-medium tabular-nums">
                    {formatCurrency(contract.monthlyRate)}
                  </dd>
                  {contract.buybackValue != null && (
                    <>
                      <dt className="text-muted-foreground">
                        Valore di riscatto
                      </dt>
                      <dd className="font-medium tabular-nums">
                        {formatCurrency(contract.buybackValue)}
                      </dd>
                    </>
                  )}
                  {contract.maxDiscount != null && (
                    <>
                      <dt className="text-muted-foreground">
                        Sconto massimo
                      </dt>
                      <dd className="font-medium tabular-nums">
                        {formatCurrency(contract.maxDiscount)}
                      </dd>
                    </>
                  )}
                </>
              )}
            </dl>
          </CardContent>
        </Card>

        {/* Notes */}
        {contract.notes && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Note</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{contract.notes}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
