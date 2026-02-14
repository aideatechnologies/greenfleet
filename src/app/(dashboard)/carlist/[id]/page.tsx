import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCarlistById } from "@/lib/services/carlist-service";
import { getSessionContext, isTenantAdmin } from "@/lib/auth/permissions";
import { getPrismaForTenant } from "@/lib/db/client";
import { getFuelTypeLabels } from "@/lib/utils/fuel-type-label";
import { CarlistVehicleTable } from "./components/CarlistVehicleTable";
import { CarlistDetailHeader } from "./components/CarlistDetailHeader";

export default async function CarlistDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await getSessionContext();
  if (!ctx || !ctx.organizationId) {
    redirect("/login");
  }

  const { id } = await params;
  const tenantId = ctx.organizationId;
  const canEdit = await isTenantAdmin(ctx, tenantId);

  const prisma = getPrismaForTenant(tenantId);
  const [carlist, fuelTypeLabelsMap] = await Promise.all([
    getCarlistById(prisma, id),
    getFuelTypeLabels(),
  ]);

  if (!carlist) {
    notFound();
  }

  const fuelTypeLabels = Object.fromEntries(fuelTypeLabelsMap);

  return (
    <div className="space-y-6">
      {/* Back link */}
      <div>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/carlist">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Torna alle carlist
          </Link>
        </Button>
      </div>

      {/* Header */}
      <CarlistDetailHeader carlist={carlist} canEdit={canEdit} />

      {/* Vehicle table */}
      <CarlistVehicleTable
        carlistId={carlist.id}
        vehicles={carlist.vehicles}
        canEdit={canEdit}
        fuelTypeLabels={fuelTypeLabels}
      />
    </div>
  );
}
