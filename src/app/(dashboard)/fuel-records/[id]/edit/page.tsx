import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { getSessionContext, isTenantAdmin } from "@/lib/auth/permissions";
import { getPrismaForTenant } from "@/lib/db/client";
import { FuelRecordForm } from "../../components/FuelRecordForm";

export default async function EditFuelRecordPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await getSessionContext();
  if (!ctx || !ctx.organizationId) {
    redirect("/login");
  }

  const tenantId = ctx.organizationId;

  // Only Fleet Manager (admin) or owner can edit
  const canManage = await isTenantAdmin(ctx, tenantId);
  if (!canManage) {
    redirect("/fuel-records");
  }

  const { id } = await params;
  const prisma = getPrismaForTenant(tenantId);

  const record = await prisma.fuelRecord.findFirst({
    where: { id },
    include: {
      vehicle: {
        include: {
          catalogVehicle: true,
        },
      },
    },
  });

  if (!record) {
    notFound();
  }

  const defaultValues = {
    vehicleId: record.vehicleId,
    date: record.date,
    fuelType: record.fuelType,
    quantityLiters: record.quantityLiters,
    quantityKwh: record.quantityKwh ?? undefined,
    amountEur: record.amountEur,
    odometerKm: record.odometerKm,
    notes: record.notes ?? undefined,
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link
          href="/fuel-records"
          className="hover:text-foreground transition-colors"
        >
          Rifornimenti
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground">Modifica</span>
      </nav>

      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          Modifica rifornimento
        </h2>
        <p className="text-muted-foreground">
          Modifica il rifornimento per{" "}
          <span className="font-mono font-medium uppercase">
            {record.vehicle.licensePlate}
          </span>{" "}
          ({record.vehicle.catalogVehicle.marca}{" "}
          {record.vehicle.catalogVehicle.modello}).
        </p>
      </div>

      <FuelRecordForm
        mode="edit"
        recordId={id}
        defaultValues={defaultValues}
        defaultVehicleId={record.vehicleId}
      />
    </div>
  );
}
