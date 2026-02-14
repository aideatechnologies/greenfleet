import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/auth/permissions";
import { listConversionConfigs } from "@/lib/services/emission-conversion-service";
import { ConversionConfigTable } from "./components/ConversionConfigTable";
import { ConversionConfigForm } from "./components/ConversionConfigForm";
import { RecalculateButton } from "./components/RecalculateButton";

export default async function EmissionStandardsPage() {
  const ctx = await getSessionContext();
  if (!ctx || !ctx.organizationId) {
    redirect("/login");
  }

  const canEdit = ctx.role === "owner" || ctx.role === "admin";

  if (!canEdit) {
    redirect("/");
  }

  const configs = await listConversionConfigs();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Standard Emissioni
          </h2>
          <p className="text-muted-foreground">
            Gestisci le configurazioni di conversione tra standard WLTP e NEDC.
          </p>
        </div>
        <div className="flex gap-2">
          <RecalculateButton />
          <ConversionConfigForm mode="create" />
        </div>
      </div>

      <ConversionConfigTable configs={configs} />
    </div>
  );
}
