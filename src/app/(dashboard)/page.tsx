import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { headers } from "next/headers";
import { getSessionContext, isDriver } from "@/lib/auth/permissions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { KPICard } from "@/components/data-display/KPICard";
import { ProgressTarget } from "@/components/data-display/ProgressTarget";
import {
  getDashboardKPIs,
  getEmissionsTrend,
  getEmissionFilterOptions,
  getTargetProgress,
  getFleetBreakdownByFuelType,
  getFleetBreakdownByCarlist,
} from "@/lib/services/dashboard-service";
import { EmissionsTrendCard } from "./components/EmissionsTrendCard";
import { FuelTypeBreakdownSection } from "./components/FuelTypeBreakdownSection";
import { CarlistBreakdownSection } from "./components/CarlistBreakdownSection";
import {
  formatEmission,
  formatKm,
  formatFuelConsumption,
} from "@/lib/utils/number";

// ---------------------------------------------------------------------------
// Role label
// ---------------------------------------------------------------------------

const roleLabels: Record<string, string> = {
  owner: "Platform Admin",
  admin: "Fleet Manager",
  mobility_manager: "Mobility Manager",
  member: "Autista",
};

// ---------------------------------------------------------------------------
// Main page (Server Component)
// ---------------------------------------------------------------------------

export default async function DashboardPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) redirect("/login");

  const ctx = await getSessionContext();
  if (!ctx) redirect("/login");

  // Role-based routing: Drivers go to /driver
  if (isDriver(ctx)) {
    redirect("/driver");
  }

  // At this point, user is owner, admin, or mobility_manager
  if (!ctx.organizationId) redirect("/login");

  const role = ctx.role ?? "admin";
  const roleLabel = roleLabels[role] ?? role;
  const firstName = session.user.name.split(" ")[0];

  return (
    <div className="space-y-6">
      {/* ── Welcome ──────────────────────────────────────────────── */}
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <h1 className="text-h1 tracking-tight">
            Bentornato, {firstName}
          </h1>
          <Badge variant="secondary" className="text-[11px]">
            {roleLabel}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Ecco il riepilogo della tua flotta.
        </p>
      </div>

      {/* ── KPI Row ──────────────────────────────────────────────── */}
      <Suspense fallback={<KPIRowSkeleton />}>
        <KPIRow tenantId={ctx.organizationId} />
      </Suspense>

      {/* ── Andamento Emissioni per Veicolo ──────────────────────── */}
      <Suspense fallback={<TrendSkeleton />}>
        <TrendRow tenantId={ctx.organizationId} />
      </Suspense>

      {/* ── Obiettivo Emissioni ──────────────────────────────────── */}
      <Suspense fallback={<TargetSkeleton />}>
        <TargetRow tenantId={ctx.organizationId} />
      </Suspense>

      {/* ── Analisi per Tipo Alimentazione ───────────────────────── */}
      <Suspense fallback={<FuelTypeBreakdownSkeleton />}>
        <FuelTypeBreakdownRow tenantId={ctx.organizationId} />
      </Suspense>

      {/* ── Analisi per Parco Auto ───────────────────────────────── */}
      <Suspense fallback={<CarlistBreakdownSkeleton />}>
        <CarlistBreakdownRow tenantId={ctx.organizationId} />
      </Suspense>
    </div>
  );
}

// ---------------------------------------------------------------------------
// KPI Row (async server component)
// ---------------------------------------------------------------------------

async function KPIRow({ tenantId }: { tenantId: string }) {
  const [kpis, trendData] = await Promise.all([
    getDashboardKPIs(tenantId),
    getEmissionsTrend(tenantId, 12),
  ]);

  const sparklineValues = trendData.map((p) => p.value);
  const hasEmissions = kpis.emissionsThisMonth > 0 || kpis.emissionsLastMonth > 0;

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {/* Hero: Emissioni CO2 */}
      <KPICard
        label="Emissioni CO2"
        value={formatEmission(kpis.emissionsThisMonth, true)}
        icon="Leaf"
        variant="hero"
        invertTrendColor
        trend={
          hasEmissions
            ? {
                value: kpis.trendPercentage,
                direction: kpis.trendDirection,
                label: "vs mese precedente",
              }
            : undefined
        }
        sparklineData={sparklineValues.length > 1 ? sparklineValues : undefined}
        state={hasEmissions ? "populated" : "no-data"}
      />

      {/* Veicoli Attivi */}
      <KPICard
        label="Veicoli Attivi"
        value={kpis.activeVehicles}
        icon="Car"
        variant="default"
        state={kpis.activeVehicles > 0 ? "populated" : "no-data"}
      />

      {/* Km Totali */}
      <KPICard
        label="Km Totali"
        value={formatKm(kpis.totalKmThisMonth)}
        icon="Route"
        variant="default"
        state={kpis.totalKmThisMonth > 0 ? "populated" : "no-data"}
      />

      {/* Consumi Totali */}
      <KPICard
        label="Consumi Totali"
        value={formatFuelConsumption(kpis.totalFuelThisMonth, kpis.totalKwhThisMonth)}
        icon="Fuel"
        variant="default"
        state={kpis.totalFuelThisMonth > 0 || kpis.totalKwhThisMonth > 0 ? "populated" : "no-data"}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Trend row (area chart with optional filters - full width)
// ---------------------------------------------------------------------------

async function TrendRow({ tenantId }: { tenantId: string }) {
  const [trendData, filterOptions] = await Promise.all([
    getEmissionsTrend(tenantId, 12),
    getEmissionFilterOptions(),
  ]);
  return <EmissionsTrendCard initialData={trendData} filterOptions={filterOptions} />;
}

// ---------------------------------------------------------------------------
// Delta + Target row (side by side)
// ---------------------------------------------------------------------------

async function TargetRow({ tenantId }: { tenantId: string }) {
  const now = new Date();
  const targetProgress = await getTargetProgress(tenantId, now);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">
          Obiettivo Emissioni
        </CardTitle>
        {targetProgress && (
          <p className="text-xs text-muted-foreground">
            {targetProgress.description ?? "Target attivo"}
          </p>
        )}
      </CardHeader>
      <CardContent>
        {targetProgress ? (
          <ProgressTarget
            value={targetProgress.currentValue}
            target={targetProgress.targetValue}
            valueLabel={formatEmission(targetProgress.currentValue, true)}
            targetLabel={`Target: ${formatEmission(targetProgress.targetValue, true)}`}
            milestones={targetProgress.milestones.map((m) => ({
              position: (m.expectedValue / targetProgress.targetValue) * 100,
              label: m.label,
              reached: m.achieved,
            }))}
            overTargetIsBad
            variant="full"
          />
        ) : (
          <p className="py-4 text-center text-sm italic text-muted-foreground">
            Nessun obiettivo emissioni configurato
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Fleet breakdown by fuel type (async server component)
// ---------------------------------------------------------------------------

async function FuelTypeBreakdownRow({ tenantId }: { tenantId: string }) {
  const breakdown = await getFleetBreakdownByFuelType(tenantId);
  return <FuelTypeBreakdownSection data={breakdown} />;
}

// ---------------------------------------------------------------------------
// Fleet breakdown by carlist (async server component)
// ---------------------------------------------------------------------------

async function CarlistBreakdownRow({ tenantId }: { tenantId: string }) {
  const breakdown = await getFleetBreakdownByCarlist(tenantId);
  if (breakdown.items.length === 0) return null;
  return <CarlistBreakdownSection data={breakdown} />;
}

// ---------------------------------------------------------------------------
// Skeleton fallbacks
// ---------------------------------------------------------------------------

function KPIRowSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <div data-slot="card" className="rounded-xl border p-5 bg-card">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="size-10 rounded-lg" />
          </div>
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-5 w-24" />
          <Skeleton className="mt-2 h-12 w-full" />
        </div>
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} data-slot="card" className="rounded-xl border p-5 bg-card">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="size-8 rounded-lg" />
            </div>
            <Skeleton className="h-7 w-20" />
            <Skeleton className="h-4 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}

function TrendSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <Skeleton className="h-5 w-44" />
        <Skeleton className="h-4 w-64" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-[280px] w-full rounded-lg" />
        <div className="mt-3 flex flex-wrap gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-20" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function TargetSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <Skeleton className="h-5 w-44" />
        <Skeleton className="h-3 w-32" />
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex justify-between">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="h-3 w-full rounded-full" />
          <div className="flex justify-between">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-5 w-12 rounded-full" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function FuelTypeBreakdownSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-56" />
        <Skeleton className="h-4 w-72" />
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-[280px] w-full rounded-lg" />
          <Skeleton className="h-[280px] w-full rounded-lg" />
        </div>
      </CardContent>
    </Card>
  );
}

function CarlistBreakdownSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-56" />
        <Skeleton className="h-4 w-72" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="size-3 rounded-full" />
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-5 w-12" />
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-5 w-12" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
