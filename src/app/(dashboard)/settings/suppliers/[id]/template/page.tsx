import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSessionContext, isTenantAdmin } from "@/lib/auth/permissions";
import { getPrismaForTenant } from "@/lib/db/client";
import { getSupplierById } from "@/lib/services/supplier-service";
import { getXmlTemplatesBySupplier } from "@/lib/services/xml-template-service";
import { ChevronRight } from "lucide-react";
import { XmlTemplateEditor } from "./components/XmlTemplateEditor";

export default async function TemplatePage({
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

  const templates = await getXmlTemplatesBySupplier(prisma, id);

  return (
    <div className="space-y-6">
      <nav className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link href="/settings" className="hover:text-foreground transition-colors">
          Configurazione
        </Link>
        <ChevronRight className="h-4 w-4" />
        <Link href="/settings/suppliers" className="hover:text-foreground transition-colors">
          Fornitori
        </Link>
        <ChevronRight className="h-4 w-4" />
        <Link href={`/settings/suppliers/${id}/edit`} className="hover:text-foreground transition-colors">
          {supplier.name}
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground">Template XML</span>
      </nav>

      <div>
        <h2 className="text-2xl font-bold tracking-tight">Template XML</h2>
        <p className="text-muted-foreground">
          Configura i template per l&apos;importazione XML di <strong>{supplier.name}</strong>.
        </p>
      </div>

      <XmlTemplateEditor
        supplierId={id}
        supplierName={supplier.name}
        templates={templates}
      />
    </div>
  );
}
