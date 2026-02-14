import { NextResponse } from "next/server";
import { prisma, getPrismaForTenant } from "@/lib/db/client";
import { collectDailyMetrics } from "@/lib/services/metrics-service";
import { logger } from "@/lib/utils/logger";

/**
 * POST /api/cron/collect-metrics
 *
 * Collects daily metrics for all active tenants.
 * Intended to be called by an external cron job or scheduler.
 *
 * Requires CRON_SECRET header for authentication.
 */
export async function POST(request: Request) {
  // Validate cron secret
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    // Get all active organizations
    const organizations = await prisma.organization.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
    });

    logger.info(
      { tenantCount: organizations.length },
      "Starting daily metrics collection"
    );

    const results: { tenantId: string; success: boolean; error?: string }[] = [];

    for (const org of organizations) {
      try {
        const tenantPrisma = getPrismaForTenant(org.id);
        await collectDailyMetrics(tenantPrisma, org.id);
        results.push({ tenantId: org.id, success: true });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        results.push({ tenantId: org.id, success: false, error: message });
        logger.error(
          { error, tenantId: org.id },
          "Failed to collect metrics for tenant"
        );
      }
    }

    const successful = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    logger.info(
      { successful, failed, total: organizations.length },
      "Daily metrics collection completed"
    );

    return NextResponse.json({
      message: "Metrics collection completed",
      successful,
      failed,
      total: organizations.length,
    });
  } catch (error) {
    logger.error({ error }, "Failed to run metrics collection");
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
