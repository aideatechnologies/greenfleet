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
  FileWarning,
} from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { StatusBadge, type StatusBadgeVariant } from "@/components/data-display/StatusBadge";
import { SEARCH_DEBOUNCE_MS } from "@/lib/utils/constants";
import {
  FLEET_VEHICLE_STATUS_LABELS,
  ASSIGNMENT_STATUS_LABELS,
  type FleetVehicleOverview,
  type FleetVehicleStatus,
  type AssignmentStatus,
} from "@/types/fleet-overview";
import {
  CONTRACT_TYPE_LABELS,
  type ContractType,
} from "@/types/contract";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getVehicleStatusVariant(status: FleetVehicleStatus): StatusBadgeVariant {
  switch (status) {
    case "ACTIVE":
      return "success";
    case "INACTIVE":
      return "warning";
    case "DISPOSED":
      return "destructive";
    default:
      return "secondary";
  }
}

function getAssignmentStatusVariant(status: AssignmentStatus): StatusBadgeVariant {
  switch (status) {
    case "ASSIGNED":
      return "success";
    case "POOL":
      return "info";
    case "UNASSIGNED":
      return "secondary";
    default:
      return "default";
  }
}

function formatDateShort(date: Date | string | null | undefined): string {
  if (!date) return "-";
  return format(new Date(date), "dd MMM yyyy", { locale: it });
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface FleetVehicleTableProps {
  vehicles: FleetVehicleOverview[];
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function FleetVehicleTable({ vehicles, pagination }: FleetVehicleTableProps) {
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

  function handleVehicleStatusFilter(value: string) {
    updateSearchParams({ vehicleStatus: value === "all" ? null : value });
  }

  function handleAssignmentFilter(value: string) {
    updateSearchParams({ assignmentStatus: value === "all" ? null : value });
  }

  function handleContractStatusFilter(value: string) {
    updateSearchParams({ contractStatus: value === "all" ? null : value });
  }

  function handlePageChange(page: number) {
    updateSearchParams({ page: page > 1 ? String(page) : null });
  }

  const columns = useMemo<ColumnDef<FleetVehicleOverview>[]>(
    () => [
      {
        id: "licensePlate",
        header: "Targa",
        cell: ({ row }) => (
          <span className="font-mono font-medium uppercase tracking-wider">
            {row.original.licensePlate}
          </span>
        ),
      },
      {
        id: "vehicle",
        header: "Veicolo",
        cell: ({ row }) => (
          <div>
            <span className="font-medium">
              {row.original.make} {row.original.model}
            </span>
            {row.original.trim && (
              <p className="text-xs text-muted-foreground">
                {row.original.trim}
              </p>
            )}
          </div>
        ),
      },
      {
        id: "vehicleStatus",
        header: "Stato",
        cell: ({ row }) => (
          <StatusBadge
            label={FLEET_VEHICLE_STATUS_LABELS[row.original.vehicleStatus]}
            variant={getVehicleStatusVariant(row.original.vehicleStatus)}
          />
        ),
      },
      {
        id: "assignment",
        header: "Assegnazione",
        cell: ({ row }) => {
          const emp = row.original.assignedEmployee;
          if (!emp) {
            return (
              <StatusBadge
                label={ASSIGNMENT_STATUS_LABELS.UNASSIGNED}
                variant={getAssignmentStatusVariant("UNASSIGNED")}
              />
            );
          }
          if (emp.isPool) {
            return (
              <div className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-blue-600" />
                <StatusBadge
                  label="Pool"
                  variant="info"
                />
              </div>
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
        id: "contract",
        header: "Contratto",
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
            <div className="flex flex-col gap-0.5">
              <StatusBadge
                label={CONTRACT_TYPE_LABELS[contract.type] ?? contract.type}
                variant="default"
              />
              {contract.endDate && (
                <span className="text-xs text-muted-foreground">
                  Scade: {formatDateShort(contract.endDate)}
                </span>
              )}
            </div>
          );
        },
      },
      {
        id: "documents",
        header: "Documenti",
        cell: ({ row }) => {
          const { documentCount, expiredDocumentCount } = row.original;
          if (documentCount === 0) {
            return <span className="text-sm text-muted-foreground">-</span>;
          }
          return (
            <div className="flex items-center gap-1.5">
              <span className="text-sm tabular-nums">{documentCount}</span>
              {expiredDocumentCount > 0 && (
                <span className="flex items-center gap-0.5 text-xs text-red-600 dark:text-red-400">
                  <FileWarning className="h-3 w-3" />
                  {expiredDocumentCount}
                </span>
              )}
            </div>
          );
        },
      },
    ],
    []
  );

  const table = useReactTable({
    data: vehicles,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: pagination.totalPages,
  });

  const currentVehicleStatus = searchParams.get("vehicleStatus") ?? "all";
  const currentAssignment = searchParams.get("assignmentStatus") ?? "all";
  const currentContractStatus = searchParams.get("contractStatus") ?? "all";

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Cerca per targa, marca, modello, dipendente..."
            value={searchValue}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          value={currentVehicleStatus}
          onValueChange={handleVehicleStatusFilter}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Stato veicolo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti gli stati</SelectItem>
            <SelectItem value="ACTIVE">Attivi</SelectItem>
            <SelectItem value="INACTIVE">Inattivi</SelectItem>
            <SelectItem value="DISPOSED">Dismessi</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={currentAssignment}
          onValueChange={handleAssignmentFilter}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Assegnazione" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutte le assegnazioni</SelectItem>
            <SelectItem value="ASSIGNED">Assegnati</SelectItem>
            <SelectItem value="UNASSIGNED">Non assegnati</SelectItem>
            <SelectItem value="POOL">Pool</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={currentContractStatus}
          onValueChange={handleContractStatusFilter}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Contratto" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti i contratti</SelectItem>
            <SelectItem value="HAS_CONTRACT">Con contratto</SelectItem>
            <SelectItem value="NO_CONTRACT">Senza contratto</SelectItem>
            <SelectItem value="EXPIRING">In scadenza</SelectItem>
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
                        ? "Caricamento..."
                        : "Nessun veicolo trovato"}
                    </p>
                    <p className="text-xs">
                      {isPending
                        ? ""
                        : "Prova a modificare i filtri di ricerca."}
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
            {pagination.totalCount} veicoli totali - Pagina{" "}
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
