import type { PrismaClient } from "@/generated/prisma/client";
import type { PrismaClientWithTenant } from "@/lib/db/client";
import { logger } from "@/lib/utils/logger";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DateRange {
  from: Date;
  to: Date;
}

export interface TenantMetricsRow {
  id: number;
  tenantId: string;
  date: Date;
  queryCount: number;
  storageBytes: bigint;
  activeUsers: number;
  vehicleCount: number;
  fuelRecordCount: number;
  createdAt: Date;
}

export interface TenantMetricsSummary {
  tenantId: string;
  tenantName: string;
  vehicleCount: number;
  activeUsers: number;
  fuelRecordCount: number;
  queryCount: number;
  storageBytes: bigint;
}

// Capacity planning thresholds (from NFR14)
export const CAPACITY_THRESHOLDS = {
  maxTenants: 20,
  maxVehiclesPerTenant: 500,
  maxTotalVehicles: 10_000,
  warningTenants: 16,
  warningVehiclesPerTenant: 400,
  warningTotalVehicles: 8_000,
} as const;

// Average row sizes for storage estimation (bytes)
const AVG_ROW_SIZES = {
  tenantVehicle: 512,
  fuelRecord: 256,
  kmReading: 128,
  auditLog: 512,
  contract: 384,
  employee: 256,
} as const;

// ---------------------------------------------------------------------------
// Collect daily metrics for a single tenant
// ---------------------------------------------------------------------------

export async function collectDailyMetrics(
  prisma: PrismaClientWithTenant,
  tenantId: string
): Promise<void> {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Count vehicles with ACTIVE status
    const vehicleCount = await prisma.tenantVehicle.count({
      where: { status: "ACTIVE" },
    });

    // Count fuel records created today
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);
    const fuelRecordCount = await prisma.fuelRecord.count({
      where: {
        createdAt: { gte: today, lte: todayEnd },
      },
    });

    // Count active users (users that have a session today)
    // We use the base prisma to query sessions (global model)
    // Since sessions are global, we count members of this org
    const activeUsers = await prisma.member.count({
      where: { organizationId: tenantId },
    });

    // Estimate storage: count rows in main tables * average row size
    const [fuelTotal, kmTotal, auditTotal, contractTotal, employeeTotal] =
      await Promise.all([
        prisma.fuelRecord.count(),
        prisma.kmReading.count(),
        prisma.auditLog.count(),
        prisma.contract.count(),
        prisma.employee.count(),
      ]);

    const storageBytes = BigInt(
      vehicleCount * AVG_ROW_SIZES.tenantVehicle +
        fuelTotal * AVG_ROW_SIZES.fuelRecord +
        kmTotal * AVG_ROW_SIZES.kmReading +
        auditTotal * AVG_ROW_SIZES.auditLog +
        contractTotal * AVG_ROW_SIZES.contract +
        employeeTotal * AVG_ROW_SIZES.employee
    );

    // Upsert daily metrics (idempotent — can be run multiple times per day)
    await prisma.tenantMetrics.upsert({
      where: {
        tenantId_date: { tenantId, date: today },
      },
      update: {
        vehicleCount,
        fuelRecordCount,
        activeUsers,
        storageBytes,
      },
      create: {
        tenantId,
        date: today,
        vehicleCount,
        fuelRecordCount,
        activeUsers,
        storageBytes,
        queryCount: 0,
      },
    });

    logger.info(
      { tenantId, vehicleCount, fuelRecordCount, activeUsers },
      "Daily metrics collected"
    );
  } catch (error) {
    logger.error(
      { error, tenantId },
      "Failed to collect daily metrics"
    );
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Get metrics for a tenant over a period
// ---------------------------------------------------------------------------

export async function getTenantMetrics(
  prisma: PrismaClientWithTenant,
  tenantId: string,
  period: DateRange
): Promise<TenantMetricsRow[]> {
  const rows = await prisma.tenantMetrics.findMany({
    where: {
      date: {
        gte: period.from,
        lte: period.to,
      },
    },
    orderBy: { date: "asc" },
  });

  return rows as unknown as TenantMetricsRow[];
}

// ---------------------------------------------------------------------------
// Get all tenants metrics (cross-tenant, for global admin)
// ---------------------------------------------------------------------------

export async function getAllTenantsMetrics(
  prisma: PrismaClient,
  period: DateRange
): Promise<TenantMetricsSummary[]> {
  // Get all active organizations
  const organizations = await prisma.organization.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
  });

  const summaries: TenantMetricsSummary[] = [];

  for (const org of organizations) {
    // Get the latest metrics record for this tenant within the period
    const latestMetrics = await prisma.tenantMetrics.findFirst({
      where: {
        tenantId: org.id,
        date: {
          gte: period.from,
          lte: period.to,
        },
      },
      orderBy: { date: "desc" },
    });

    // Sum up query counts and fuel record counts for the period
    const periodAgg = await prisma.tenantMetrics.aggregate({
      where: {
        tenantId: org.id,
        date: {
          gte: period.from,
          lte: period.to,
        },
      },
      _sum: {
        queryCount: true,
        fuelRecordCount: true,
      },
    });

    summaries.push({
      tenantId: org.id,
      tenantName: org.name,
      vehicleCount: latestMetrics?.vehicleCount ?? 0,
      activeUsers: latestMetrics?.activeUsers ?? 0,
      fuelRecordCount: periodAgg._sum.fuelRecordCount ?? 0,
      queryCount: periodAgg._sum.queryCount ?? 0,
      storageBytes: latestMetrics?.storageBytes ?? BigInt(0),
    });
  }

  return summaries;
}

// ---------------------------------------------------------------------------
// Get aggregate KPI for dashboard
// ---------------------------------------------------------------------------

export interface MetricsKPI {
  totalTenants: number;
  totalVehicles: number;
  totalActiveUsers: number;
  totalStorageBytes: bigint;
}

export async function getMetricsKPI(
  prisma: PrismaClient
): Promise<MetricsKPI> {
  const activeTenants = await prisma.organization.count({
    where: { isActive: true },
  });

  // Get latest metrics for each tenant
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  // Get the most recent metrics per tenant
  const allMetrics = await prisma.tenantMetrics.findMany({
    where: {
      date: { gte: sevenDaysAgo },
    },
    orderBy: { date: "desc" },
  });

  // Deduplicate by tenantId (keep most recent)
  const latestByTenant = new Map<string, typeof allMetrics[0]>();
  for (const m of allMetrics) {
    if (!latestByTenant.has(m.tenantId)) {
      latestByTenant.set(m.tenantId, m);
    }
  }

  let totalVehicles = 0;
  let totalActiveUsers = 0;
  let totalStorageBytes = BigInt(0);

  for (const m of latestByTenant.values()) {
    totalVehicles += m.vehicleCount;
    totalActiveUsers += m.activeUsers;
    totalStorageBytes += m.storageBytes;
  }

  return {
    totalTenants: activeTenants,
    totalVehicles,
    totalActiveUsers,
    totalStorageBytes,
  };
}

// ---------------------------------------------------------------------------
// Format bytes for display
// ---------------------------------------------------------------------------

export function formatBytes(bytes: bigint | number): string {
  const n = typeof bytes === "bigint" ? Number(bytes) : bytes;
  if (n === 0) return "0 B";

  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(n) / Math.log(1024));
  const value = n / Math.pow(1024, i);

  return `${value.toLocaleString("it-IT", { maximumFractionDigits: 1 })} ${units[i]}`;
}
