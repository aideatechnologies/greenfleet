import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db/client";
import { getGwpConfigs } from "@/lib/services/gwp-config-service";
import { GwpConfigTable } from "./components/GwpConfigTable";
import { GwpConfigForm } from "./components/GwpConfigForm";

export default async function GwpConfigPage() {
  const ctx = await getSessionContext();
  if (!ctx || !ctx.organizationId) {
    redirect("/login");
  }

  const canEdit = ctx.role === "owner" || ctx.role === "admin";

  if (!canEdit) {
    redirect("/");
  }

  const gwpConfigs = await getGwpConfigs(prisma);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Potenziali GWP
          </h2>
          <p className="text-muted-foreground">
            Configura i potenziali di riscaldamento globale (GWP) per i gas
            Kyoto.
          </p>
        </div>
        <div className="flex gap-2">
          {canEdit && <GwpConfigForm mode="create" />}
        </div>
      </div>

      <GwpConfigTable gwpConfigs={gwpConfigs} canEdit={canEdit} />
    </div>
  );
}
