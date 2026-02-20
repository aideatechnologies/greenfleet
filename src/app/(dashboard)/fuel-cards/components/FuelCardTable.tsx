"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  useReactTable,
  getCoreRowModel,
  type ColumnDef,
  flexRender,
} from "@tanstack/react-table";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { CreditCard, MoreHorizontal, Pencil, Search } from "lucide-react";
import { toast } from "sonner";
import type { SupplierWithType } from "@/lib/services/supplier-service";
import type { FuelCardWithDetails } from "@/lib/services/fuel-card-service";
import {
  FuelCardStatus,
  FUEL_CARD_STATUS_LABELS,
  FuelCardAssignmentType,
  FUEL_CARD_ASSIGNMENT_TYPE_LABELS,
} from "@/types/fuel-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
import { toggleFuelCardStatusAction } from "../actions/fuel-card-actions";

type FuelCardTableProps = {
  fuelCards: FuelCardWithDetails[];
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
  };
  suppliers: SupplierWithType[];
};

function statusBadgeClasses(status: string): string {
  switch (status) {
    case "ACTIVE":
      return "bg-green-100 text-green-800 border-green-200";
    case "EXPIRED":
      return "bg-red-100 text-red-800 border-red-200";
    case "SUSPENDED":
      return "bg-amber-100 text-amber-800 border-amber-200";
    default:
      return "";
  }
}

function assignmentBadgeClasses(type: string): string {
  switch (type) {
    case "VEHICLE":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "EMPLOYEE":
      return "bg-purple-100 text-purple-800 border-purple-200";
    case "JOLLY":
      return "bg-orange-100 text-orange-800 border-orange-200";
    default:
      return "";
  }
}

function formatDateShort(date: Date | string | null | undefined) {
  if (!date) return "-";
  return format(new Date(date), "dd MMM yyyy", { locale: it });
}

export function FuelCardTable({ fuelCards, pagination, suppliers }: FuelCardTableProps) {
  const t = useTranslations("fuelCards");
  const tCommon = useTranslations("common");
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

  async function handleToggleStatus(id: number, newStatus: string) {
    const result = await toggleFuelCardStatusAction(id, newStatus);
    if (result.success) {
      toast.success(t("cardStatusUpdated"));
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  const columns = useMemo<ColumnDef<FuelCardWithDetails>[]>(
    () => [
      {
        id: "cardNumber",
        header: tCommon("cardNumber"),
        cell: ({ row }) => (
          <span className="font-mono font-medium">{row.original.cardNumber}</span>
        ),
      },
      {
        id: "supplier",
        header: tCommon("supplier"),
        cell: ({ row }) => (
          <span className="text-sm">
            {row.original.supplier?.name ?? "-"}
          </span>
        ),
      },
      {
        id: "assignment",
        header: tCommon("assignment"),
        cell: ({ row }) => (
          <div className="space-y-1">
            <Badge variant="outline" className={assignmentBadgeClasses(row.original.assignmentType)}>
              {FUEL_CARD_ASSIGNMENT_TYPE_LABELS[row.original.assignmentType as keyof typeof FUEL_CARD_ASSIGNMENT_TYPE_LABELS] ?? row.original.assignmentType}
            </Badge>
            {row.original.assignmentType === "VEHICLE" && row.original.assignedVehicle && (
              <p className="text-xs text-muted-foreground font-mono uppercase">
                {row.original.assignedVehicle.licensePlate}
              </p>
            )}
            {row.original.assignmentType === "EMPLOYEE" && row.original.assignedEmployee && (
              <p className="text-xs text-muted-foreground">
                {row.original.assignedEmployee.firstName} {row.original.assignedEmployee.lastName}
              </p>
            )}
          </div>
        ),
      },
      {
        id: "expiry",
        header: tCommon("expiry"),
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {formatDateShort(row.original.expiryDate)}
          </span>
        ),
      },
      {
        id: "status",
        header: tCommon("status"),
        cell: ({ row }) => (
          <Badge variant="outline" className={statusBadgeClasses(row.original.status)}>
            {FUEL_CARD_STATUS_LABELS[row.original.status as keyof typeof FUEL_CARD_STATUS_LABELS] ?? row.original.status}
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
                onClick={() => router.push(`/fuel-cards/${row.original.id}/edit`)}
              >
                <Pencil className="mr-2 h-4 w-4" />
                {tCommon("edit")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {row.original.status !== "ACTIVE" && (
                <DropdownMenuItem onClick={() => handleToggleStatus(Number(row.original.id), "ACTIVE")}>
                  {tCommon("activate")}
                </DropdownMenuItem>
              )}
              {row.original.status !== "SUSPENDED" && (
                <DropdownMenuItem onClick={() => handleToggleStatus(Number(row.original.id), "SUSPENDED")}>
                  {tCommon("suspend")}
                </DropdownMenuItem>
              )}
              {row.original.status !== "EXPIRED" && (
                <DropdownMenuItem onClick={() => handleToggleStatus(Number(row.original.id), "EXPIRED")}>
                  {tCommon("markExpired")}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [router, t, tCommon]
  );

  const table = useReactTable({
    data: fuelCards,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: pagination.totalPages,
  });

  const currentStatusFilter = searchParams.get("status") ?? "all";
  const currentAssignmentFilter = searchParams.get("assignmentType") ?? "all";

  return (
    <div className="space-y-4">
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
        <Select value={currentStatusFilter} onValueChange={(v) => updateSearchParams({ status: v === "all" ? null : v })}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder={tCommon("status")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{tCommon("all")}</SelectItem>
            {Object.values(FuelCardStatus).map((s) => (
              <SelectItem key={s} value={s}>
                {FUEL_CARD_STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={currentAssignmentFilter} onValueChange={(v) => updateSearchParams({ assignmentType: v === "all" ? null : v })}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder={tCommon("assignment")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{tCommon("allFeminine")}</SelectItem>
            {Object.values(FuelCardAssignmentType).map((t) => (
              <SelectItem key={t} value={t}>
                {FUEL_CARD_ASSIGNMENT_TYPE_LABELS[t]}
              </SelectItem>
            ))}
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
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
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
                    <CreditCard className="h-8 w-8" />
                    <p>{isPending ? tCommon("loading") : t("noFuelCardsFound")}</p>
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
            {pagination.totalCount} {t("cardsTotal")} - {tCommon("page", { page: pagination.page, totalPages: pagination.totalPages })}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => updateSearchParams({ page: pagination.page > 2 ? String(pagination.page - 1) : null })}
              disabled={pagination.page <= 1 || isPending}
            >
              <ChevronLeft className="h-4 w-4" />
              {tCommon("previous")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => updateSearchParams({ page: String(pagination.page + 1) })}
              disabled={pagination.page >= pagination.totalPages || isPending}
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
