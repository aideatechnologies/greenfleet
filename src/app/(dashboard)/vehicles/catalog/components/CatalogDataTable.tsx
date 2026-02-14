"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback } from "react";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight } from "lucide-react";
import { formatEmissions, formatPower } from "@/lib/utils/format";
import { PAGE_SIZE_OPTIONS } from "@/lib/utils/constants";
import type { CatalogVehicleWithEngines } from "@/lib/services/catalog-service";

// ---------------------------------------------------------------------------
// Tipo paginazione (allineato a PaginatedResult)
// ---------------------------------------------------------------------------

type PaginationInfo = {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
};

type CatalogDataTableProps = {
  data: CatalogVehicleWithEngines[];
  pagination: PaginationInfo;
  sortBy?: string;
  sortDir: string;
  fuelTypeLabels?: Record<string, string>;
};

// ---------------------------------------------------------------------------
// Colore badge carburante
// ---------------------------------------------------------------------------

function fuelBadgeVariant(
  fuelType: string
): "default" | "secondary" | "outline" | "destructive" {
  switch (fuelType) {
    case "ELETTRICO":
      return "default";
    case "IBRIDO_BENZINA":
    case "IBRIDO_DIESEL":
      return "secondary";
    default:
      return "outline";
  }
}

// ---------------------------------------------------------------------------
// Definizione colonne
// ---------------------------------------------------------------------------

function buildColumns(fuelTypeLabels: Record<string, string>): ColumnDef<CatalogVehicleWithEngines, unknown>[] {
  return [
    {
      accessorKey: "marca",
      header: "Marca",
      cell: ({ row }) => (
        <span className="font-medium">{row.original.marca}</span>
      ),
    },
    {
      accessorKey: "modello",
      header: "Modello",
    },
    {
      accessorKey: "allestimento",
      header: "Allestimento",
      cell: ({ row }) => row.original.allestimento ?? "-",
    },
    {
      accessorKey: "carrozzeria",
      header: "Carrozzeria",
      cell: ({ row }) => row.original.carrozzeria ?? "-",
    },
    {
      accessorKey: "normativa",
      header: "Normativa",
      cell: ({ row }) =>
        row.original.normativa ? (
          <Badge variant="secondary">{row.original.normativa}</Badge>
        ) : (
          "-"
        ),
    },
    {
      id: "carburante",
      header: "Carburante",
      cell: ({ row }) => {
        const engine = row.original.engines[0];
        if (!engine) return "-";
        const label =
          fuelTypeLabels[engine.fuelType] ?? engine.fuelType;
        return (
          <Badge variant={fuelBadgeVariant(engine.fuelType)}>{label}</Badge>
        );
      },
    },
    {
      id: "co2",
      header: "CO2",
      cell: ({ row }) => {
        const engine = row.original.engines[0];
        if (!engine?.co2GKm) return "-";
        return (
          <span className="tabular-nums">{formatEmissions(engine.co2GKm)}</span>
        );
      },
    },
    {
      id: "potenza",
      header: "Potenza",
      cell: ({ row }) => {
        const engine = row.original.engines[0];
        if (!engine?.potenzaKw) return "-";
        return (
          <span className="tabular-nums">{formatPower(engine.potenzaKw)}</span>
        );
      },
    },
  ];
}

// ---------------------------------------------------------------------------
// Colonne ordinabili (corrispondono al sortBy ammesso)
// ---------------------------------------------------------------------------

const sortableColumns = new Set(["marca", "modello", "allestimento", "normativa"]);

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

export function CatalogDataTable({
  data,
  pagination,
  sortBy,
  sortDir,
  fuelTypeLabels = {},
}: CatalogDataTableProps) {
  const columns = buildColumns(fuelTypeLabels);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const updateSearchParams = useCallback(
    (updates: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === undefined || value === "") {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      }
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams]
  );

  // Toggle sorting
  const handleSort = useCallback(
    (columnId: string) => {
      if (!sortableColumns.has(columnId)) return;

      let newDir: string;
      if (sortBy === columnId) {
        // Ciclo: asc -> desc -> rimuovi
        if (sortDir === "asc") {
          newDir = "desc";
        } else {
          // Rimuovi ordinamento
          updateSearchParams({ sortBy: undefined, sortDir: undefined, page: "1" });
          return;
        }
      } else {
        newDir = "asc";
      }

      updateSearchParams({ sortBy: columnId, sortDir: newDir, page: "1" });
    },
    [sortBy, sortDir, updateSearchParams]
  );

  // Navigazione a pagina
  const goToPage = useCallback(
    (page: number) => {
      updateSearchParams({ page: String(page) });
    },
    [updateSearchParams]
  );

  // Cambio page size
  const changePageSize = useCallback(
    (size: string) => {
      updateSearchParams({ pageSize: size, page: "1" });
    },
    [updateSearchParams]
  );

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
    rowCount: pagination.totalCount,
  });

  return (
    <div className="space-y-4">
      {/* Tabella */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const isSortable = sortableColumns.has(
                    header.column.id
                  );
                  const isCurrentSort = sortBy === header.column.id;

                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder ? null : isSortable ? (
                        <button
                          type="button"
                          className="flex items-center gap-1 hover:text-foreground transition-colors"
                          onClick={() => handleSort(header.column.id)}
                        >
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                          {isCurrentSort ? (
                            sortDir === "asc" ? (
                              <ArrowUp className="size-3.5" />
                            ) : (
                              <ArrowDown className="size-3.5" />
                            )
                          ) : (
                            <ArrowUpDown className="size-3.5 opacity-40" />
                          )}
                        </button>
                      ) : (
                        flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="text-center text-muted-foreground py-8"
                >
                  Nessun veicolo trovato
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="cursor-pointer"
                  onClick={() =>
                    router.push(
                      `/vehicles/catalog/${row.original.id}`
                    )
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

      {/* Paginazione */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {pagination.totalCount === 0
            ? "Nessun risultato"
            : `${(pagination.page - 1) * pagination.pageSize + 1}-${Math.min(
                pagination.page * pagination.pageSize,
                pagination.totalCount
              )} di ${pagination.totalCount} veicoli`}
        </p>

        <div className="flex items-center gap-4">
          {/* Selettore page size */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground whitespace-nowrap">
              Righe per pagina
            </span>
            <Select
              value={String(pagination.pageSize)}
              onValueChange={changePageSize}
            >
              <SelectTrigger className="w-[70px]" size="sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Navigazione pagine */}
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon-sm"
              disabled={pagination.page <= 1}
              onClick={() => goToPage(pagination.page - 1)}
              aria-label="Pagina precedente"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <span className="px-2 text-sm tabular-nums">
              {pagination.page} / {pagination.totalPages || 1}
            </span>
            <Button
              variant="outline"
              size="icon-sm"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => goToPage(pagination.page + 1)}
              aria-label="Pagina successiva"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
