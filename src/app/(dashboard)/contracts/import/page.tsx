import { redirect } from "next/navigation";
import { getSessionContext, isTenantAdmin } from "@/lib/auth/permissions";
import { ContractImportWizard } from "./components/ContractImportWizard";

export default async function ImportContractsPage() {
  const ctx = await getSessionContext();
  if (!ctx || !ctx.organizationId) {
    redirect("/login");
  }

  const canManage = await isTenantAdmin(ctx, ctx.organizationId);
  if (!canManage) {
    redirect("/contracts");
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          Importa contratti
        </h2>
        <p className="text-muted-foreground">
          Importa contratti da un file CSV o Excel.
        </p>
      </div>
      <ContractImportWizard />
    </div>
  );
}
