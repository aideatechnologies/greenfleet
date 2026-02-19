import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
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

  // RBAC: only owner, admin, and mobility_manager
  if (ctx.role !== "owner" && ctx.role !== "admin" && ctx.role !== "mobility_manager") {
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

  // Convert BigInt fields to Number to avoid RSC serialization issues
  const carlistsSafe = carlists.map(c => ({ id: Number(c.id), name: c.name }));

  // JSON round-trip to strip Prisma internal metadata and avoid
  // "Maximum call stack size exceeded" during RSC serialization
  const safeReport = JSON.parse(JSON.stringify(initialReport, (_key, value) =>
    typeof value === "bigint" ? Number(value) : value
  )) as typeof initialReport;

  // Restore Date objects (JSON.stringify converts them to ISO strings)
  safeReport.metadata.dateRange.startDate = new Date(safeReport.metadata.dateRange.startDate);
  safeReport.metadata.dateRange.endDate = new Date(safeReport.metadata.dateRange.endDate);
  safeReport.metadata.generatedAt = new Date(safeReport.metadata.generatedAt);

  return (
    <EmissionDashboard
      initialReport={safeReport}
      carlists={carlistsSafe}
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

export default async function EmissionsPage() {
  const t = await getTranslations("emissions");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">{t("title")}</h2>
        <p className="text-muted-foreground">
          {t("description")}
        </p>
      </div>

      {/* Content with Suspense */}
      <Suspense fallback={<EmissionPageSkeleton />}>
        <EmissionContent />
      </Suspense>
    </div>
  );
}
