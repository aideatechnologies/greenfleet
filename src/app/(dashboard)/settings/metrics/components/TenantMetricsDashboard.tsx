"use client";

import { KPICard } from "@/components/data-display/KPICard";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CAPACITY_THRESHOLDS } from "@/lib/services/metrics-service";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MetricsKPI {
  totalTenants: number;
  totalVehicles: number;
  totalActiveUsers: number;
  totalStorageDisplay: string;
}

interface TenantSummary {
  tenantId: string;
  tenantName: string;
  vehicleCount: number;
  activeUsers: number;
  fuelRecordCount: number;
  queryCount: number;
  storageDisplay: string;
}

interface TenantMetricsDashboardProps {
  kpi: MetricsKPI;
  tenants: TenantSummary[];
}

// ---------------------------------------------------------------------------
// Capacity alert
// ---------------------------------------------------------------------------

function CapacityIndicator({
  label,
  current,
  max,
  warning,
}: {
  label: string;
  current: number;
  max: number;
  warning: number;
}) {
  const percentage = Math.round((current / max) * 100);
  const isWarning = current >= warning;
  const isCritical = current >= max;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <div className="flex items-center gap-2">
          <span className="tabular-nums">
            {current.toLocaleString("it-IT")} / {max.toLocaleString("it-IT")}
          </span>
          {isCritical && (
            <Badge variant="destructive">Critico</Badge>
          )}
          {isWarning && !isCritical && (
            <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
              Attenzione
            </Badge>
          )}
        </div>
      </div>
      <Progress
        value={Math.min(percentage, 100)}
        className={
          isCritical
            ? "[&>div]:bg-destructive"
            : isWarning
              ? "[&>div]:bg-amber-500"
              : ""
        }
      />
      <p className="text-xs text-muted-foreground text-right">{percentage}%</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TenantMetricsDashboard({
  kpi,
  tenants,
}: TenantMetricsDashboardProps) {
  // Find tenants exceeding vehicle threshold
  const tenantsOverVehicleLimit = tenants.filter(
    (t) => t.vehicleCount >= CAPACITY_THRESHOLDS.warningVehiclesPerTenant
  );

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Tenant attivi"
          value={kpi.totalTenants.toLocaleString("it-IT")}
        />
        <KPICard
          title="Veicoli totali"
          value={kpi.totalVehicles.toLocaleString("it-IT")}
        />
        <KPICard
          title="Utenti attivi"
          value={kpi.totalActiveUsers.toLocaleString("it-IT")}
        />
        <KPICard
          title="Storage totale"
          value={kpi.totalStorageDisplay}
        />
      </div>

      {/* Capacity planning */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Capacity Planning</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <CapacityIndicator
            label="Tenant attivi"
            current={kpi.totalTenants}
            max={CAPACITY_THRESHOLDS.maxTenants}
            warning={CAPACITY_THRESHOLDS.warningTenants}
          />
          <CapacityIndicator
            label="Veicoli totali"
            current={kpi.totalVehicles}
            max={CAPACITY_THRESHOLDS.maxTotalVehicles}
            warning={CAPACITY_THRESHOLDS.warningTotalVehicles}
          />

          {tenantsOverVehicleLimit.length > 0 && (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                Tenant con veicoli oltre soglia ({CAPACITY_THRESHOLDS.warningVehiclesPerTenant}):
              </p>
              <ul className="mt-1 text-sm text-amber-700 dark:text-amber-300">
                {tenantsOverVehicleLimit.map((t) => (
                  <li key={t.tenantId}>
                    {t.tenantName}: {t.vehicleCount.toLocaleString("it-IT")} veicoli
                    {t.vehicleCount >= CAPACITY_THRESHOLDS.maxVehiclesPerTenant && (
                      <Badge variant="destructive" className="ml-2">LIMITE</Badge>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Per-tenant table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Metriche per Tenant</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tenant</TableHead>
                <TableHead className="text-right">Veicoli</TableHead>
                <TableHead className="text-right">Utenti attivi</TableHead>
                <TableHead className="text-right">Rifornimenti (periodo)</TableHead>
                <TableHead className="text-right">Query (periodo)</TableHead>
                <TableHead className="text-right">Storage</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tenants.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="h-24 text-center text-muted-foreground"
                  >
                    Nessuna metrica disponibile
                  </TableCell>
                </TableRow>
              ) : (
                tenants.map((tenant) => (
                  <TableRow key={tenant.tenantId}>
                    <TableCell className="font-medium">
                      {tenant.tenantName}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {tenant.vehicleCount.toLocaleString("it-IT")}
                      {tenant.vehicleCount >=
                        CAPACITY_THRESHOLDS.warningVehiclesPerTenant && (
                        <Badge
                          variant={
                            tenant.vehicleCount >=
                            CAPACITY_THRESHOLDS.maxVehiclesPerTenant
                              ? "destructive"
                              : "secondary"
                          }
                          className="ml-2"
                        >
                          {tenant.vehicleCount >=
                          CAPACITY_THRESHOLDS.maxVehiclesPerTenant
                            ? "Critico"
                            : "Attenzione"}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {tenant.activeUsers.toLocaleString("it-IT")}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {tenant.fuelRecordCount.toLocaleString("it-IT")}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {tenant.queryCount.toLocaleString("it-IT")}
                    </TableCell>
                    <TableCell className="text-right">
                      {tenant.storageDisplay}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
