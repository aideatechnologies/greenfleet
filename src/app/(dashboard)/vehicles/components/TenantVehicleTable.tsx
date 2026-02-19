"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  useReactTable,
  getCoreRowModel,
  type ColumnDef,
  flexRender,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Car,
  Users,
} from "lucide-react";
import { SEARCH_DEBOUNCE_MS, UNCATALOGED_VEHICLE_ID } from "@/lib/utils/constants";
import {
  VehicleStatus,
  VEHICLE_STATUS_LABELS,
} from "@/types/vehicle";
import type { TenantVehicleWithDetails } from "@/lib/services/tenant-vehicle-service";

type TenantVehicleTableProps = {
  vehicles: TenantVehicleWithDetails[];
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
  };
  canEdit: boolean;
  fuelTypeLabels?: Record<string, string>;
};

function statusBadgeClasses(status: string): string {
  switch (status) {
    case VehicleStatus.ACTIVE:
      return "bg-green-600 hover:bg-green-600/90";
    case VehicleStatus.INACTIVE:
      return "bg-amber-100 text-amber-700 hover:bg-amber-100/90";
    case VehicleStatus.DISPOSED:
      return "bg-red-100 text-red-700 hover:bg-red-100/90";
    default:
      return "";
  }
}

function fuelBadgeClasses(fuelType: string): string {
  switch (fuelType) {
    case "ELETTRICO":
      return "bg-emerald-100 text-emerald-800 border-emerald-200";
    case "IBRIDO_BENZINA":
    case "IBRIDO_DIESEL":
      return "bg-sky-100 text-sky-800 border-sky-200";
    case "DIESEL":
      return "bg-amber-100 text-amber-800 border-amber-200";
    case "BENZINA":
      return "bg-red-100 text-red-800 border-red-200";
    default:
      return "bg-secondary text-secondary-foreground";
  }
}

export function TenantVehicleTable({
  vehicles,
  pagination,
  canEdit: _canEdit,
  fuelTypeLabels = {},
}: TenantVehicleTableProps) {
  const t = useTranslations("vehicles");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Search with debounce
  const [searchValue, setSearchValue] = useState(
    searchParams.get("search") ?? ""
  );
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updateSearchParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "") {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      }
      // Reset to page 1 on filter changes (except page changes themselves)
      if (!("page" in updates)) {
        params.delete("page");
      }
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`);
      });
    },
    [searchParams, pathname, router]
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  function handleSearchChange(value: string) {
    setSearchValue(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      updateSearchParams({ search: value || null });
    }, SEARCH_DEBOUNCE_MS);
  }

  function handleStatusFilter(value: string) {
    updateSearchParams({ status: value === "all" ? null : value });
  }

  function handlePageChange(page: number) {
    updateSearchParams({ page: page > 1 ? String(page) : null });
  }

  const columns = useMemo<ColumnDef<TenantVehicleWithDetails>[]>(
    () => [
      {
        id: "image",
        header: "",
        cell: ({ row }) => {
          const imageUrl = row.original.catalogVehicle.imageUrl;
          return (
            <div className="flex size-10 items-center justify-center rounded bg-muted">
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt={`${row.original.catalogVehicle.marca} ${row.original.catalogVehicle.modello}`}
                  className="size-10 rounded object-cover"
                />
              ) : (
                <Car className="size-5 text-muted-foreground" />
              )}
            </div>
          );
        },
        size: 56,
      },
      {
        id: "licensePlate",
        header: t("licensePlate"),
        cell: ({ row }) => (
          <span className="font-mono font-medium uppercase tracking-wider">
            {row.original.licensePlate}
          </span>
        ),
      },
      {
        id: "vehicle",
        header: t("vehicle"),
        cell: ({ row }) => {
          const isUncataloged =
            Number(row.original.catalogVehicleId) === UNCATALOGED_VEHICLE_ID;
          if (isUncataloged) {
            return (
              <span className="text-sm italic text-muted-foreground">
                {t("notCatalogued")}
              </span>
            );
          }
          return (
            <div>
              <span className="font-medium">
                {row.original.catalogVehicle.marca}{" "}
                {row.original.catalogVehicle.modello}
              </span>
              {row.original.catalogVehicle.allestimento && (
                <p className="text-xs text-muted-foreground">
                  {row.original.catalogVehicle.allestimento}
                </p>
              )}
            </div>
          );
        },
      },
      {
        id: "fuelType",
        header: t("fuelType"),
        cell: ({ row }) => {
          const engines = row.original.catalogVehicle?.engines ?? [];
          if (engines.length === 0) return <span className="text-muted-foreground">-</span>;
          const primaryEngine = engines[0];
          const fuelLabel =
            fuelTypeLabels[primaryEngine.fuelType] ??
            primaryEngine.fuelType;
          return (
            <Badge
              variant="outline"
              className={fuelBadgeClasses(primaryEngine.fuelType)}
            >
              {fuelLabel}
            </Badge>
          );
        },
      },
      {
        id: "status",
        header: tCommon("status"),
        cell: ({ row }) => {
          const status = row.original.status as VehicleStatus;
          return (
            <Badge
              variant={status === VehicleStatus.ACTIVE ? "default" : "secondary"}
              className={statusBadgeClasses(status)}
            >
              {VEHICLE_STATUS_LABELS[status] ?? status}
            </Badge>
          );
        },
      },
      {
        id: "employee",
        header: t("assignee"),
        cell: ({ row }) => {
          const emp = row.original.assignedEmployee;
          if (!emp) {
            return <span className="text-muted-foreground">-</span>;
          }
          if (emp.isPool) {
            return (
              <Badge
                variant="default"
                className="bg-indigo-600 hover:bg-indigo-600/90"
              >
                <Users className="mr-1 h-3 w-3" />
                {tCommon("pool")}
              </Badge>
            );
          }
          return (
            <span className="text-sm">
              {emp.firstName} {emp.lastName}
            </span>
          );
        },
      },
      {
        id: "registrationDate",
        header: t("registration"),
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {new Date(row.original.registrationDate).toLocaleDateString(
              "it-IT",
              {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              }
            )}
          </span>
        ),
      },
    ],
    [t, tCommon, fuelTypeLabels]
  );

  const table = useReactTable({
    data: vehicles,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: pagination.totalPages,
  });

  const currentStatusFilter = searchParams.get("status") ?? "all";

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t("searchPlaceholder")}
            value={searchValue}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          value={currentStatusFilter}
          onValueChange={handleStatusFilter}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={tCommon("status")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{tCommon("all")}</SelectItem>
            <SelectItem value={VehicleStatus.ACTIVE}>{tCommon("active")}</SelectItem>
            <SelectItem value={VehicleStatus.INACTIVE}>{tCommon("inactive")}</SelectItem>
            <SelectItem value={VehicleStatus.DISPOSED}>{tCommon("disposed")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Car className="h-8 w-8" />
                    <p>
                      {isPending
                        ? tCommon("loading")
                        : t("noVehiclesFound")}
                    </p>
                    <p className="text-xs">
                      {isPending
                        ? ""
                        : t("addToStart")}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() =>
                    router.push(`/vehicles/${row.original.id}`)
                  }
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {pagination.totalCount} {t("vehiclesTotal")} - {tCommon("page", { page: pagination.page, totalPages: pagination.totalPages })}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page <= 1 || isPending}
            >
              <ChevronLeft className="h-4 w-4" />
              {tCommon("previous")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={
                pagination.page >= pagination.totalPages || isPending
              }
            >
              {tCommon("next")}
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
