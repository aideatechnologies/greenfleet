import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Plus, Upload } from "lucide-react";
import { getFuelRecords } from "@/lib/services/fuel-record-service";
import { fuelRecordFilterSchema } from "@/lib/schemas/fuel-record";
import { getSessionContext, isTenantAdmin, isDriver } from "@/lib/auth/permissions";
import { getPrismaForTenant } from "@/lib/db/client";
import { getFuelTypeCO2eFactors } from "@/lib/services/emission-resolution-service";
import { FuelFeed } from "@/components/data-display/FuelFeed";
import { FuelRecordFilters } from "./components/FuelRecordFilters";
import { FuelRecordTable } from "./components/FuelRecordTable";
import { ViewToggle } from "./components/ViewToggle";

export default async function FuelRecordsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const ctx = await getSessionContext();
  if (!ctx || !ctx.organizationId) {
    redirect("/login");
  }

  const tenantId = ctx.organizationId;
  const canEdit = await isTenantAdmin(ctx, tenantId);
  const driverMode = isDriver(ctx);

  const rawParams = await searchParams;

  // Determine view mode (drivers always see feed)
  const viewParam = typeof rawParams.view === "string" ? rawParams.view : undefined;
  const currentView = driverMode ? "feed" : (viewParam === "table" ? "table" : "feed");

  const filters = fuelRecordFilterSchema.parse({
    vehicleId:
      typeof rawParams.vehicleId === "string" ? rawParams.vehicleId : undefined,
    dateFrom:
      typeof rawParams.dateFrom === "string" ? rawParams.dateFrom : undefined,
    dateTo:
      typeof rawParams.dateTo === "string" ? rawParams.dateTo : undefined,
    fuelType:
      typeof rawParams.fuelType === "string" ? rawParams.fuelType : undefined,
    page: typeof rawParams.page === "string" ? rawParams.page : undefined,
    pageSize:
      typeof rawParams.pageSize === "string" ? rawParams.pageSize : undefined,
  });

  const prisma = getPrismaForTenant(tenantId);
  const [result, co2FactorsMap] = await Promise.all([
    getFuelRecords(prisma, filters),
    getFuelTypeCO2eFactors(prisma, new Date()),
  ]);
  const co2Factors = Object.fromEntries(co2FactorsMap);

  const t = await getTranslations("fuelRecords");
  const tCommon = await getTranslations("common");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{t("title")}</h2>
          <p className="text-muted-foreground">
            {t("description")}
          </p>
        </div>
        <div className="flex gap-2">
          {canEdit && (
            <Button variant="outline" asChild>
              <Link href="/fuel-records/import">
                <Upload className="mr-2 h-4 w-4" />
                {tCommon("importCsv")}
              </Link>
            </Button>
          )}
          <Button asChild>
            <Link href="/fuel-records/new">
              <Plus className="mr-2 h-4 w-4" />
              {t("newFuelRecord")}
            </Link>
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <FuelRecordFilters />
        {!driverMode && <ViewToggle currentView={currentView} />}
      </div>

      {currentView === "table" ? (
        <FuelRecordTable
          records={result.data}
          pagination={result.pagination}
          canEdit={canEdit}
          co2Factors={co2Factors}
        />
      ) : (
        <>
          <FuelFeed
            records={result.data}
            variant="full"
            canEdit={!driverMode && canEdit}
            showVehicle={true}
            co2Factors={co2Factors}
          />

          {/* Pagination info */}
          {result.pagination.totalCount > 0 && (
            <div className="flex items-center justify-between border-t pt-4 text-sm text-muted-foreground">
              <span>
                {t("totalCount", { count: result.pagination.totalCount })}
              </span>
              {result.pagination.totalPages > 1 && (
                <div className="flex gap-2">
                  {filters.page > 1 && (
                    <Button variant="outline" size="sm" asChild>
                      <Link
                        href={`/fuel-records?${new URLSearchParams({
                          ...rawParams as Record<string, string>,
                          page: String(filters.page - 1),
                        }).toString()}`}
                      >
                        {tCommon("previous")}
                      </Link>
                    </Button>
                  )}
                  <span className="flex items-center px-2">
                    {tCommon("page", { page: filters.page, totalPages: result.pagination.totalPages })}
                  </span>
                  {filters.page < result.pagination.totalPages && (
                    <Button variant="outline" size="sm" asChild>
                      <Link
                        href={`/fuel-records?${new URLSearchParams({
                          ...rawParams as Record<string, string>,
                          page: String(filters.page + 1),
                        }).toString()}`}
                      >
                        {tCommon("next")}
                      </Link>
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
