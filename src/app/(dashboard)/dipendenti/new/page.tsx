import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionContext, isTenantAdmin } from "@/lib/auth/permissions";
import { EmployeeForm } from "../components/EmployeeForm";
import { ChevronRight } from "lucide-react";

export default async function NewEmployeePage() {
  const ctx = await getSessionContext();
  if (!ctx || !ctx.organizationId) {
    redirect("/login");
  }

  const canManage = await isTenantAdmin(ctx, ctx.organizationId);
  if (!canManage) {
    redirect("/dipendenti");
  }

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link href="/dipendenti" className="hover:text-foreground transition-colors">
          Dipendenti
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground">Nuovo dipendente</span>
      </nav>

      <div>
        <h2 className="text-2xl font-bold tracking-tight">Nuovo dipendente</h2>
        <p className="text-muted-foreground">
          Inserisci i dati del nuovo dipendente.
        </p>
      </div>

      <EmployeeForm mode="create" />
    </div>
  );
}
