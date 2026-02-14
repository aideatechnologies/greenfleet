import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { getSessionContext, isTenantAdmin } from "@/lib/auth/permissions";
import { getPrismaForTenant } from "@/lib/db/client";
import { KmReadingForm } from "../../components/KmReadingForm";

export default async function EditKmReadingPage({
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
    redirect("/km-readings");
  }

  const { id } = await params;
  const prisma = getPrismaForTenant(tenantId);

  const reading = await prisma.kmReading.findFirst({
    where: { id },
    include: {
      vehicle: {
        include: {
          catalogVehicle: true,
        },
      },
    },
  });

  if (!reading) {
    notFound();
  }

  const defaultValues = {
    vehicleId: reading.vehicleId,
    date: reading.date,
    odometerKm: reading.odometerKm,
    notes: reading.notes ?? undefined,
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link
          href="/km-readings"
          className="hover:text-foreground transition-colors"
        >
          Rilevazioni Km
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground">Modifica</span>
      </nav>

      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          Modifica rilevazione km
        </h2>
        <p className="text-muted-foreground">
          Modifica la rilevazione chilometrica per{" "}
          <span className="font-mono font-medium uppercase">
            {reading.vehicle.licensePlate}
          </span>{" "}
          ({reading.vehicle.catalogVehicle.marca}{" "}
          {reading.vehicle.catalogVehicle.modello}).
        </p>
      </div>

      <KmReadingForm
        mode="edit"
        recordId={id}
        defaultValues={defaultValues}
        defaultVehicleId={reading.vehicleId}
      />
    </div>
  );
}
