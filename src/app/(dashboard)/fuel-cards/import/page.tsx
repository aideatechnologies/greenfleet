import { redirect } from "next/navigation";
import { getSessionContext, isTenantAdmin } from "@/lib/auth/permissions";
import { FuelCardImportWizard } from "./components/FuelCardImportWizard";

export default async function ImportFuelCardsPage() {
  const ctx = await getSessionContext();
  if (!ctx || !ctx.organizationId) {
    redirect("/login");
  }

  const canManage = await isTenantAdmin(ctx, ctx.organizationId);
  if (!canManage) {
    redirect("/fuel-cards");
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          Importa carte carburante
        </h2>
        <p className="text-muted-foreground">
          Importa carte carburante da un file CSV o Excel.
        </p>
      </div>
      <FuelCardImportWizard />
    </div>
  );
}
