import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { getSessionContext, isTenantAdmin } from "@/lib/auth/permissions";
import { getPrismaForTenant } from "@/lib/db/client";
import { getImportById } from "@/lib/services/invoice-import-service";
import { ImportReviewClient } from "./ImportReviewClient";

type PageProps = {
  params: Promise<{ importId: string }>;
};

export default async function ImportDetailPage({ params }: PageProps) {
  const { importId } = await params;

  const ctx = await getSessionContext();
  if (!ctx || !ctx.organizationId) redirect("/login");
  const canEdit = await isTenantAdmin(ctx, ctx.organizationId);
  if (!canEdit) redirect("/fuel-records");

  const prisma = getPrismaForTenant(ctx.organizationId);
  const importData = await getImportById(prisma, importId);
  if (!importData) notFound();

  return (
    <div className="space-y-6">
      <nav className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link
          href="/fuel-records"
          className="hover:text-foreground transition-colors"
        >
          Rifornimenti
        </Link>
        <ChevronRight className="h-4 w-4" />
        <Link
          href="/fuel-records/import-xml"
          className="hover:text-foreground transition-colors"
        >
          Import Fatture XML
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground">
          {importData.fileName}
        </span>
      </nav>

      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          Revisione Import
        </h2>
        <p className="text-muted-foreground">
          {importData.template.name} &mdash; {importData.template.supplier.name}
          {importData.invoiceNumber && <> &mdash; Fattura n. {importData.invoiceNumber}</>}
        </p>
      </div>

      <ImportReviewClient importData={JSON.parse(JSON.stringify(importData))} />
    </div>
  );
}
