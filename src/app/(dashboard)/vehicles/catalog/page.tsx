import { requireAuth } from "@/lib/auth/permissions";
import { redirect } from "next/navigation";
import { catalogSearchParamsSchema } from "@/lib/schemas/catalog-search";
import { searchCatalog, getFilterOptions } from "@/lib/services/catalog-service";
import { CatalogDataTable } from "./components/CatalogDataTable";
import { CatalogSearchBar } from "./components/CatalogSearchBar";
import { CatalogFilters } from "./components/CatalogFilters";

type CatalogPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CatalogPage({ searchParams }: CatalogPageProps) {
  const authResult = await requireAuth();
  if (!authResult.success) {
    redirect("/login");
  }

  const rawParams = await searchParams;

  // Normalizzo i searchParams (prendo solo la prima stringa per ogni chiave)
  const normalizedParams: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(rawParams)) {
    normalizedParams[key] = Array.isArray(value) ? value[0] : value;
  }

  // Validazione con Zod (fallback a valori di default per campi non validi)
  const parseResult = catalogSearchParamsSchema.safeParse(normalizedParams);

  const params = parseResult.success
    ? parseResult.data
    : catalogSearchParamsSchema.parse({});

  // Query parallele: dati catalogo + opzioni filtri
  const [result, filterOptions] = await Promise.all([
    searchCatalog(params),
    getFilterOptions(),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          Catalogo Veicoli
        </h2>
        <p className="text-muted-foreground">
          Cerca e consulta il catalogo veicoli della piattaforma.
        </p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <CatalogSearchBar defaultValue={params.q ?? ""} />
        <CatalogFilters
          filterOptions={filterOptions}
          currentMarca={params.marca}
          currentCarburante={params.carburante}
          currentNormativa={params.normativa}
        />
      </div>

      <CatalogDataTable
        data={result.data}
        pagination={result.pagination}
        sortBy={params.sortBy}
        sortDir={params.sortDir}
      />
    </div>
  );
}
