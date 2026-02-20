import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { getSessionContext, isTenantAdmin } from "@/lib/auth/permissions";
import { getPrismaForTenant } from "@/lib/db/client";
import { getFuelCardById } from "@/lib/services/fuel-card-service";
import { FuelCardForm } from "../../components/FuelCardForm";

export default async function EditFuelCardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: rawId } = await params;
  const id = Number(rawId);
  if (Number.isNaN(id)) notFound();

  const ctx = await getSessionContext();
  if (!ctx || !ctx.organizationId) redirect("/login");

  const tenantId = ctx.organizationId;
  const canEdit = await isTenantAdmin(ctx, tenantId);
  if (!canEdit) redirect("/fuel-cards");

  const prisma = getPrismaForTenant(tenantId);
  const fuelCard = await getFuelCardById(prisma, id);
  if (!fuelCard) notFound();

  const defaultValues = {
    cardNumber: fuelCard.cardNumber,
    supplierId: String(fuelCard.supplierId),
    expiryDate: fuelCard.expiryDate ? new Date(fuelCard.expiryDate) : undefined,
    status: fuelCard.status as "ACTIVE" | "EXPIRED" | "SUSPENDED",
    assignmentType: fuelCard.assignmentType as "VEHICLE" | "EMPLOYEE" | "JOLLY",
    assignedVehicleId: fuelCard.assignedVehicleId != null ? String(fuelCard.assignedVehicleId) : "",
    assignedEmployeeId: fuelCard.assignedEmployeeId != null ? String(fuelCard.assignedEmployeeId) : "",
    notes: fuelCard.notes ?? "",
  };

  return (
    <div className="space-y-6">
      <nav className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link href="/fuel-cards" className="hover:text-foreground transition-colors">
          Carte Carburante
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground">{fuelCard.cardNumber}</span>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground">Modifica</span>
      </nav>

      <div>
        <h2 className="text-2xl font-bold tracking-tight">Modifica Carta Carburante</h2>
        <p className="text-muted-foreground">
          Aggiorna i dati della carta <strong>{fuelCard.cardNumber}</strong>.
        </p>
      </div>

      <FuelCardForm mode="edit" fuelCardId={String(id)} defaultValues={defaultValues} />
    </div>
  );
}
