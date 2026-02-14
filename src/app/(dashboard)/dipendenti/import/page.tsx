import { redirect } from "next/navigation";
import { getSessionContext, isTenantAdmin } from "@/lib/auth/permissions";
import { ImportWizard } from "./components/ImportWizard";

export default async function ImportEmployeesPage() {
  const ctx = await getSessionContext();
  if (!ctx || !ctx.organizationId) {
    redirect("/login");
  }

  const canManage = await isTenantAdmin(ctx, ctx.organizationId);
  if (!canManage) {
    redirect("/dipendenti");
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          Importa dipendenti
        </h2>
        <p className="text-muted-foreground">
          Importa dipendenti da un file CSV o Excel.
        </p>
      </div>
      <ImportWizard />
    </div>
  );
}
