import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { getSessionContext, isTenantAdmin } from "@/lib/auth/permissions";
import { FuelCardForm } from "../components/FuelCardForm";

export default async function NewFuelCardPage() {
  const ctx = await getSessionContext();
  if (!ctx || !ctx.organizationId) redirect("/login");

  const canEdit = await isTenantAdmin(ctx, ctx.organizationId);
  if (!canEdit) redirect("/fuel-cards");

  return (
    <div className="space-y-6">
      <nav className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link href="/fuel-cards" className="hover:text-foreground transition-colors">
          Carte Carburante
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground">Nuova</span>
      </nav>

      <div>
        <h2 className="text-2xl font-bold tracking-tight">Nuova Carta Carburante</h2>
        <p className="text-muted-foreground">
          Compila i dati della nuova carta carburante.
        </p>
      </div>

      <FuelCardForm mode="create" />
    </div>
  );
}
