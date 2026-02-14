import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { ManualVehicleForm } from "../components/ManualVehicleForm";

export default function NewManualVehiclePage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Breadcrumb */}
      <nav
        aria-label="Breadcrumb"
        className="flex items-center gap-1 text-sm text-muted-foreground"
      >
        <Link href="/vehicles/catalog" className="hover:text-foreground">
          Catalogo veicoli
        </Link>
        <ChevronRight className="size-4" />
        <span className="text-foreground">Nuovo veicolo</span>
      </nav>

      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          Nuovo veicolo (inserimento manuale)
        </h2>
        <p className="text-muted-foreground">
          Compila i dati del veicolo e aggiungi almeno un motore per inserirlo
          nel catalogo globale.
        </p>
      </div>

      {/* Form */}
      <ManualVehicleForm />
    </div>
  );
}
