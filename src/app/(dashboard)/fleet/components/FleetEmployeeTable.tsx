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
  Users,
} from "lucide-react";
import { StatusBadge, type StatusBadgeVariant } from "@/components/data-display/StatusBadge";
import { SEARCH_DEBOUNCE_MS } from "@/lib/utils/constants";
import type { FleetEmployeeOverview } from "@/types/fleet-overview";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getEmployeeStatusVariant(isActive: boolean): StatusBadgeVariant {
  return isActive ? "success" : "secondary";
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface FleetEmployeeTableProps {
  employees: FleetEmployeeOverview[];
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

export function FleetEmployeeTable({ employees, pagination }: FleetEmployeeTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Search with debounce
  const [searchValue, setSearchValue] = useState(
    searchParams.get("empSearch") ?? ""
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
      // Reset employee page on filter changes (except page changes)
      if (!("empPage" in updates)) {
        params.delete("empPage");
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
      updateSearchParams({ empSearch: value || null });
    }, SEARCH_DEBOUNCE_MS);
  }

  function handleStatusFilter(value: string) {
    updateSearchParams({ empStatus: value === "all" ? null : value });
  }

  function handleAssignmentFilter(value: string) {
    updateSearchParams({ empAssignment: value === "all" ? null : value });
  }

  function handlePageChange(page: number) {
    updateSearchParams({ empPage: page > 1 ? String(page) : null });
  }

  const columns = useMemo<ColumnDef<FleetEmployeeOverview>[]>(
    () => [
      {
        id: "name",
        header: "Nominativo",
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <div>
              <span className="font-medium">
                {row.original.lastName} {row.original.firstName}
              </span>
              {row.original.email && (
                <p className="text-xs text-muted-foreground">
                  {row.original.email}
                </p>
              )}
            </div>
            {row.original.isPool && (
              <StatusBadge label="Pool" variant="info" />
            )}
          </div>
        ),
      },
      {
        id: "status",
        header: "Stato",
        cell: ({ row }) => (
          <StatusBadge
            label={row.original.isActive ? "Attivo" : "Inattivo"}
            variant={getEmployeeStatusVariant(row.original.isActive)}
          />
        ),
      },
      {
        id: "assignedVehicle",
        header: "Veicolo assegnato",
        cell: ({ row }) => {
          const vehicle = row.original.assignedVehicle;
          if (!vehicle) {
            return (
              <span className="text-sm text-muted-foreground italic">
                Nessuno
              </span>
            );
          }
          return (
            <div>
              <span className="font-mono text-sm font-medium uppercase tracking-wider">
                {vehicle.licensePlate}
              </span>
              <p className="text-xs text-muted-foreground">
                {vehicle.make} {vehicle.model}
              </p>
            </div>
          );
        },
      },
    ],
    []
  );

  const table = useReactTable({
    data: employees,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: pagination.totalPages,
  });

  const currentStatus = searchParams.get("empStatus") ?? "all";
  const currentAssignment = searchParams.get("empAssignment") ?? "all";

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Cerca per nome, cognome, email..."
            value={searchValue}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          value={currentStatus}
          onValueChange={handleStatusFilter}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Stato" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti</SelectItem>
            <SelectItem value="ACTIVE">Attivi</SelectItem>
            <SelectItem value="INACTIVE">Inattivi</SelectItem>
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
            <SelectItem value="all">Tutti</SelectItem>
            <SelectItem value="ASSIGNED">Con veicolo</SelectItem>
            <SelectItem value="UNASSIGNED">Senza veicolo</SelectItem>
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
                    <Users className="h-8 w-8" />
                    <p>
                      {isPending
                        ? "Caricamento..."
                        : "Nessun dipendente trovato"}
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
                    router.push(`/dipendenti/${row.original.id}`)
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
            {pagination.totalCount} dipendenti totali - Pagina{" "}
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
