import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { getSessionContext, isDriver } from "@/lib/auth/permissions";
import { FuelRecordForm } from "../components/FuelRecordForm";

export default async function NewFuelRecordPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const ctx = await getSessionContext();
  if (!ctx || !ctx.organizationId) {
    redirect("/login");
  }

  const rawParams = await searchParams;
  const defaultVehicleId =
    typeof rawParams.vehicleId === "string" ? rawParams.vehicleId : undefined;

  const driverMode = isDriver(ctx);

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
        <span className="text-foreground">Nuovo</span>
      </nav>

      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          Nuovo rifornimento
        </h2>
        <p className="text-muted-foreground">
          Registra un nuovo rifornimento per un veicolo della flotta.
        </p>
      </div>

      <FuelRecordForm
        defaultVehicleId={defaultVehicleId}
        isDriver={driverMode}
      />
    </div>
  );
}
