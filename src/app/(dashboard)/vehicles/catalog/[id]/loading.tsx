import { Skeleton } from "@/components/ui/skeleton";

export default function CatalogVehicleDetailLoading() {
  return (
    <div className="space-y-6">
      {/* Pulsante indietro */}
      <Skeleton className="h-9 w-32" />

      {/* Titolo */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-4 w-48" />
      </div>

      {/* Layout 2 colonne */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Card dati identificativi */}
        <div className="space-y-4">
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>

        {/* Card motori */}
        <div className="space-y-4">
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}
