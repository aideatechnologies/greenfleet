import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/auth/permissions";
import { getPrismaForTenant, prisma as globalPrisma } from "@/lib/db/client";
import { getAggregatedEmissions } from "@/lib/services/report-service";
import { getPresets } from "@/lib/services/report-preset-service";
import type { ReportParams, FilterOptions } from "@/types/report";
import { EmissionDashboard } from "./components/EmissionDashboard";
import { EmissionPageSkeleton } from "./loading";

// ---------------------------------------------------------------------------
// Data loader
// ---------------------------------------------------------------------------

async function EmissionContent() {
  const ctx = await getSessionContext();
  if (!ctx || !ctx.organizationId) {
    redirect("/login");
  }

  // RBAC: only owner and admin
  if (ctx.role !== "owner" && ctx.role !== "admin") {
    redirect("/");
  }

  const tenantId = ctx.organizationId;
  const prisma = getPrismaForTenant(tenantId);

  // Default: Jan 1 current year → end of last month (full fleet visibility)
  const now = new Date();
  const defaultEndDate = new Date(now.getFullYear(), now.getMonth(), 0); // last day of previous month
  const defaultStartDate = new Date(now.getFullYear(), 0, 1); // Jan 1 current year

  const defaultParams: ReportParams = {
    dateRange: {
      startDate: defaultStartDate,
      endDate: defaultEndDate,
    },
    aggregationLevel: "VEHICLE",
    periodGranularity: "MONTHLY",
  };

  // Load initial report, carlists, presets, plates, and filter options in parallel
  const [initialReport, carlists, presets, tenantPlates, filterOptionsRaw] = await Promise.all([
    getAggregatedEmissions(prisma, defaultParams),
    prisma.carlist.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    getPresets(prisma, tenantId),
    prisma.tenantVehicle.findMany({
      where: { status: "ACTIVE" },
      select: { licensePlate: true },
      orderBy: { licensePlate: "asc" },
    }),
    Promise.all([
      globalPrisma.catalogVehicle.findMany({
        select: { marca: true },
        distinct: ["marca"],
        orderBy: { marca: "asc" },
      }),
      globalPrisma.catalogVehicle.findMany({
        where: { carrozzeria: { not: null } },
        select: { carrozzeria: true },
        distinct: ["carrozzeria"],
        orderBy: { carrozzeria: "asc" },
      }),
      globalPrisma.engine.findMany({
        select: { fuelType: true },
        distinct: ["fuelType"],
        orderBy: { fuelType: "asc" },
      }),
    ]),
  ]);

  const filterOptions: FilterOptions = {
    targhe: tenantPlates.map((v) => v.licensePlate),
    marche: filterOptionsRaw[0].map((m) => m.marca),
    carrozzerie: filterOptionsRaw[1]
      .map((c) => c.carrozzeria)
      .filter((c): c is string => c !== null),
    carburanti: filterOptionsRaw[2].map((c) => c.fuelType),
  };

  return (
    <EmissionDashboard
      initialReport={initialReport}
      carlists={carlists}
      defaultStartDate={defaultStartDate}
      defaultEndDate={defaultEndDate}
      filterOptions={filterOptions}
      initialPresets={presets}
    />
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function EmissionsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Emissioni</h2>
        <p className="text-muted-foreground">
          Analisi aggregata delle emissioni CO2 della flotta aziendale.
        </p>
      </div>

      {/* Content with Suspense */}
      <Suspense fallback={<EmissionPageSkeleton />}>
        <EmissionContent />
      </Suspense>
    </div>
  );
}
