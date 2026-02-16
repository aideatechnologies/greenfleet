import { redirect } from "next/navigation";
import { getSessionContext, isTenantAdmin } from "@/lib/auth/permissions";
import { getPrismaForTenant } from "@/lib/db/client";
import { getTargetCurrentEmissions } from "@/lib/services/target-data-loader";
import { calculateTargetProgress } from "@/lib/services/emission-calculator";
import type { TargetPeriod } from "@/types/emission-target";
import { TargetList, type TargetWithProgress } from "./components/TargetList";

export default async function EmissionTargetsPage() {
  const ctx = await getSessionContext();
  if (!ctx || !ctx.organizationId) {
    redirect("/login");
  }

  const tenantId = ctx.organizationId;
  const canEdit = await isTenantAdmin(ctx, tenantId);
  const prisma = getPrismaForTenant(tenantId);

  // Load all emission targets for the tenant
  const targets = await prisma.emissionTarget.findMany({
    include: {
      carlist: {
        select: { id: true, name: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Calculate progress for each target
  const now = new Date();
  const targetsWithProgress = await Promise.all(
    targets.map(async (target) => {
      const currentEmissions = await getTargetCurrentEmissions(prisma, target);
      const progress = calculateTargetProgress(
        target.targetValue,
        currentEmissions,
        target.startDate,
        target.endDate,
        now,
        target.period as TargetPeriod
      );

      return {
        id: target.id,
        scope: target.scope,
        carlistId: target.carlistId,
        carlistName: target.carlist?.name ?? null,
        targetValue: target.targetValue,
        period: target.period,
        startDate: target.startDate.toISOString(),
        endDate: target.endDate.toISOString(),
        description: target.description,
        createdBy: target.createdBy,
        progress: {
          ...progress,
          milestones: progress.milestones.map((m) => ({
            ...m,
            date: m.date.toISOString(),
          })),
        },
      };
    })
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Target Emissioni
          </h2>
          <p className="text-muted-foreground">
            Definisci e monitora gli obiettivi di riduzione delle emissioni
            della tua flotta.
          </p>
        </div>
      </div>
      <TargetList targets={targetsWithProgress as unknown as TargetWithProgress[]} canEdit={canEdit} />
    </div>
  );
}
