import { redirect } from "next/navigation";
import { getSessionContext, isTenantAdmin } from "@/lib/auth/permissions";
import { FuelRecordImportWizard } from "./components/FuelRecordImportWizard";

export default async function ImportFuelRecordsPage() {
  const ctx = await getSessionContext();
  if (!ctx || !ctx.organizationId) {
    redirect("/login");
  }

  const canManage = await isTenantAdmin(ctx, ctx.organizationId);
  if (!canManage) {
    redirect("/fuel-records");
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          Importa rifornimenti
        </h2>
        <p className="text-muted-foreground">
          Importa rifornimenti da un file CSV o Excel.
        </p>
      </div>
      <FuelRecordImportWizard />
    </div>
  );
}
