"use client";

import { useMemo, useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DeltaBar } from "@/components/data-display/DeltaBar";
import { Progress } from "@/components/ui/progress";
import {
  formatEmission,
  formatKm,
  formatDeltaPercentage,
} from "@/lib/utils/number";
import { cn } from "@/lib/utils";
import { ArrowUpDown } from "lucide-react";
import type { DrillDownItem, DrillDownLevel } from "@/types/report";

// ---------------------------------------------------------------------------
// Contribution bar color logic
// ---------------------------------------------------------------------------

function getContributionColor(percentage: number): string {
  if (percentage > 35) return "bg-red-500";
  if (percentage > 20) return "bg-amber-500";
  return "bg-teal-500";
}

function getContributionTextColor(percentage: number): string {
  if (percentage > 35) return "text-red-700 dark:text-red-400";
  if (percentage > 20) return "text-amber-700 dark:text-amber-400";
  return "text-teal-700 dark:text-teal-400";
}

// ---------------------------------------------------------------------------
// Contribution Cell
// ---------------------------------------------------------------------------

function ContributionCell({ value }: { value: number }) {
  const fmtPct = new Intl.NumberFormat("it-IT", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });

  return (
    <div className="flex items-center gap-2">
      <div className="relative h-2 w-16 flex-shrink-0 rounded-full bg-muted overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-300",
            getContributionColor(value)
          )}
          style={{ width: `${Math.min(value, 100)}%` }}
        />
      </div>
      <span
        className={cn(
          "text-xs font-medium tabular-nums",
          getContributionTextColor(value)
        )}
      >
        {fmtPct.format(value)}%
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Columns builder
// ---------------------------------------------------------------------------

function buildColumns(
  level: DrillDownLevel,
  onItemClick?: (item: DrillDownItem) => void
): ColumnDef<DrillDownItem>[] {
  const columns: ColumnDef<DrillDownItem>[] = [
    {
      accessorKey: "label",
      header: ({ column }) => (
        <button
          className="flex items-center gap-1 font-medium"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          {level === "FLEET" ? "Carlist" : "Veicolo"}
          <ArrowUpDown className="size-3.5" />
        </button>
      ),
      cell: ({ row }) => {
        const canDrill = level !== "VEHICLE";
        return (
          <button
            className={cn(
              "text-left font-medium",
              canDrill && "text-primary hover:underline cursor-pointer"
            )}
            onClick={() => canDrill && onItemClick?.(row.original)}
            disabled={!canDrill}
          >
            <span>{row.getValue("label")}</span>
            {row.original.subtitle && (
              <span className="ml-1 text-xs text-muted-foreground">
                {row.original.subtitle}
              </span>
            )}
            {row.original.childCount != null && row.original.childCount > 0 && (
              <span className="ml-1.5 text-xs text-muted-foreground">
                ({row.original.childCount} veicoli)
              </span>
            )}
          </button>
        );
      },
    },
    {
      accessorKey: "realEmissions",
      header: ({ column }) => (
        <button
          className="flex items-center gap-1 font-medium"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Emissioni Reali
          <ArrowUpDown className="size-3.5" />
        </button>
      ),
      cell: ({ row }) => (
        <span className="tabular-nums">
          {formatEmission(row.getValue("realEmissions"))}
        </span>
      ),
    },
    {
      accessorKey: "theoreticalEmissions",
      header: ({ column }) => (
        <button
          className="flex items-center gap-1 font-medium"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Emissioni Teoriche
          <ArrowUpDown className="size-3.5" />
        </button>
      ),
      cell: ({ row }) => (
        <span className="tabular-nums">
          {formatEmission(row.getValue("theoreticalEmissions"))}
        </span>
      ),
    },
    {
      accessorKey: "delta",
      header: ({ column }) => (
        <button
          className="flex items-center gap-1 font-medium"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Delta
          <ArrowUpDown className="size-3.5" />
        </button>
      ),
      cell: ({ row }) => (
        <DeltaBar
          theoretical={row.original.theoreticalEmissions}
          real={row.original.realEmissions}
          variant="inline"
        />
      ),
    },
    {
      accessorKey: "totalKm",
      header: ({ column }) => (
        <button
          className="flex items-center gap-1 font-medium"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Km Totali
          <ArrowUpDown className="size-3.5" />
        </button>
      ),
      cell: ({ row }) => (
        <span className="tabular-nums">
          {formatKm(row.getValue("totalKm"))}
        </span>
      ),
    },
    {
      accessorKey: "contributionPercentage",
      header: ({ column }) => (
        <button
          className="flex items-center gap-1 font-medium"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Contributo %
          <ArrowUpDown className="size-3.5" />
        </button>
      ),
      cell: ({ row }) => (
        <ContributionCell value={row.getValue("contributionPercentage")} />
      ),
    },
  ];

  return columns;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface DrillDownListProps {
  items: DrillDownItem[];
  level: DrillDownLevel;
  onItemClick?: (item: DrillDownItem) => void;
}

export function DrillDownList({
  items,
  level,
  onItemClick,
}: DrillDownListProps) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "realEmissions", desc: true },
  ]);

  const columns = useMemo(
    () => buildColumns(level, onItemClick),
    [level, onItemClick]
  );

  const table = useReactTable({
    data: items,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <p className="text-sm">Nessun dato disponibile per il periodo selezionato.</p>
      </div>
    );
  }

  return (
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
          {table.getRowModel().rows.map((row) => (
            <TableRow
              key={row.id}
              className={cn(
                level !== "VEHICLE" && "cursor-pointer hover:bg-muted/50"
              )}
              onClick={() => {
                if (level !== "VEHICLE") {
                  onItemClick?.(row.original);
                }
              }}
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
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
