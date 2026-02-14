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
  Fuel,
  ArrowUpDown,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { ConfirmDialog } from "@/components/forms/ConfirmDialog";
import { deleteFuelRecordAction } from "../actions/delete-fuel-record";
import type { FuelRecordWithDetails } from "@/lib/services/fuel-record-service";

// ---------------------------------------------------------------------------
// Formatting helpers (IT locale)
// ---------------------------------------------------------------------------

const numberFmt = new Intl.NumberFormat("it-IT", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const currencyFmt = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR",
});

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

type FuelRecordTableProps = {
  records: FuelRecordWithDetails[];
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
  };
  canEdit: boolean;
  fuelTypeLabels?: Record<string, string>;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function FuelRecordTable({
  records,
  pagination,
  canEdit,
  fuelTypeLabels = {},
}: FuelRecordTableProps) {
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
    recordId: string;
    recordInfo: string;
  }>({ open: false, recordId: "", recordInfo: "" });
  const [isDeleting, setIsDeleting] = useState(false);

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
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`);
      });
    },
    [searchParams, pathname, router]
  );

  function handlePageChange(page: number) {
    updateSearchParams({ page: page > 1 ? String(page) : null });
  }

  async function handleConfirmDelete() {
    setIsDeleting(true);
    try {
      const result = await deleteFuelRecordAction(confirmDialog.recordId);
      if (result.success) {
        toast.success("Rifornimento eliminato");
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

  const columns = useMemo<ColumnDef<FuelRecordWithDetails>[]>(
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
        id: "fuelType",
        accessorFn: (row) => row.fuelType,
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3 h-8"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Carburante
            <ArrowUpDown className="ml-2 h-3 w-3" />
          </Button>
        ),
        cell: ({ row }) => (
          <Badge variant="secondary" className="text-xs">
            {fuelTypeLabels[row.original.fuelType] ??
              row.original.fuelType}
          </Badge>
        ),
      },
      {
        id: "quantityLiters",
        accessorFn: (row) => row.quantityLiters,
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3 h-8"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Quantita (L)
            <ArrowUpDown className="ml-2 h-3 w-3" />
          </Button>
        ),
        cell: ({ row }) => (
          <span className="font-medium tabular-nums">
            {row.original.quantityLiters > 0
              ? `${numberFmt.format(row.original.quantityLiters)} L`
              : "\u2014"}
          </span>
        ),
      },
      {
        id: "quantityKwh",
        accessorFn: (row) => row.quantityKwh,
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3 h-8"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Quantita (kWh)
            <ArrowUpDown className="ml-2 h-3 w-3" />
          </Button>
        ),
        cell: ({ row }) => (
          <span className="font-medium tabular-nums">
            {row.original.quantityKwh != null
              ? `${numberFmt.format(row.original.quantityKwh)} kWh`
              : "\u2014"}
          </span>
        ),
      },
      {
        id: "amountEur",
        accessorFn: (row) => row.amountEur,
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3 h-8"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Importo
            <ArrowUpDown className="ml-2 h-3 w-3" />
          </Button>
        ),
        cell: ({ row }) => (
          <span className="font-medium tabular-nums">
            {currencyFmt.format(row.original.amountEur)}
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
          <span className="tabular-nums">
            {kmFmt.format(row.original.odometerKm)} km
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
                row: { original: FuelRecordWithDetails };
              }) => {
                const record = row.original;
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
                          router.push(`/fuel-records/${record.id}/edit`)
                        }
                      >
                        <Pencil className="mr-2 h-4 w-4" />
                        Modifica
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          const qtyParts: string[] = [];
                          if (record.quantityLiters > 0) qtyParts.push(`${numberFmt.format(record.quantityLiters)} L`);
                          if (record.quantityKwh != null) qtyParts.push(`${numberFmt.format(record.quantityKwh)} kWh`);
                          setConfirmDialog({
                            open: true,
                            recordId: record.id,
                            recordInfo: `${qtyParts.join(" + ") || "\u2014"} - ${record.vehicle.licensePlate}`,
                          });
                        }}
                        className="text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Elimina
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                );
              },
            } satisfies ColumnDef<FuelRecordWithDetails>,
          ]
        : []),
    ],
    [canEdit, router]
  );

  const table = useReactTable({
    data: records,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination: true,
    pageCount: pagination.totalPages,
  });

  // Empty state
  if (records.length === 0 && pagination.page === 1) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed py-12">
        <Fuel className="h-12 w-12 text-muted-foreground/50" />
        <div className="text-center">
          <h3 className="text-lg font-semibold">Nessun rifornimento</h3>
          <p className="text-sm text-muted-foreground">
            Non sono ancora stati registrati rifornimenti.
          </p>
        </div>
        <Button asChild>
          <Link href="/fuel-records/new">Nuovo rifornimento</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
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
                    : "Nessun rifornimento trovato"}
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} className="hover:bg-muted/50">
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
            {pagination.totalCount} riforniment
            {pagination.totalCount === 1 ? "o" : "i"} total
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
        title="Eliminare il rifornimento?"
        message={`Il rifornimento "${confirmDialog.recordInfo}" verra eliminato permanentemente. Questa azione non e reversibile.`}
        confirmLabel="Elimina"
        onConfirm={handleConfirmDelete}
        variant="destructive"
        loading={isDeleting}
      />
    </div>
  );
}
