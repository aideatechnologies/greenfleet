import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/auth/permissions";
import { getPrismaForTenant } from "@/lib/db/client";
import { getAggregatedEmissions } from "@/lib/services/report-service";
import type { ReportParams } from "@/types/report";
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

  // Default: last month, vehicle aggregation
  const now = new Date();
  const defaultEndDate = new Date(now.getFullYear(), now.getMonth(), 0); // last day of previous month
  const defaultStartDate = new Date(
    defaultEndDate.getFullYear(),
    defaultEndDate.getMonth(),
    1
  ); // first day of previous month

  const defaultParams: ReportParams = {
    dateRange: {
      startDate: defaultStartDate,
      endDate: defaultEndDate,
    },
    aggregationLevel: "VEHICLE",
    periodGranularity: "MONTHLY",
  };

  // Load initial report and carlists in parallel
  const [initialReport, carlists] = await Promise.all([
    getAggregatedEmissions(prisma, defaultParams),
    prisma.carlist.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <EmissionDashboard
      initialReport={initialReport}
      carlists={carlists}
      defaultStartDate={defaultStartDate}
      defaultEndDate={defaultEndDate}
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
