import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Plus, Upload } from "lucide-react";
import { getEmployees } from "@/lib/services/employee-service";
import { employeeFilterSchema } from "@/lib/schemas/employee";
import { getSessionContext, isTenantAdmin } from "@/lib/auth/permissions";
import { getPrismaForTenant } from "@/lib/db/client";
import { EmployeeTable } from "./components/EmployeeTable";

export default async function EmployeeListPage({
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

  // Parse search params into filter object
  const filters = employeeFilterSchema.parse({
    search: typeof rawParams.search === "string" ? rawParams.search : undefined,
    isActive:
      typeof rawParams.isActive === "string" ? rawParams.isActive : undefined,
    page: typeof rawParams.page === "string" ? rawParams.page : undefined,
    pageSize:
      typeof rawParams.pageSize === "string" ? rawParams.pageSize : undefined,
    sortBy:
      typeof rawParams.sortBy === "string" ? rawParams.sortBy : undefined,
    sortOrder:
      typeof rawParams.sortOrder === "string" ? rawParams.sortOrder : undefined,
  });

  const prisma = getPrismaForTenant(tenantId);
  const result = await getEmployees(prisma, filters);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Dipendenti</h2>
          <p className="text-muted-foreground">
            Gestisci i dipendenti della tua organizzazione.
          </p>
        </div>
        {canEdit && (
          <div className="flex gap-2">
            <Button variant="secondary" asChild>
              <Link href="/dipendenti/import">
                <Upload className="mr-2 h-4 w-4" />
                Importa da file
              </Link>
            </Button>
            <Button asChild>
              <Link href="/dipendenti/new">
                <Plus className="mr-2 h-4 w-4" />
                Nuovo dipendente
              </Link>
            </Button>
          </div>
        )}
      </div>
      <EmployeeTable
        employees={result.data}
        pagination={result.pagination}
        canEdit={canEdit}
      />
    </div>
  );
}
