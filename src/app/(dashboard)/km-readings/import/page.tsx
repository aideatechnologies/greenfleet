import { redirect } from "next/navigation";
import { getSessionContext, isTenantAdmin } from "@/lib/auth/permissions";
import { KmReadingImportWizard } from "./components/KmReadingImportWizard";

export default async function ImportKmReadingsPage() {
  const ctx = await getSessionContext();
  if (!ctx || !ctx.organizationId) {
    redirect("/login");
  }

  const canManage = await isTenantAdmin(ctx, ctx.organizationId);
  if (!canManage) {
    redirect("/km-readings");
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          Importa rilevazioni km
        </h2>
        <p className="text-muted-foreground">
          Importa rilevazioni chilometriche da un file CSV o Excel.
        </p>
      </div>
      <KmReadingImportWizard />
    </div>
  );
}
