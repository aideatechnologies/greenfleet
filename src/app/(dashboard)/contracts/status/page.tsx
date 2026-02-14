import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getSessionContext } from "@/lib/auth/permissions";
import { getPrismaForTenant } from "@/lib/db/client";
import { getContractStatusOverview } from "@/lib/services/contract-service";
import { KPICard } from "@/components/data-display/KPICard";
import { ContractStatusTable } from "../components/ContractStatusTable";
import { ContractStatusFilters } from "../components/ContractStatusFilters";
import type { ExpiryStatus } from "@/types/domain";

export default async function ContractStatusPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const ctx = await getSessionContext();
  if (!ctx || !ctx.organizationId) {
    redirect("/login");
  }

  const tenantId = ctx.organizationId;
  const prisma = getPrismaForTenant(tenantId);

  const rawParams = await searchParams;

  const filters = {
    contractType:
      typeof rawParams.contractType === "string"
        ? rawParams.contractType
        : undefined,
    expiryStatus:
      typeof rawParams.expiryStatus === "string"
        ? (rawParams.expiryStatus as ExpiryStatus)
        : undefined,
    search:
      typeof rawParams.search === "string" ? rawParams.search : undefined,
  };

  const { rows, kpi } = await getContractStatusOverview(prisma, filters);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" asChild className="h-8 w-8">
              <Link href="/contracts">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <h2 className="text-2xl font-bold tracking-tight">
              Stato Contrattuale
            </h2>
          </div>
          <p className="text-muted-foreground ml-10">
            Panoramica dello stato contrattuale di tutti i veicoli della flotta.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Veicoli totali"
          value={kpi.totalVehicles}
        />
        <KPICard
          title="Con contratto"
          value={kpi.withContract}
        />
        <KPICard
          title="Senza contratto"
          value={kpi.noContract}
        />
        <KPICard
          title="Scaduti / In scadenza"
          value={kpi.expired + kpi.expiring30 + kpi.expiring60 + kpi.expiring90}
          suffix={
            kpi.expired > 0
              ? `(${kpi.expired} scaduti)`
              : undefined
          }
        />
      </div>

      {/* Filters */}
      <ContractStatusFilters />

      {/* Table */}
      <ContractStatusTable rows={rows} />
    </div>
  );
}
