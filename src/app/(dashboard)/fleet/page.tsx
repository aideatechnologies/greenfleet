import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/auth/permissions";
import { getPrismaForTenant } from "@/lib/db/client";
import {
  fleetOverviewFilterSchema,
  employeeOverviewFilterSchema,
} from "@/lib/schemas/fleet-overview";
import {
  getFleetOverview,
  getEmployeeOverview,
  getFleetSummaryKPIs,
} from "@/lib/services/fleet-overview-service";
import { FleetKPISummary } from "./components/FleetKPISummary";
import { FleetTabs } from "./components/FleetTabs";

export default async function FleetPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const ctx = await getSessionContext();
  if (!ctx || !ctx.organizationId) {
    redirect("/login");
  }

  // RBAC: only owner and admin can access this page
  if (ctx.role !== "owner" && ctx.role !== "admin") {
    redirect("/");
  }

  const tenantId = ctx.organizationId;
  const prisma = getPrismaForTenant(tenantId);

  const rawParams = await searchParams;

  // Parse vehicle filters
  const vehicleFilters = fleetOverviewFilterSchema.parse({
    search:
      typeof rawParams.search === "string" ? rawParams.search : undefined,
    vehicleStatus:
      typeof rawParams.vehicleStatus === "string"
        ? rawParams.vehicleStatus
        : undefined,
    assignmentStatus:
      typeof rawParams.assignmentStatus === "string"
        ? rawParams.assignmentStatus
        : undefined,
    contractStatus:
      typeof rawParams.contractStatus === "string"
        ? rawParams.contractStatus
        : undefined,
    carlistId:
      typeof rawParams.carlistId === "string"
        ? rawParams.carlistId
        : undefined,
    page: typeof rawParams.page === "string" ? rawParams.page : undefined,
    pageSize:
      typeof rawParams.pageSize === "string"
        ? rawParams.pageSize
        : undefined,
    sortBy:
      typeof rawParams.sortBy === "string" ? rawParams.sortBy : undefined,
    sortOrder:
      typeof rawParams.sortOrder === "string"
        ? rawParams.sortOrder
        : undefined,
  });

  // Parse employee filters
  const employeeFilters = employeeOverviewFilterSchema.parse({
    search:
      typeof rawParams.empSearch === "string"
        ? rawParams.empSearch
        : undefined,
    status:
      typeof rawParams.empStatus === "string"
        ? rawParams.empStatus
        : undefined,
    assignmentStatus:
      typeof rawParams.empAssignment === "string"
        ? rawParams.empAssignment
        : undefined,
    page:
      typeof rawParams.empPage === "string" ? rawParams.empPage : undefined,
    pageSize:
      typeof rawParams.empPageSize === "string"
        ? rawParams.empPageSize
        : undefined,
    sortBy:
      typeof rawParams.empSortBy === "string"
        ? rawParams.empSortBy
        : undefined,
    sortOrder:
      typeof rawParams.empSortOrder === "string"
        ? rawParams.empSortOrder
        : undefined,
  });

  // Parallel data fetching
  const [vehicleResult, employeeResult, kpis] = await Promise.all([
    getFleetOverview(prisma, vehicleFilters),
    getEmployeeOverview(prisma, employeeFilters),
    getFleetSummaryKPIs(prisma),
  ]);

  const activeTab =
    typeof rawParams.tab === "string" ? rawParams.tab : "vehicles";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Stato Flotta</h2>
        <p className="text-muted-foreground">
          Panoramica complessiva di veicoli, contratti e dipendenti.
        </p>
      </div>

      {/* KPI Summary Cards */}
      <FleetKPISummary kpis={kpis} />

      {/* Tabs: Vehicles / Employees */}
      <FleetTabs
        activeTab={activeTab}
        vehicleResult={vehicleResult}
        employeeResult={employeeResult}
      />
    </div>
  );
}
