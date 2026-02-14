import { Metadata } from "next";
import { requireAuth, isGlobalAdmin } from "@/lib/auth/permissions";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { CatalogImportPanel } from "./components/CatalogImportPanel";

export const metadata: Metadata = {
  title: "Catalogo InfoCar - Greenfleet",
};

export default async function CatalogImportPage() {
  const authResult = await requireAuth();
  if (!authResult.success) redirect("/login");

  const admin = await isGlobalAdmin(authResult.ctx.userId);
  if (!admin) redirect("/");

  // Stats
  const [totalCatalog, totalEngines, lastSync] = await Promise.all([
    prisma.catalogVehicle.count({ where: { source: "INFOCARDATA" } }),
    prisma.engine.count(),
    prisma.catalogVehicle.findFirst({
      where: { source: "INFOCARDATA", lastSyncAt: { not: null } },
      orderBy: { lastSyncAt: "desc" },
      select: { lastSyncAt: true },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Catalogo InfoCar</h1>
        <p className="text-muted-foreground">
          Importa e sincronizza il catalogo veicoli dal database InfocarData (Quattroruote Professional).
        </p>
      </div>

      <CatalogImportPanel
        totalCatalog={totalCatalog}
        totalEngines={totalEngines}
        lastSyncAt={lastSync?.lastSyncAt?.toISOString() ?? null}
      />
    </div>
  );
}
