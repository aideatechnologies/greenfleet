import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { getKmReadings } from "@/lib/services/km-reading-service";
import { kmReadingFilterSchema } from "@/lib/schemas/km-reading";
import { getSessionContext, isTenantAdmin } from "@/lib/auth/permissions";
import { getPrismaForTenant } from "@/lib/db/client";
import { KmReadingTable } from "./components/KmReadingTable";

export default async function KmReadingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const ctx = await getSessionContext();
  if (!ctx || !ctx.organizationId) {
    redirect("/login");
  }

  const tenantId = ctx.organizationId;
  const canEdit = await isTenantAdmin(ctx, tenantId);

  const rawParams = await searchParams;

  const filters = kmReadingFilterSchema.parse({
    vehicleId:
      typeof rawParams.vehicleId === "string" ? rawParams.vehicleId : undefined,
    dateFrom:
      typeof rawParams.dateFrom === "string" ? rawParams.dateFrom : undefined,
    dateTo:
      typeof rawParams.dateTo === "string" ? rawParams.dateTo : undefined,
    search:
      typeof rawParams.search === "string" ? rawParams.search : undefined,
    page: typeof rawParams.page === "string" ? rawParams.page : undefined,
    pageSize:
      typeof rawParams.pageSize === "string" ? rawParams.pageSize : undefined,
  });

  const prisma = getPrismaForTenant(tenantId);
  const result = await getKmReadings(prisma, filters);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Rilevazioni Km
          </h2>
          <p className="text-muted-foreground">
            Gestisci le rilevazioni chilometriche dei veicoli della tua flotta.
          </p>
        </div>
        <Button asChild>
          <Link href="/km-readings/new">
            <Plus className="mr-2 h-4 w-4" />
            Nuova rilevazione
          </Link>
        </Button>
      </div>

      <KmReadingTable
        readings={result.data}
        pagination={result.pagination}
        canEdit={canEdit}
      />
    </div>
  );
}
