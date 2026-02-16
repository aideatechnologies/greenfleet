import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus } from "lucide-react";
import { getSessionContext, isTenantAdmin } from "@/lib/auth/permissions";
import { getPrismaForTenant } from "@/lib/db/client";
import { getSuppliers } from "@/lib/services/supplier-service";
import { getSupplierTypes } from "@/lib/services/supplier-type-service";
import { seedDefaultSupplierTypes } from "@/lib/services/supplier-type-service";
import { supplierFilterSchema } from "@/lib/schemas/supplier";
import { Button } from "@/components/ui/button";
import { SupplierTable } from "./components/SupplierTable";

export default async function SuppliersPage({
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

  // Ensure default supplier types exist
  const allTypes = await getSupplierTypes(prisma, false);
  if (allTypes.length === 0) {
    await seedDefaultSupplierTypes(prisma);
  }

  const types = await getSupplierTypes(prisma, false);

  const params = await searchParams;
  const filters = supplierFilterSchema.parse({
    search: typeof params.search === "string" ? params.search : undefined,
    supplierTypeId: typeof params.supplierTypeId === "string" ? params.supplierTypeId : undefined,
    isActive: typeof params.isActive === "string" ? params.isActive : "all",
    page: typeof params.page === "string" ? params.page : "1",
    pageSize: typeof params.pageSize === "string" ? params.pageSize : "50",
  });

  const { data: suppliers, pagination } = await getSuppliers(prisma, filters);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Fornitori</h2>
          <p className="text-muted-foreground">
            Gestisci i fornitori NLT, carburante e altri servizi.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/settings/suppliers/types">Gestisci Tipi</Link>
          </Button>
          <Button asChild>
            <Link href="/settings/suppliers/new">
              <Plus className="mr-2 h-4 w-4" />
              Nuovo Fornitore
            </Link>
          </Button>
        </div>
      </div>

      <SupplierTable
        suppliers={suppliers}
        pagination={pagination}
        supplierTypes={types}
      />
    </div>
  );
}
