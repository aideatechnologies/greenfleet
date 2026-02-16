import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { getSessionContext, isTenantAdmin } from "@/lib/auth/permissions";
import { getPrismaForTenant } from "@/lib/db/client";
import { getSupplierById } from "@/lib/services/supplier-service";
import { SupplierForm } from "../../components/SupplierForm";
import type { CreateSupplierInput } from "@/lib/schemas/supplier";

export default async function EditSupplierPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await getSessionContext();
  if (!ctx || !ctx.organizationId) redirect("/login");

  const tenantId = ctx.organizationId;
  const canEdit = await isTenantAdmin(ctx, tenantId);
  if (!canEdit) redirect("/settings/suppliers");

  const prisma = getPrismaForTenant(tenantId);
  const supplier = await getSupplierById(prisma, id);
  if (!supplier) notFound();

  const defaultValues: CreateSupplierInput = {
    supplierTypeId: supplier.supplierTypeId,
    name: supplier.name,
    vatNumber: supplier.vatNumber ?? "",
    address: supplier.address ?? "",
    pec: supplier.pec ?? "",
    contactName: supplier.contactName ?? "",
    contactPhone: supplier.contactPhone ?? "",
    contactEmail: supplier.contactEmail ?? "",
    notes: supplier.notes ?? "",
  };

  return (
    <div className="space-y-6">
      <nav className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link href="/settings/suppliers" className="hover:text-foreground transition-colors">
          Fornitori
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground">{supplier.name}</span>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground">Modifica</span>
      </nav>

      <div>
        <h2 className="text-2xl font-bold tracking-tight">Modifica Fornitore</h2>
        <p className="text-muted-foreground">
          Aggiorna i dati di <strong>{supplier.name}</strong>.
        </p>
      </div>

      <SupplierForm mode="edit" supplierId={id} defaultValues={defaultValues} />
    </div>
  );
}
