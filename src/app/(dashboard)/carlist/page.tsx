import { redirect } from "next/navigation";
import { getCarlists } from "@/lib/services/carlist-service";
import { carlistFilterSchema } from "@/lib/schemas/carlist";
import { getSessionContext, isTenantAdmin } from "@/lib/auth/permissions";
import { getPrismaForTenant } from "@/lib/db/client";
import { CarlistTable } from "./components/CarlistTable";

export default async function CarlistPage({
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

  const filters = carlistFilterSchema.parse({
    search:
      typeof rawParams.search === "string" ? rawParams.search : undefined,
    page: typeof rawParams.page === "string" ? rawParams.page : undefined,
    pageSize:
      typeof rawParams.pageSize === "string" ? rawParams.pageSize : undefined,
    sortBy:
      typeof rawParams.sortBy === "string" ? rawParams.sortBy : undefined,
    sortOrder:
      typeof rawParams.sortOrder === "string"
        ? rawParams.sortOrder
        : undefined,
  });

  const prisma = getPrismaForTenant(tenantId);
  const result = await getCarlists(prisma, filters);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Carlist</h2>
          <p className="text-muted-foreground">
            Gestisci i raggruppamenti dei veicoli della tua flotta.
          </p>
        </div>
      </div>
      <CarlistTable
        carlists={result.data}
        pagination={result.pagination}
        canEdit={canEdit}
      />
    </div>
  );
}
