import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db/client";
import {
  getAllTenantsMetrics,
  getMetricsKPI,
  formatBytes,
} from "@/lib/services/metrics-service";
import { TenantMetricsDashboard } from "./components/TenantMetricsDashboard";
import { Activity } from "lucide-react";

export default async function MetricsPage() {
  const ctx = await getSessionContext();
  if (!ctx || !ctx.organizationId) {
    redirect("/login");
  }

  // Only owner (Platform Admin) can access metrics
  if (ctx.role !== "owner") {
    redirect("/");
  }

  // Period: last 30 days
  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  thirtyDaysAgo.setHours(0, 0, 0, 0);

  const [kpiData, tenantSummaries] = await Promise.all([
    getMetricsKPI(prisma),
    getAllTenantsMetrics(prisma, { from: thirtyDaysAgo, to: now }),
  ]);

  const kpi = {
    totalTenants: kpiData.totalTenants,
    totalVehicles: kpiData.totalVehicles,
    totalActiveUsers: kpiData.totalActiveUsers,
    totalStorageDisplay: formatBytes(kpiData.totalStorageBytes),
  };

  const tenants = tenantSummaries.map((t) => ({
    tenantId: t.tenantId,
    tenantName: t.tenantName,
    vehicleCount: t.vehicleCount,
    activeUsers: t.activeUsers,
    fuelRecordCount: t.fuelRecordCount,
    queryCount: t.queryCount,
    storageDisplay: formatBytes(t.storageBytes),
  }));

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <Activity className="h-6 w-6 text-muted-foreground" />
          <h2 className="text-2xl font-bold tracking-tight">Metriche Tenant</h2>
        </div>
        <p className="text-muted-foreground mt-1">
          Metriche per-tenant e indicatori di capacity planning per la piattaforma.
        </p>
      </div>

      <TenantMetricsDashboard kpi={kpi} tenants={tenants} />
    </div>
  );
}
