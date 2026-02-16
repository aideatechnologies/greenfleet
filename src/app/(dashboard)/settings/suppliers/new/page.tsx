import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { getSessionContext, isTenantAdmin } from "@/lib/auth/permissions";
import { SupplierForm } from "../components/SupplierForm";

export default async function NewSupplierPage() {
  const ctx = await getSessionContext();
  if (!ctx || !ctx.organizationId) redirect("/login");

  const canEdit = await isTenantAdmin(ctx, ctx.organizationId);
  if (!canEdit) redirect("/settings/suppliers");

  return (
    <div className="space-y-6">
      <nav className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link href="/settings/suppliers" className="hover:text-foreground transition-colors">
          Fornitori
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground">Nuovo</span>
      </nav>

      <div>
        <h2 className="text-2xl font-bold tracking-tight">Nuovo Fornitore</h2>
        <p className="text-muted-foreground">
          Compila i dati del nuovo fornitore.
        </p>
      </div>

      <SupplierForm mode="create" />
    </div>
  );
}
