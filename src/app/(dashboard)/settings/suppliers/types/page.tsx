import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { getSessionContext, isTenantAdmin } from "@/lib/auth/permissions";
import { getPrismaForTenant } from "@/lib/db/client";
import { getSupplierTypes } from "@/lib/services/supplier-type-service";
import { SupplierTypeTable } from "./components/SupplierTypeTable";

export default async function SupplierTypesPage() {
  const ctx = await getSessionContext();
  if (!ctx || !ctx.organizationId) redirect("/login");

  const tenantId = ctx.organizationId;
  const canEdit = await isTenantAdmin(ctx, tenantId);
  if (!canEdit) redirect("/");

  const prisma = getPrismaForTenant(tenantId);
  const types = await getSupplierTypes(prisma, false);

  return (
    <div className="space-y-6">
      <nav className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link href="/settings/suppliers" className="hover:text-foreground transition-colors">
          Fornitori
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground">Tipi Fornitore</span>
      </nav>

      <div>
        <h2 className="text-2xl font-bold tracking-tight">Tipi Fornitore</h2>
        <p className="text-muted-foreground">
          Gestisci i tipi di fornitore disponibili per il tuo tenant.
        </p>
      </div>

      <SupplierTypeTable types={types} />
    </div>
  );
}
