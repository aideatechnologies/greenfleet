"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  useReactTable,
  getCoreRowModel,
  type ColumnDef,
  flexRender,
} from "@tanstack/react-table";
import { Building2, FileCode, MoreHorizontal, Pencil, Search, ToggleLeft, ToggleRight } from "lucide-react";
import { toast } from "sonner";
import type { SupplierType } from "@/generated/prisma/client";
import type { SupplierWithType } from "@/lib/services/supplier-service";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { SEARCH_DEBOUNCE_MS } from "@/lib/utils/constants";
import { toggleSupplierActiveAction } from "../actions/supplier-actions";

type SupplierTableProps = {
  suppliers: SupplierWithType[];
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
  };
  supplierTypes: SupplierType[];
};

function typeBadgeClasses(code: string): string {
  switch (code) {
    case "NLT":
      return "bg-purple-100 text-purple-800 border-purple-200";
    case "CARBURANTE":
      return "bg-amber-100 text-amber-800 border-amber-200";
    default:
      return "bg-secondary text-secondary-foreground";
  }
}

export function SupplierTable({ suppliers, pagination, supplierTypes }: SupplierTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [searchValue, setSearchValue] = useState(searchParams.get("search") ?? "");
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
      if (!("page" in updates)) params.delete("page");
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
    updateSearchParams({ supplierTypeId: value === "all" ? null : value });
  }

  function handleActiveFilter(value: string) {
    updateSearchParams({ isActive: value === "all" ? null : value });
  }

  function handlePageChange(page: number) {
    updateSearchParams({ page: page > 1 ? String(page) : null });
  }

  async function handleToggleActive(id: number, currentlyActive: boolean) {
    const result = await toggleSupplierActiveAction(id, !currentlyActive);
    if (result.success) {
      toast.success(currentlyActive ? "Fornitore disattivato" : "Fornitore riattivato");
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  const columns = useMemo<ColumnDef<SupplierWithType>[]>(
    () => [
      {
        id: "name",
        header: "Nome",
        cell: ({ row }) => (
          <div>
            <span className="font-medium">{row.original.name}</span>
            {row.original.vatNumber && (
              <p className="text-xs text-muted-foreground">
                P.IVA: {row.original.vatNumber}
              </p>
            )}
          </div>
        ),
      },
      {
        id: "type",
        header: "Tipo",
        cell: ({ row }) => (
          <Badge
            variant="outline"
            className={typeBadgeClasses(row.original.supplierType.code)}
          >
            {row.original.supplierType.label}
          </Badge>
        ),
      },
      {
        id: "contact",
        header: "Contatto",
        cell: ({ row }) => (
          <div className="text-sm">
            {row.original.contactName && (
              <p>{row.original.contactName}</p>
            )}
            {row.original.contactEmail && (
              <p className="text-muted-foreground">{row.original.contactEmail}</p>
            )}
            {row.original.contactPhone && (
              <p className="text-muted-foreground">{row.original.contactPhone}</p>
            )}
            {!row.original.contactName && !row.original.contactEmail && !row.original.contactPhone && (
              <span className="text-muted-foreground">-</span>
            )}
          </div>
        ),
      },
      {
        id: "pec",
        header: "PEC",
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {row.original.pec || "-"}
          </span>
        ),
      },
      {
        id: "status",
        header: "Stato",
        cell: ({ row }) => (
          <Badge variant={row.original.isActive ? "default" : "secondary"}>
            {row.original.isActive ? "Attivo" : "Inattivo"}
          </Badge>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() =>
                  router.push(`/settings/suppliers/${row.original.id}/edit`)
                }
              >
                <Pencil className="mr-2 h-4 w-4" />
                Modifica
              </DropdownMenuItem>
              {row.original.supplierType.code === "CARBURANTE" && (
                <DropdownMenuItem
                  onClick={() =>
                    router.push(`/settings/suppliers/${row.original.id}/template`)
                  }
                >
                  <FileCode className="mr-2 h-4 w-4" />
                  Template XML
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={() =>
                  handleToggleActive(Number(row.original.id), row.original.isActive)
                }
              >
                {row.original.isActive ? (
                  <>
                    <ToggleLeft className="mr-2 h-4 w-4" />
                    Disattiva
                  </>
                ) : (
                  <>
                    <ToggleRight className="mr-2 h-4 w-4" />
                    Riattiva
                  </>
                )}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [router]
  );

  const table = useReactTable({
    data: suppliers,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: pagination.totalPages,
  });

  const currentTypeFilter = searchParams.get("supplierTypeId") ?? "all";
  const currentActiveFilter = searchParams.get("isActive") ?? "all";

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Cerca per nome, P.IVA, PEC..."
            value={searchValue}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={currentTypeFilter} onValueChange={handleTypeFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti i tipi</SelectItem>
            {supplierTypes.map((type) => (
              <SelectItem key={type.id} value={String(type.id)}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={currentActiveFilter} onValueChange={handleActiveFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Stato" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti</SelectItem>
            <SelectItem value="true">Attivi</SelectItem>
            <SelectItem value="false">Inattivi</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Building2 className="h-8 w-8" />
                    <p>{isPending ? "Caricamento..." : "Nessun fornitore trovato"}</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {pagination.totalCount} fornitori totali - Pagina {pagination.page} di{" "}
            {pagination.totalPages}
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
              disabled={pagination.page >= pagination.totalPages || isPending}
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
