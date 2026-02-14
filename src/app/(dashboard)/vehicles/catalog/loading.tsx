import { Skeleton } from "@/components/ui/skeleton";

export default function CatalogLoading() {
  return (
    <div className="space-y-4">
      {/* Titolo + descrizione */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-96" />
      </div>

      {/* Barra ricerca + filtri */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <Skeleton className="h-9 w-full sm:w-80" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-36" />
          <Skeleton className="h-9 w-36" />
          <Skeleton className="h-9 w-36" />
        </div>
      </div>

      {/* Intestazione tabella */}
      <Skeleton className="h-10 w-full" />

      {/* Righe tabella placeholder */}
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}

      {/* Paginazione */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-9 w-64" />
      </div>
    </div>
  );
}
