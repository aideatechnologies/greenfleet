"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  type ColumnDef,
  type SortingState,
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
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  FileText,
} from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { StatusBadge, type StatusBadgeVariant } from "@/components/data-display/StatusBadge";
import {
  CONTRACT_TYPE_LABELS,
  type ContractType,
} from "@/types/contract";
import {
  ExpiryStatus,
  EXPIRY_STATUS_LABELS,
  type ContractStatusRow,
} from "@/types/domain";
import { DEFAULT_PAGE_SIZE } from "@/lib/utils/constants";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDateShort(date: Date | string | null | undefined): string {
  if (!date) return "-";
  return format(new Date(date), "dd MMM yyyy", { locale: it });
}

function getExpiryBadgeVariant(status: ExpiryStatus): StatusBadgeVariant {
  switch (status) {
    case ExpiryStatus.OK:
      return "success";
    case ExpiryStatus.EXPIRING_90:
      return "info";
    case ExpiryStatus.EXPIRING_60:
      return "warning";
    case ExpiryStatus.EXPIRING_30:
      return "warning";
    case ExpiryStatus.EXPIRED:
      return "destructive";
    case ExpiryStatus.NO_CONTRACT:
      return "secondary";
    default:
      return "default";
  }
}

function getContractTypeBadgeVariant(type: ContractType): StatusBadgeVariant {
  switch (type) {
    case "PROPRIETARIO":
      return "info";
    case "BREVE_TERMINE":
      return "warning";
    case "LUNGO_TERMINE":
      return "default";
    case "LEASING_FINANZIARIO":
      return "success";
    default:
      return "secondary";
  }
}

function getDaysToExpiryColor(days: number | null): string {
  if (days === null) return "text-muted-foreground";
  if (days < 0) return "text-red-600 font-semibold dark:text-red-400";
  if (days <= 30) return "text-amber-600 font-semibold dark:text-amber-400";
  if (days <= 60) return "text-amber-500 dark:text-amber-400";
  if (days <= 90) return "text-yellow-600 dark:text-yellow-400";
  return "text-emerald-600 dark:text-emerald-400";
}

function getSupplierDisplay(row: ContractStatusRow): string {
  if (!row.activeContract) return "-";
  return row.activeContract.supplierName || "-";
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ContractStatusTableProps {
  rows: ContractStatusRow[];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ContractStatusTable({ rows }: ContractStatusTableProps) {
  const router = useRouter();
  const [sorting, setSorting] = useState<SortingState>([]);

  const columns = useMemo<ColumnDef<ContractStatusRow>[]>(
    () => [
      {
        id: "vehicle",
        accessorFn: (row) => row.vehicle.licensePlate,
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Veicolo
            <ArrowUpDown className="ml-1 h-3.5 w-3.5" />
          </Button>
        ),
        cell: ({ row }) => (
          <div>
            <span className="font-mono font-medium uppercase tracking-wider">
              {row.original.vehicle.licensePlate}
            </span>
            <p className="text-xs text-muted-foreground">
              {row.original.vehicle.make} {row.original.vehicle.model}
              {row.original.vehicle.trim && (
                <span className="text-muted-foreground/60">
                  {" "}
                  {row.original.vehicle.trim}
                </span>
              )}
            </p>
          </div>
        ),
        sortingFn: "text",
      },
      {
        id: "contractType",
        accessorFn: (row) => row.activeContract?.type ?? "",
        header: "Tipo Contratto",
        cell: ({ row }) => {
          const contract = row.original.activeContract;
          if (!contract) {
            return (
              <span className="text-sm text-muted-foreground italic">
                Nessuno
              </span>
            );
          }
          return (
            <StatusBadge
              label={CONTRACT_TYPE_LABELS[contract.type] ?? contract.type}
              variant={getContractTypeBadgeVariant(contract.type)}
            />
          );
        },
      },
      {
        id: "supplier",
        accessorFn: (row) => getSupplierDisplay(row),
        header: "Fornitore / Societa",
        cell: ({ row }) => (
          <span className="text-sm">
            {getSupplierDisplay(row.original)}
          </span>
        ),
      },
      {
        id: "endDate",
        accessorFn: (row) =>
          row.activeContract?.endDate
            ? new Date(row.activeContract.endDate).getTime()
            : null,
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Scadenza
            <ArrowUpDown className="ml-1 h-3.5 w-3.5" />
          </Button>
        ),
        cell: ({ row }) => (
          <span className="text-sm">
            {formatDateShort(row.original.activeContract?.endDate)}
          </span>
        ),
        sortingFn: (rowA, rowB) => {
          const a = rowA.original.activeContract?.endDate;
          const b = rowB.original.activeContract?.endDate;
          if (!a && !b) return 0;
          if (!a) return 1;
          if (!b) return -1;
          return new Date(a).getTime() - new Date(b).getTime();
        },
      },
      {
        id: "daysToExpiry",
        accessorFn: (row) => row.daysToExpiry,
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Giorni alla scadenza
            <ArrowUpDown className="ml-1 h-3.5 w-3.5" />
          </Button>
        ),
        cell: ({ row }) => {
          const days = row.original.daysToExpiry;
          if (days === null) {
            return (
              <span className="text-sm text-muted-foreground">-</span>
            );
          }
          return (
            <span className={`text-sm tabular-nums ${getDaysToExpiryColor(days)}`}>
              {days < 0 ? `${Math.abs(days)} gg scaduto` : `${days} gg`}
            </span>
          );
        },
        sortingFn: (rowA, rowB) => {
          const a = rowA.original.daysToExpiry;
          const b = rowB.original.daysToExpiry;
          if (a === null && b === null) return 0;
          if (a === null) return 1;
          if (b === null) return -1;
          return a - b;
        },
      },
      {
        id: "expiryStatus",
        accessorFn: (row) => row.expiryStatus,
        header: "Stato",
        cell: ({ row }) => (
          <StatusBadge
            label={EXPIRY_STATUS_LABELS[row.original.expiryStatus]}
            variant={getExpiryBadgeVariant(row.original.expiryStatus)}
          />
        ),
      },
    ],
    []
  );

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: DEFAULT_PAGE_SIZE,
      },
    },
  });

  const pageIndex = table.getState().pagination.pageIndex;
  const pageCount = table.getPageCount();

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
                  className="h-24 text-center"
                >
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <FileText className="h-8 w-8" />
                    <p>Nessun veicolo trovato</p>
                    <p className="text-xs">
                      Prova a modificare i filtri di ricerca.
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
                    router.push(`/vehicles/${row.original.vehicle.id}`)
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
      {pageCount > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {rows.length} veicoli totali - Pagina {pageIndex + 1} di{" "}
            {pageCount}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronLeft className="h-4 w-4" />
              Precedente
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Successiva
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
