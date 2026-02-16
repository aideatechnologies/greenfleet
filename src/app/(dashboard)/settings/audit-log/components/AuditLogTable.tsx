"use client";

import { useState, useCallback, Fragment } from "react";
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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { ChevronDown, ChevronRight, X, ArrowLeft, ArrowRight } from "lucide-react";
import type { SerializableAuditLogEntry } from "../actions/get-audit-entries";
import type { AuditChange } from "@/types/audit";
import {
  ENTITY_TYPE_OPTIONS,
  ENTITY_TYPE_LABELS,
  ACTION_TYPE_OPTIONS,
  ACTION_TYPE_LABELS,
} from "@/types/audit";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface AuditLogTableProps {
  initialData: SerializableAuditLogEntry[];
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
  };
  users: { id: string; name: string }[];
  // Current filter values (from URL search params)
  currentFilters: {
    entityType?: string;
    userId?: string;
    actionType?: string;
    dateFrom?: string;
    dateTo?: string;
    page: number;
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getActionLabel(action: string): string {
  const parts = action.split(".");
  if (parts.length !== 2) return action;
  const [entity, verb] = parts;
  const entityLabel = entity.replace(/_/g, " ");
  const verbLabel = ACTION_TYPE_LABELS[verb] ?? verb;
  return `${entityLabel} - ${verbLabel}`;
}

function getActionBadgeVariant(action: string): "default" | "secondary" | "destructive" {
  if (action.endsWith(".created")) return "default";
  if (action.endsWith(".deleted")) return "destructive";
  return "secondary";
}

function formatValue(val: unknown): string {
  if (val === null || val === undefined) return "-";
  if (typeof val === "string") return val;
  if (typeof val === "number") return val.toLocaleString("it-IT");
  if (typeof val === "boolean") return val ? "Si" : "No";
  return JSON.stringify(val);
}

// ---------------------------------------------------------------------------
// Change detail row
// ---------------------------------------------------------------------------

function ChangeDetail({ changes }: { changes: AuditChange[] }) {
  if (changes.length === 0) {
    return (
      <p className="text-sm text-muted-foreground italic">
        Nessun dettaglio modifiche disponibile
      </p>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[200px]">Campo</TableHead>
            <TableHead>Valore precedente</TableHead>
            <TableHead>Nuovo valore</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {changes.map((change, idx) => (
            <TableRow key={idx}>
              <TableCell className="font-mono text-sm">{change.field}</TableCell>
              <TableCell className="text-sm text-red-600 dark:text-red-400">
                {formatValue(change.old)}
              </TableCell>
              <TableCell className="text-sm text-green-600 dark:text-green-400">
                {formatValue(change.new)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Filter bar
// ---------------------------------------------------------------------------

function buildFilterUrl(
  currentFilters: AuditLogTableProps["currentFilters"],
  updates: Record<string, string | undefined>
): string {
  const params = new URLSearchParams();

  const merged = { ...currentFilters, ...updates, page: "1" };

  for (const [key, val] of Object.entries(merged)) {
    if (val !== undefined && val !== "" && key !== "page") {
      params.set(key, String(val));
    }
  }

  // Only add page if > 1
  if (updates.page && updates.page !== "1") {
    params.set("page", updates.page);
  }

  const qs = params.toString();
  return `/settings/audit-log${qs ? `?${qs}` : ""}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AuditLogTable({
  initialData,
  pagination,
  users,
  currentFilters,
}: AuditLogTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  const toggleRow = useCallback((id: number) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const columns: ColumnDef<SerializableAuditLogEntry>[] = [
    {
      id: "expand",
      header: "",
      cell: ({ row }) => {
        const isExpanded = expandedRows.has(row.original.id);
        return (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => toggleRow(row.original.id)}
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        );
      },
      size: 40,
    },
    {
      accessorKey: "timestamp",
      header: "Data/Ora",
      cell: ({ getValue }) => (
        <span className="text-sm whitespace-nowrap">
          {formatTimestamp(getValue<string>())}
        </span>
      ),
    },
    {
      accessorKey: "userName",
      header: "Utente",
      cell: ({ getValue }) => (
        <span className="text-sm font-medium">{getValue<string>()}</span>
      ),
    },
    {
      accessorKey: "action",
      header: "Azione",
      cell: ({ getValue }) => {
        const action = getValue<string>();
        return (
          <Badge variant={getActionBadgeVariant(action)}>
            {getActionLabel(action)}
          </Badge>
        );
      },
    },
    {
      accessorKey: "entityType",
      header: "Tipo Entita",
      cell: ({ getValue }) => {
        const type = getValue<string>();
        return (
          <span className="text-sm">
            {ENTITY_TYPE_LABELS[type] ?? type}
          </span>
        );
      },
    },
    {
      accessorKey: "entityId",
      header: "ID Entita",
      cell: ({ getValue }) => (
        <span className="text-sm font-mono text-muted-foreground truncate max-w-[120px] block">
          {getValue<string>()}
        </span>
      ),
    },
    {
      id: "changesCount",
      header: "Modifiche",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.changes.length} camp{row.original.changes.length === 1 ? "o" : "i"}
        </span>
      ),
    },
  ];

  const table = useReactTable({
    data: initialData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: pagination.totalPages,
  });

  const hasActiveFilters =
    currentFilters.entityType ||
    currentFilters.userId ||
    currentFilters.actionType ||
    currentFilters.dateFrom ||
    currentFilters.dateTo;

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex flex-wrap gap-3">
        <div className="w-[180px]">
          <Select
            value={currentFilters.entityType ?? "ALL"}
            onValueChange={(val) => {
              const url = buildFilterUrl(currentFilters, {
                entityType: val === "ALL" ? undefined : val,
              });
              window.location.href = url;
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Tipo entita" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tutte le entita</SelectItem>
              {ENTITY_TYPE_OPTIONS.map((type) => (
                <SelectItem key={type} value={type}>
                  {ENTITY_TYPE_LABELS[type] ?? type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-[180px]">
          <Select
            value={currentFilters.userId ?? "ALL"}
            onValueChange={(val) => {
              const url = buildFilterUrl(currentFilters, {
                userId: val === "ALL" ? undefined : val,
              });
              window.location.href = url;
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Utente" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tutti gli utenti</SelectItem>
              {users.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-[180px]">
          <Select
            value={currentFilters.actionType ?? "ALL"}
            onValueChange={(val) => {
              const url = buildFilterUrl(currentFilters, {
                actionType: val === "ALL" ? undefined : val,
              });
              window.location.href = url;
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Tipo modifica" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tutte le azioni</SelectItem>
              {ACTION_TYPE_OPTIONS.map((type) => (
                <SelectItem key={type} value={type}>
                  {ACTION_TYPE_LABELS[type]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={currentFilters.dateFrom ?? ""}
            onChange={(e) => {
              const url = buildFilterUrl(currentFilters, {
                dateFrom: e.target.value || undefined,
              });
              window.location.href = url;
            }}
            className="w-[150px]"
            placeholder="Data inizio"
          />
          <span className="text-muted-foreground">-</span>
          <Input
            type="date"
            value={currentFilters.dateTo ?? ""}
            onChange={(e) => {
              const url = buildFilterUrl(currentFilters, {
                dateTo: e.target.value || undefined,
              });
              window.location.href = url;
            }}
            className="w-[150px]"
            placeholder="Data fine"
          />
        </div>
      </div>

      {/* Active filter chips */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2">
          {currentFilters.entityType && (
            <Badge variant="outline" className="gap-1">
              {ENTITY_TYPE_LABELS[currentFilters.entityType] ?? currentFilters.entityType}
              <a
                href={buildFilterUrl(currentFilters, { entityType: undefined })}
                className="ml-1 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </a>
            </Badge>
          )}
          {currentFilters.userId && (
            <Badge variant="outline" className="gap-1">
              {users.find((u) => u.id === currentFilters.userId)?.name ?? currentFilters.userId}
              <a
                href={buildFilterUrl(currentFilters, { userId: undefined })}
                className="ml-1 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </a>
            </Badge>
          )}
          {currentFilters.actionType && (
            <Badge variant="outline" className="gap-1">
              {ACTION_TYPE_LABELS[currentFilters.actionType] ?? currentFilters.actionType}
              <a
                href={buildFilterUrl(currentFilters, { actionType: undefined })}
                className="ml-1 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </a>
            </Badge>
          )}
          {currentFilters.dateFrom && (
            <Badge variant="outline" className="gap-1">
              Da: {currentFilters.dateFrom}
              <a
                href={buildFilterUrl(currentFilters, { dateFrom: undefined })}
                className="ml-1 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </a>
            </Badge>
          )}
          {currentFilters.dateTo && (
            <Badge variant="outline" className="gap-1">
              A: {currentFilters.dateTo}
              <a
                href={buildFilterUrl(currentFilters, { dateTo: undefined })}
                className="ml-1 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </a>
            </Badge>
          )}
          <a href="/settings/audit-log">
            <Badge variant="destructive" className="cursor-pointer gap-1">
              <X className="h-3 w-3" />
              Rimuovi tutti
            </Badge>
          </a>
        </div>
      )}

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
                  Nessuna modifica trovata per i filtri selezionati
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <Fragment key={row.id}>
                  <TableRow
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => toggleRow(row.original.id)}
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
                  {expandedRows.has(row.original.id) && (
                    <TableRow>
                      <TableCell colSpan={columns.length} className="p-4 bg-muted/30">
                        <ChangeDetail changes={row.original.changes} />
                        {row.original.metadata &&
                          Object.keys(row.original.metadata).length > 0 && (
                            <div className="mt-3">
                              <p className="text-xs font-medium text-muted-foreground mb-1">
                                Metadati
                              </p>
                              <pre className="text-xs bg-muted p-2 rounded-md overflow-x-auto">
                                {JSON.stringify(row.original.metadata, null, 2)}
                              </pre>
                            </div>
                          )}
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination footer */}
      {pagination.totalCount > 0 && (
        <div className="flex items-center justify-between border-t pt-4 text-sm text-muted-foreground">
          <span>
            Mostra {(pagination.page - 1) * pagination.pageSize + 1}-
            {Math.min(pagination.page * pagination.pageSize, pagination.totalCount)} di{" "}
            {pagination.totalCount.toLocaleString("it-IT")}
          </span>
          {pagination.totalPages > 1 && (
            <div className="flex gap-2">
              {pagination.page > 1 && (
                <Button variant="outline" size="sm" asChild>
                  <a
                    href={buildFilterUrl(currentFilters, {
                      page: String(pagination.page - 1),
                    })}
                  >
                    <ArrowLeft className="mr-1 h-4 w-4" />
                    Precedente
                  </a>
                </Button>
              )}
              <span className="flex items-center px-2">
                Pagina {pagination.page} di {pagination.totalPages}
              </span>
              {pagination.page < pagination.totalPages && (
                <Button variant="outline" size="sm" asChild>
                  <a
                    href={buildFilterUrl(currentFilters, {
                      page: String(pagination.page + 1),
                    })}
                  >
                    Successiva
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </a>
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
