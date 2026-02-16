import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db/client";
import { getEmissionFactors } from "@/lib/services/emission-factor-service";
import { getMacroFuelTypes } from "@/lib/services/macro-fuel-type-service";
import { getFuelTypeLabels } from "@/lib/utils/fuel-type-label";
import { emissionFactorFilterSchema } from "@/lib/schemas/emission-factor";
import { EmissionFactorTable } from "./components/EmissionFactorTable";
import { EmissionFactorForm } from "./components/EmissionFactorForm";
import { Button } from "@/components/ui/button";
import Link from "next/link";

// Local type alias matching component expectations (bigint→number at runtime via Prisma extension)
type MacroFuelTypeRef = { id: number; name: string; scope: number; unit: string };

export default async function EmissionFactorsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const ctx = await getSessionContext();
  if (!ctx || !ctx.organizationId) {
    redirect("/login");
  }

  const canEdit = ctx.role === "owner" || ctx.role === "admin";

  if (!canEdit) {
    redirect("/");
  }

  const rawParams = await searchParams;

  const filters = emissionFactorFilterSchema.parse({
    macroFuelTypeId:
      typeof rawParams.macroFuelTypeId === "string"
        ? rawParams.macroFuelTypeId
        : undefined,
    dateFrom:
      typeof rawParams.dateFrom === "string" ? rawParams.dateFrom : undefined,
    dateTo:
      typeof rawParams.dateTo === "string" ? rawParams.dateTo : undefined,
    page: typeof rawParams.page === "string" ? rawParams.page : undefined,
    pageSize:
      typeof rawParams.pageSize === "string" ? rawParams.pageSize : undefined,
  });

  const [result, macroFuelTypes, fuelTypeLabelsMap] = await Promise.all([
    getEmissionFactors(prisma, filters),
    getMacroFuelTypes(prisma),
    getFuelTypeLabels(),
  ]);

  const fuelTypeOptions = Array.from(fuelTypeLabelsMap.entries()).map(
    ([value, label]) => ({ value, label })
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Fattori di Emissione
          </h2>
          <p className="text-muted-foreground">
            Gestisci i fattori di emissione per macro tipo carburante e gas
            Kyoto.
          </p>
        </div>
        <div className="flex gap-2">
          {canEdit && (
            <EmissionFactorForm
              mode="create"
              macroFuelTypes={macroFuelTypes as unknown as MacroFuelTypeRef[]}
              fuelTypeOptions={fuelTypeOptions}
            />
          )}
        </div>
      </div>

      <EmissionFactorTable
        /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
        factors={result.data as any}
        macroFuelTypes={macroFuelTypes as unknown as MacroFuelTypeRef[]}
        fuelTypeOptions={fuelTypeOptions}
        canEdit={canEdit}
      />

      {/* Pagination */}
      {result.pagination.totalCount > 0 && (
        <div className="flex items-center justify-between border-t pt-4 text-sm text-muted-foreground">
          <span>
            {result.pagination.totalCount} fattor
            {result.pagination.totalCount === 1 ? "e" : "i"} totali
          </span>
          {result.pagination.totalPages > 1 && (
            <div className="flex gap-2">
              {filters.page > 1 && (
                <Button variant="outline" size="sm" asChild>
                  <Link
                    href={`/settings/emission-factors?${new URLSearchParams({
                      ...(rawParams as Record<string, string>),
                      page: String(filters.page - 1),
                    }).toString()}`}
                  >
                    Precedente
                  </Link>
                </Button>
              )}
              <span className="flex items-center px-2">
                Pagina {filters.page} di {result.pagination.totalPages}
              </span>
              {filters.page < result.pagination.totalPages && (
                <Button variant="outline" size="sm" asChild>
                  <Link
                    href={`/settings/emission-factors?${new URLSearchParams({
                      ...(rawParams as Record<string, string>),
                      page: String(filters.page + 1),
                    }).toString()}`}
                  >
                    Successiva
                  </Link>
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
