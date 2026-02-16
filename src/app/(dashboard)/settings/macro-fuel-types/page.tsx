import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db/client";
import { getMacroFuelTypes } from "@/lib/services/macro-fuel-type-service";
import { MacroFuelTypeTable } from "./components/MacroFuelTypeTable";
import { MacroFuelTypeForm } from "./components/MacroFuelTypeForm";

export default async function MacroFuelTypesPage() {
  const ctx = await getSessionContext();
  if (!ctx || !ctx.organizationId) {
    redirect("/login");
  }

  const canEdit = ctx.role === "owner" || ctx.role === "admin";

  if (!canEdit) {
    redirect("/");
  }

  const macroFuelTypes = await getMacroFuelTypes(prisma, {
    includeInactive: true,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Macro Tipi Carburante
          </h2>
          <p className="text-muted-foreground">
            Gestisci i macro tipi di carburante e il relativo scope emissivo.
          </p>
        </div>
        <div className="flex gap-2">
          {canEdit && <MacroFuelTypeForm mode="create" />}
        </div>
      </div>

      {/* bigint→number at runtime via Prisma extension */}
      <MacroFuelTypeTable macroFuelTypes={macroFuelTypes as any} canEdit={canEdit} />
    </div>
  );
}
