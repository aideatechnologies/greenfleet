import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { FileUp, Plus } from "lucide-react";
import { getSessionContext, isTenantAdmin } from "@/lib/auth/permissions";
import { getPrismaForTenant } from "@/lib/db/client";
import { getFuelCards } from "@/lib/services/fuel-card-service";
import { getSuppliersByTypeCode } from "@/lib/services/supplier-service";
import { fuelCardFilterSchema } from "@/lib/schemas/fuel-card";
import { Button } from "@/components/ui/button";
import { FuelCardTable } from "./components/FuelCardTable";

export default async function FuelCardsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const ctx = await getSessionContext();
  if (!ctx || !ctx.organizationId) redirect("/login");

  const tenantId = ctx.organizationId;
  const canEdit = await isTenantAdmin(ctx, tenantId);
  if (!canEdit) redirect("/");

  const prisma = getPrismaForTenant(tenantId);

  const params = await searchParams;
  const filters = fuelCardFilterSchema.parse({
    search: typeof params.search === "string" ? params.search : undefined,
    status: typeof params.status === "string" ? params.status : undefined,
    assignmentType: typeof params.assignmentType === "string" ? params.assignmentType : undefined,
    supplierId: typeof params.supplierId === "string" ? params.supplierId : undefined,
    page: typeof params.page === "string" ? params.page : "1",
    pageSize: typeof params.pageSize === "string" ? params.pageSize : "50",
  });

  const [{ data: fuelCards, pagination }, fuelSuppliers] = await Promise.all([
    getFuelCards(prisma, filters),
    getSuppliersByTypeCode(prisma, "CARBURANTE"),
  ]);

  const t = await getTranslations("fuelCards");
  const tCommon = await getTranslations("common");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{t("title")}</h2>
          <p className="text-muted-foreground">
            {t("description")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/fuel-cards/import">
              <FileUp className="mr-2 h-4 w-4" />
              {tCommon("import")}
            </Link>
          </Button>
          <Button asChild>
            <Link href="/fuel-cards/new">
              <Plus className="mr-2 h-4 w-4" />
              {t("newCard")}
            </Link>
          </Button>
        </div>
      </div>

      <FuelCardTable
        fuelCards={fuelCards}
        pagination={pagination}
        suppliers={fuelSuppliers}
      />
    </div>
  );
}
