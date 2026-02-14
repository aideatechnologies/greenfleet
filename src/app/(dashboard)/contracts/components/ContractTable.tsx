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
  FileText,
} from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { SEARCH_DEBOUNCE_MS } from "@/lib/utils/constants";
import {
  ContractType,
  CONTRACT_TYPE_LABELS,
  ContractStatus,
  CONTRACT_STATUS_LABELS,
  type ContractType as ContractTypeT,
  type ContractStatus as ContractStatusT,
} from "@/types/contract";
import type { ContractWithDetails } from "@/lib/services/contract-service";

// ---------------------------------------------------------------------------
// Formatters
// ---------------------------------------------------------------------------

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
  }).format(amount);

function formatDateShort(date: Date | string | null | undefined) {
  if (!date) return "-";
  return format(new Date(date), "dd MMM yyyy", { locale: it });
}

// ---------------------------------------------------------------------------
// Badge styles
// ---------------------------------------------------------------------------

function typeBadgeClasses(type: string): string {
  switch (type) {
    case ContractType.PROPRIETARIO:
      return "bg-blue-100 text-blue-800 border-blue-200";
    case ContractType.BREVE_TERMINE:
      return "bg-amber-100 text-amber-800 border-amber-200";
    case ContractType.LUNGO_TERMINE:
      return "bg-purple-100 text-purple-800 border-purple-200";
    case ContractType.LEASING_FINANZIARIO:
      return "bg-emerald-100 text-emerald-800 border-emerald-200";
    default:
      return "bg-secondary text-secondary-foreground";
  }
}

function statusBadgeVariant(status: string): "default" | "secondary" {
  return status === ContractStatus.ACTIVE ? "default" : "secondary";
}

function statusBadgeClasses(status: string): string {
  return status === ContractStatus.ACTIVE
    ? "bg-green-600 hover:bg-green-600/90"
    : "bg-gray-100 text-gray-600 hover:bg-gray-100/90";
}

// ---------------------------------------------------------------------------
// Amount display
// ---------------------------------------------------------------------------

function getAmountDisplay(contract: ContractWithDetails): string {
  switch (contract.type) {
    case "PROPRIETARIO":
      return contract.purchasePrice != null
        ? formatCurrency(contract.purchasePrice)
        : "-";
    case "BREVE_TERMINE":
      return contract.dailyRate != null
        ? `${formatCurrency(contract.dailyRate)}/gg`
        : "-";
    case "LUNGO_TERMINE":
    case "LEASING_FINANZIARIO":
      return contract.monthlyRate != null
        ? `${formatCurrency(contract.monthlyRate)}/mese`
        : "-";
    default:
      return "-";
  }
}

// ---------------------------------------------------------------------------
// Date display
// ---------------------------------------------------------------------------

function getDateDisplay(contract: ContractWithDetails): string {
  if (contract.type === "PROPRIETARIO") {
    return formatDateShort(contract.purchaseDate);
  }
  const start = formatDateShort(contract.startDate);
  const end = formatDateShort(contract.endDate);
  return `${start} - ${end}`;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type ContractTableProps = {
  contracts: ContractWithDetails[];
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

export function ContractTable({
  contracts,
  pagination,
  canEdit: _canEdit,
}: ContractTableProps) {
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

  function handleTypeFilter(value: string) {
    updateSearchParams({ type: value === "all" ? null : value });
  }

  function handleStatusFilter(value: string) {
    updateSearchParams({ status: value === "all" ? null : value });
  }

  function handlePageChange(page: number) {
    updateSearchParams({ page: page > 1 ? String(page) : null });
  }

  const columns = useMemo<ColumnDef<ContractWithDetails>[]>(
    () => [
      {
        id: "vehicle",
        header: "Veicolo",
        cell: ({ row }) => (
          <div>
            <span className="font-mono font-medium uppercase tracking-wider">
              {row.original.vehicle.licensePlate}
            </span>
            <p className="text-xs text-muted-foreground">
              {row.original.vehicle.catalogVehicle.marca}{" "}
              {row.original.vehicle.catalogVehicle.modello}
            </p>
          </div>
        ),
      },
      {
        id: "type",
        header: "Tipo",
        cell: ({ row }) => {
          const type = row.original.type as ContractTypeT;
          return (
            <Badge variant="outline" className={typeBadgeClasses(type)}>
              {CONTRACT_TYPE_LABELS[type] ?? type}
            </Badge>
          );
        },
      },
      {
        id: "status",
        header: "Stato",
        cell: ({ row }) => {
          const status = row.original.status as ContractStatusT;
          return (
            <Badge
              variant={statusBadgeVariant(status)}
              className={statusBadgeClasses(status)}
            >
              {CONTRACT_STATUS_LABELS[status] ?? status}
            </Badge>
          );
        },
      },
      {
        id: "dates",
        header: "Date",
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {getDateDisplay(row.original)}
          </span>
        ),
      },
      {
        id: "amount",
        header: "Importo",
        cell: ({ row }) => (
          <span className="text-sm font-medium tabular-nums">
            {getAmountDisplay(row.original)}
          </span>
        ),
      },
    ],
    []
  );

  const table = useReactTable({
    data: contracts,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: pagination.totalPages,
  });

  const currentTypeFilter = searchParams.get("type") ?? "all";
  const currentStatusFilter = searchParams.get("status") ?? "all";

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Cerca per targa, marca, modello..."
            value={searchValue}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={currentTypeFilter} onValueChange={handleTypeFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti i tipi</SelectItem>
            {Object.values(ContractType).map((type) => (
              <SelectItem key={type} value={type}>
                {CONTRACT_TYPE_LABELS[type]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={currentStatusFilter}
          onValueChange={handleStatusFilter}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Stato" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti</SelectItem>
            {Object.values(ContractStatus).map((status) => (
              <SelectItem key={status} value={status}>
                {CONTRACT_STATUS_LABELS[status]}
              </SelectItem>
            ))}
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
                    <FileText className="h-8 w-8" />
                    <p>
                      {isPending
                        ? "Caricamento..."
                        : "Nessun contratto trovato"}
                    </p>
                    <p className="text-xs">
                      {isPending
                        ? ""
                        : "Crea un nuovo contratto per iniziare."}
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
                    router.push(`/contracts/${row.original.id}`)
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
            {pagination.totalCount} contratti totali - Pagina{" "}
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
    </div>
  );
}
