import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { getSessionContext, isTenantAdmin } from "@/lib/auth/permissions";
import { XmlImportWizard } from "./components/XmlImportWizard";

export default async function ImportXmlPage() {
  const ctx = await getSessionContext();
  if (!ctx || !ctx.organizationId) redirect("/login");
  const canEdit = await isTenantAdmin(ctx, ctx.organizationId);
  if (!canEdit) redirect("/fuel-records");

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
        <span className="text-foreground">Import Fatture XML</span>
      </nav>
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          Import Fatture XML
        </h2>
        <p className="text-muted-foreground">
          Importa fatture XML FatturaPA e riconcilia con i rifornimenti
          esistenti.
        </p>
      </div>
      <XmlImportWizard />
    </div>
  );
}
