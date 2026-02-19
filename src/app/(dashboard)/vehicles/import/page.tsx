import { redirect } from "next/navigation";
import { getSessionContext, isTenantAdmin } from "@/lib/auth/permissions";
import { VehicleImportWizard } from "./components/VehicleImportWizard";

export default async function ImportVehiclesPage() {
  const ctx = await getSessionContext();
  if (!ctx || !ctx.organizationId) {
    redirect("/login");
  }

  const canManage = await isTenantAdmin(ctx, ctx.organizationId);
  if (!canManage) {
    redirect("/vehicles");
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          Importa veicoli
        </h2>
        <p className="text-muted-foreground">
          Importa veicoli nella flotta da un file CSV o Excel.
        </p>
      </div>
      <VehicleImportWizard />
    </div>
  );
}
