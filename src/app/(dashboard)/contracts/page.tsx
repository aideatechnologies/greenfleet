import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { FileCheck, FileUp, Plus } from "lucide-react";
import { getContracts } from "@/lib/services/contract-service";
import { contractFilterSchema } from "@/lib/schemas/contract";
import { getSessionContext, isTenantAdmin } from "@/lib/auth/permissions";
import { getPrismaForTenant } from "@/lib/db/client";
import { ContractTable } from "./components/ContractTable";

export default async function ContractsPage({
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

  const filters = contractFilterSchema.parse({
    search:
      typeof rawParams.search === "string" ? rawParams.search : undefined,
    type: typeof rawParams.type === "string" ? rawParams.type : undefined,
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
  const result = await getContracts(prisma, filters);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Contratti</h2>
          <p className="text-muted-foreground">
            Gestisci i contratti dei veicoli della tua flotta.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/contracts/status">
              <FileCheck className="mr-2 h-4 w-4" />
              Stato contrattuale
            </Link>
          </Button>
          {canEdit && (
            <>
              <Button variant="outline" asChild>
                <Link href="/contracts/import">
                  <FileUp className="mr-2 h-4 w-4" />
                  Importa
                </Link>
              </Button>
              <Button asChild>
                <Link href="/contracts/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Nuovo contratto
                </Link>
              </Button>
            </>
          )}
        </div>
      </div>
      <ContractTable
        contracts={result.data}
        pagination={result.pagination}
        canEdit={canEdit}
      />
    </div>
  );
}
