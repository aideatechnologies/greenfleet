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
import type { EmployeeWithCarlist } from "@/lib/services/employee-service";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  MoreHorizontal,
  Pencil,
  Ban,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Search,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { deactivateEmployeeAction } from "../actions/deactivate-employee";
import { reactivateEmployeeAction } from "../actions/reactivate-employee";
import { SEARCH_DEBOUNCE_MS } from "@/lib/utils/constants";

type EmployeeTableProps = {
  employees: EmployeeWithCarlist[];
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
  };
  canEdit: boolean;
};

export function EmployeeTable({
  employees,
  pagination,
  canEdit,
}: EmployeeTableProps) {
  const t = useTranslations("employees");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Confirm dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    employeeId: number | string;
    employeeName: string;
    action: "deactivate" | "reactivate";
  }>({ open: false, employeeId: "", employeeName: "", action: "deactivate" });
  const [isActionLoading, setIsActionLoading] = useState(false);

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
    updateSearchParams({ isActive: value === "all" ? null : value });
  }

  function handlePageChange(page: number) {
    updateSearchParams({ page: page > 1 ? String(page) : null });
  }

  async function handleConfirmAction() {
    setIsActionLoading(true);
    try {
      const result =
        confirmDialog.action === "deactivate"
          ? await deactivateEmployeeAction(Number(confirmDialog.employeeId))
          : await reactivateEmployeeAction(Number(confirmDialog.employeeId));

      if (result.success) {
        toast.success(
          confirmDialog.action === "deactivate"
            ? t("employeeDeactivated")
            : t("employeeReactivated")
        );
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error(tCommon("errorOccurred"));
    } finally {
      setIsActionLoading(false);
      setConfirmDialog({ ...confirmDialog, open: false });
    }
  }

  const columns = useMemo<ColumnDef<EmployeeWithCarlist>[]>(
    () => [
      {
        accessorKey: "firstName",
        header: t("firstNameColumn"),
        cell: ({ getValue }) => (
          <span className="font-medium">
            {getValue() as string}
          </span>
        ),
      },
      {
        accessorKey: "lastName",
        header: t("lastNameColumn"),
        cell: ({ getValue }) => (
          <span className="font-medium">
            {getValue() as string}
          </span>
        ),
      },
      {
        accessorKey: "email",
        header: t("email"),
        cell: ({ getValue }) => (
          <span className="text-muted-foreground">
            {(getValue() as string | null) ?? "-"}
          </span>
        ),
      },
      {
        accessorKey: "isActive",
        header: tCommon("status"),
        cell: ({ row }) => {
          const employee = row.original;
          if (employee.isPool) {
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
          const active = employee.isActive;
          return (
            <Badge
              variant={active ? "default" : "secondary"}
              className={
                active
                  ? "bg-green-600 hover:bg-green-600/90"
                  : "bg-red-100 text-red-700 hover:bg-red-100/90"
              }
            >
              {active ? tCommon("activeSingular") : tCommon("inactiveSingular")}
            </Badge>
          );
        },
      },
      {
        id: "carlist",
        header: t("carlistColumn"),
        cell: ({ row }) => {
          const carlist = row.original.carlist;
          return carlist ? (
            <span className="text-sm">{carlist.name}</span>
          ) : (
            <span className="text-muted-foreground">-</span>
          );
        },
      },
      ...(canEdit
        ? [
            {
              id: "actions",
              header: "",
              cell: ({ row }: { row: { original: EmployeeWithCarlist } }) => {
                const employee = row.original;

                // Pool pseudo-employees cannot be edited or deactivated
                if (employee.isPool) {
                  return (
                    <Badge variant="outline" className="text-indigo-600 border-indigo-300">
                      {tCommon("system")}
                    </Badge>
                  );
                }

                return (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() =>
                          router.push(`/dipendenti/${employee.id}/edit`)
                        }
                      >
                        <Pencil className="mr-2 h-4 w-4" />
                        {tCommon("edit")}
                      </DropdownMenuItem>
                      {employee.isActive ? (
                        <DropdownMenuItem
                          onClick={() =>
                            setConfirmDialog({
                              open: true,
                              employeeId: Number(employee.id),
                              employeeName: `${employee.firstName} ${employee.lastName}`,
                              action: "deactivate",
                            })
                          }
                          className="text-destructive"
                        >
                          <Ban className="mr-2 h-4 w-4" />
                          {tCommon("deactivate")}
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem
                          onClick={() =>
                            setConfirmDialog({
                              open: true,
                              employeeId: Number(employee.id),
                              employeeName: `${employee.firstName} ${employee.lastName}`,
                              action: "reactivate",
                            })
                          }
                        >
                          <RotateCcw className="mr-2 h-4 w-4" />
                          {tCommon("reactivate")}
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                );
              },
            } satisfies ColumnDef<EmployeeWithCarlist>,
          ]
        : []),
    ],
    [canEdit, router, t, tCommon]
  );

  const table = useReactTable({
    data: employees,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: pagination.totalPages,
  });

  const currentStatusFilter = searchParams.get("isActive") ?? "all";

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
            <SelectItem value="true">{tCommon("active")}</SelectItem>
            <SelectItem value="false">{tCommon("inactive")}</SelectItem>
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
                  className="h-24 text-center text-muted-foreground"
                >
                  {isPending
                    ? tCommon("loading")
                    : t("noEmployeesFound")}
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
            {pagination.totalCount} {t("employeesTotal")} - {tCommon("page", { page: pagination.page, totalPages: pagination.totalPages })}
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

      {/* Confirm Dialog */}
      <AlertDialog
        open={confirmDialog.open}
        onOpenChange={(open) =>
          setConfirmDialog({ ...confirmDialog, open })
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmDialog.action === "deactivate"
                ? t("deactivateEmployee")
                : t("reactivateEmployee")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog.action === "deactivate"
                ? t("deactivateDescription", { name: confirmDialog.employeeName })
                : t("reactivateDescription", { name: confirmDialog.employeeName })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isActionLoading}>
              {tCommon("cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmAction}
              disabled={isActionLoading}
            >
              {isActionLoading
                ? confirmDialog.action === "deactivate"
                  ? tCommon("deactivating")
                  : tCommon("reactivating")
                : confirmDialog.action === "deactivate"
                  ? tCommon("deactivate")
                  : tCommon("reactivate")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
