import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { FileUp, Plus } from "lucide-react";
import { getTenantVehicles } from "@/lib/services/tenant-vehicle-service";
import { tenantVehicleFilterSchema } from "@/lib/schemas/tenant-vehicle";
import { getSessionContext, isTenantAdmin } from "@/lib/auth/permissions";
import { getPrismaForTenant } from "@/lib/db/client";
import { TenantVehicleTable } from "./components/TenantVehicleTable";

export default async function VehiclesPage({
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

  const filters = tenantVehicleFilterSchema.parse({
    search:
      typeof rawParams.search === "string" ? rawParams.search : undefined,
    status:
      typeof rawParams.status === "string" ? rawParams.status : undefined,
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
  const result = await getTenantVehicles(prisma, filters);

  const t = await getTranslations("vehicles");
  const tCommon = await getTranslations("common");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{t("title")}</h2>
          <p className="text-muted-foreground">
            {t("description")}
          </p>
        </div>
        {canEdit && (
          <div className="flex items-center gap-2">
            <Button variant="outline" asChild>
              <Link href="/vehicles/import">
                <FileUp className="mr-2 h-4 w-4" />
                {tCommon("import")}
              </Link>
            </Button>
            <Button asChild>
              <Link href="/vehicles/new">
                <Plus className="mr-2 h-4 w-4" />
                {t("addVehicle")}
              </Link>
            </Button>
          </div>
        )}
      </div>
      <TenantVehicleTable
        vehicles={result.data}
        pagination={result.pagination}
        canEdit={canEdit}
      />
    </div>
  );
}
