import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db/client";
import { getFuelTypeMappings } from "@/lib/services/fuel-type-mapping-service";
import { getMacroFuelTypes } from "@/lib/services/macro-fuel-type-service";
import { FuelTypeMappingTable } from "./components/FuelTypeMappingTable";
import { FuelTypeMappingForm } from "./components/FuelTypeMappingForm";

export default async function FuelTypeMappingsPage() {
  const ctx = await getSessionContext();
  if (!ctx || !ctx.organizationId) {
    redirect("/login");
  }

  const canEdit = ctx.role === "owner" || ctx.role === "admin";

  if (!canEdit) {
    redirect("/");
  }

  const [mappings, macroFuelTypes] = await Promise.all([
    getFuelTypeMappings(prisma),
    getMacroFuelTypes(prisma),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Mappatura Carburanti
          </h2>
          <p className="text-muted-foreground">
            Associa i tipi di carburante dei veicoli ai macro tipi per il
            calcolo delle emissioni.
          </p>
        </div>
        <div className="flex gap-2">
          {canEdit && (
            <FuelTypeMappingForm
              mode="create"
              macroFuelTypes={macroFuelTypes as any}
            />
          )}
        </div>
      </div>

      <FuelTypeMappingTable
        mappings={mappings as any}
        macroFuelTypes={macroFuelTypes as any}
        canEdit={canEdit}
      />
    </div>
  );
}
