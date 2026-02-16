"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  type ColumnDef,
  type SortingState,
  flexRender,
} from "@tanstack/react-table";
import { format } from "date-fns";
import { it } from "date-fns/locale";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreHorizontal,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Gauge,
  ArrowUpDown,
  Search,
  X,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { ConfirmDialog } from "@/components/forms/ConfirmDialog";
import type { KmReadingWithDetails } from "@/lib/services/km-reading-service";
import { deleteKmReadingAction } from "../actions/delete-km-reading";

// ---------------------------------------------------------------------------
// Formatting helpers (IT locale)
// ---------------------------------------------------------------------------

const kmFmt = new Intl.NumberFormat("it-IT");

// ---------------------------------------------------------------------------
// Source labels
// ---------------------------------------------------------------------------

const SOURCE_LABELS: Record<string, string> = {
  MANUAL: "Manuale",
  IMPORT_CSV: "Importazione CSV",
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type KmReadingTableProps = {
  readings: KmReadingWithDetails[];
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
  };
  canEdit: boolean;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function KmReadingTable({
  readings,
  pagination,
  canEdit,
}: KmReadingTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [sorting, setSorting] = useState<SortingState>([
    { id: "date", desc: true },
  ]);

  // Delete confirm dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    readingId: number | string;
    vehicleInfo: string;
  }>({ open: false, readingId: "", vehicleInfo: "" });
  const [isDeleting, setIsDeleting] = useState(false);

  // Filter state from URL
  const currentSearch = searchParams.get("search") ?? "";
  const currentVehicleId = searchParams.get("vehicleId") ?? "";
  const currentDateFrom = searchParams.get("dateFrom") ?? "";
  const currentDateTo = searchParams.get("dateTo") ?? "";

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
      // Reset page when filters change
      if (!("page" in updates)) {
        params.delete("page");
      }
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`);
      });
    },
    [searchParams, pathname, router]
  );

  function handlePageChange(page: number) {
    updateSearchParams({ page: page > 1 ? String(page) : null });
  }

  const hasFilters = currentSearch !== "" || currentVehicleId !== "" || currentDateFrom !== "" || currentDateTo !== "";

  function clearFilters() {
    router.push(pathname);
  }

  async function handleConfirmDelete() {
    setIsDeleting(true);
    try {
      const result = await deleteKmReadingAction(Number(confirmDialog.readingId));
      if (result.success) {
        toast.success("Rilevazione km eliminata");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error("Si e verificato un errore");
    } finally {
      setIsDeleting(false);
      setConfirmDialog({ ...confirmDialog, open: false });
    }
  }

  // Calculate delta km for each reading (difference from previous reading)
  const deltaKmMap = useMemo(() => {
    const map = new Map<number | string, number | null>();
    // Readings come sorted by date DESC from server, we need ascending for delta
    const sorted = [...readings].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    for (let i = 0; i < sorted.length; i++) {
      if (i === 0) {
        map.set(sorted[i].id, null);
      } else {
        const delta = sorted[i].odometerKm - sorted[i - 1].odometerKm;
        map.set(sorted[i].id, delta);
      }
    }
    return map;
  }, [readings]);

  const columns = useMemo<ColumnDef<KmReadingWithDetails>[]>(
    () => [
      {
        id: "vehicle",
        accessorFn: (row) => row.vehicle.licensePlate,
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3 h-8"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Veicolo
            <ArrowUpDown className="ml-2 h-3 w-3" />
          </Button>
        ),
        cell: ({ row }) => {
          const vehicle = row.original.vehicle;
          return (
            <div className="flex flex-col">
              <span className="font-mono font-medium uppercase">
                {vehicle.licensePlate}
              </span>
              <span className="text-xs text-muted-foreground">
                {vehicle.catalogVehicle.marca} {vehicle.catalogVehicle.modello}
              </span>
            </div>
          );
        },
      },
      {
        id: "date",
        accessorFn: (row) => new Date(row.date).getTime(),
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3 h-8"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Data
            <ArrowUpDown className="ml-2 h-3 w-3" />
          </Button>
        ),
        cell: ({ row }) => (
          <span>
            {format(new Date(row.original.date), "dd MMM yyyy", {
              locale: it,
            })}
          </span>
        ),
      },
      {
        id: "odometerKm",
        accessorFn: (row) => row.odometerKm,
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3 h-8"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Km
            <ArrowUpDown className="ml-2 h-3 w-3" />
          </Button>
        ),
        cell: ({ row }) => (
          <span className="font-medium tabular-nums">
            {kmFmt.format(row.original.odometerKm)} km
          </span>
        ),
      },
      {
        id: "deltaKm",
        header: "Delta Km",
        cell: ({ row }) => {
          const delta = deltaKmMap.get(row.original.id);
          if (delta === null || delta === undefined) {
            return <span className="text-muted-foreground">-</span>;
          }
          const isNegative = delta < 0;
          return (
            <span
              className={`tabular-nums ${isNegative ? "text-destructive font-medium" : "text-muted-foreground"}`}
            >
              {isNegative ? "" : "+"}{kmFmt.format(delta)} km
            </span>
          );
        },
      },
      {
        id: "notes",
        header: "Note",
        cell: ({ row }) => (
          <span className="text-muted-foreground text-sm truncate max-w-[200px] inline-block">
            {row.original.notes ?? "-"}
          </span>
        ),
      },
      {
        id: "source",
        accessorFn: (row) => row.source,
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3 h-8"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Sorgente
            <ArrowUpDown className="ml-2 h-3 w-3" />
          </Button>
        ),
        cell: ({ row }) => (
          <Badge variant="outline" className="text-xs">
            {SOURCE_LABELS[row.original.source] ?? row.original.source}
          </Badge>
        ),
      },
      ...(canEdit
        ? [
            {
              id: "actions",
              header: "",
              cell: ({
                row,
              }: {
                row: { original: KmReadingWithDetails };
              }) => {
                const reading = row.original;
                return (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Azioni</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() =>
                          router.push(`/km-readings/${reading.id}/edit`)
                        }
                      >
                        <Pencil className="mr-2 h-4 w-4" />
                        Modifica
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() =>
                          setConfirmDialog({
                            open: true,
                            readingId: reading.id,
                            vehicleInfo: `${reading.vehicle.licensePlate} - ${kmFmt.format(reading.odometerKm)} km`,
                          })
                        }
                        className="text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Elimina
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                );
              },
            } satisfies ColumnDef<KmReadingWithDetails>,
          ]
        : []),
    ],
    [canEdit, router, deltaKmMap]
  );

  const table = useReactTable({
    data: readings,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination: true,
    pageCount: pagination.totalPages,
  });

  // Empty state
  if (readings.length === 0 && pagination.page === 1 && !hasFilters) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed py-12">
        <Gauge className="h-12 w-12 text-muted-foreground/50" />
        <div className="text-center">
          <h3 className="text-lg font-semibold">
            Nessuna rilevazione km
          </h3>
          <p className="text-sm text-muted-foreground">
            Non sono ancora state registrate rilevazioni chilometriche.
          </p>
        </div>
        <Button asChild>
          <Link href="/km-readings/new">Inserisci rilevazione</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Cerca targa..."
            className="w-[200px] pl-9"
            defaultValue={currentSearch}
            onChange={(e) => {
              // Debounced via form submission; use onBlur for simplicity
            }}
            onBlur={(e) => {
              if (e.target.value !== currentSearch) {
                updateSearchParams({ search: e.target.value || null });
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                updateSearchParams({ search: (e.target as HTMLInputElement).value || null });
              }
            }}
          />
        </div>
        <Input
          type="date"
          className="w-[160px]"
          value={currentDateFrom}
          placeholder="Data da"
          onChange={(e) =>
            updateSearchParams({ dateFrom: e.target.value || null })
          }
        />
        <Input
          type="date"
          className="w-[160px]"
          value={currentDateTo}
          placeholder="Data a"
          onChange={(e) =>
            updateSearchParams({ dateTo: e.target.value || null })
          }
        />
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="mr-1 h-4 w-4" />
            Cancella filtri
          </Button>
        )}
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
                  className="h-24 text-center text-muted-foreground"
                >
                  {isPending
                    ? "Caricamento..."
                    : "Nessuna rilevazione km trovata"}
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => {
                    if (canEdit) {
                      router.push(`/km-readings/${row.original.id}/edit`);
                    }
                  }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      onClick={
                        cell.column.id === "actions"
                          ? (e) => e.stopPropagation()
                          : undefined
                      }
                    >
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
            {pagination.totalCount} rilevazion
            {pagination.totalCount === 1 ? "e" : "i"} total
            {pagination.totalCount === 1 ? "e" : "i"} - Pagina{" "}
            {pagination.page} di {pagination.totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page <= 1 || isPending}
            >
              <ChevronLeft className="h-4 w-4" />
              Precedente
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={
                pagination.page >= pagination.totalPages || isPending
              }
            >
              Successiva
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        open={confirmDialog.open}
        onOpenChange={(open) =>
          setConfirmDialog({ ...confirmDialog, open })
        }
        title="Elimina rilevazione km"
        message={`Stai per eliminare la rilevazione km per "${confirmDialog.vehicleInfo}". Questa azione non puo essere annullata.`}
        confirmLabel="Elimina"
        onConfirm={handleConfirmDelete}
        variant="destructive"
        loading={isDeleting}
      />
    </div>
  );
}
