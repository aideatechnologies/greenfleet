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
  TableFooter,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DeltaBar } from "@/components/data-display/DeltaBar";
import {
  formatEmission,
  formatKm,
  formatFuel,
  formatDeltaPercentage,
} from "@/lib/utils/number";
import type { EmissionAggregation, ReportResult } from "@/types/report";
import { ArrowUpDown } from "lucide-react";

// ---------------------------------------------------------------------------
// Columns
// ---------------------------------------------------------------------------

const columns: ColumnDef<EmissionAggregation>[] = [
  {
    accessorKey: "label",
    header: ({ column }) => (
      <button
        className="flex items-center gap-1 font-medium"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Gruppo
        <ArrowUpDown className="size-3.5" />
      </button>
    ),
    cell: ({ row }) => (
      <span className="font-medium">{row.getValue("label")}</span>
    ),
  },
  {
    accessorKey: "theoreticalEmissions",
    header: ({ column }) => (
      <button
        className="flex items-center gap-1 font-medium"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Teoriche
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
    accessorKey: "realEmissions",
    header: ({ column }) => (
      <button
        className="flex items-center gap-1 font-medium"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Reali
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
    accessorKey: "deltaAbsolute",
    header: ({ column }) => (
      <button
        className="flex items-center gap-1 font-medium"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Delta
        <ArrowUpDown className="size-3.5" />
      </button>
    ),
    cell: ({ row }) => {
      const theoretical = row.original.theoreticalEmissions;
      const real = row.original.realEmissions;
      return (
        <DeltaBar
          theoretical={theoretical}
          real={real}
          variant="inline"
        />
      );
    },
  },
  {
    accessorKey: "deltaPercentage",
    header: ({ column }) => (
      <button
        className="flex items-center gap-1 font-medium"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Delta %
        <ArrowUpDown className="size-3.5" />
      </button>
    ),
    cell: ({ row }) => (
      <span className="tabular-nums">
        {formatDeltaPercentage(row.getValue("deltaPercentage"))}
      </span>
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
    accessorKey: "totalFuel",
    header: ({ column }) => (
      <button
        className="flex items-center gap-1 font-medium"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Carburante
        <ArrowUpDown className="size-3.5" />
      </button>
    ),
    cell: ({ row }) => (
      <span className="tabular-nums">
        {formatFuel(row.getValue("totalFuel"))}
      </span>
    ),
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface EmissionAggregationTableProps {
  data: EmissionAggregation[];
  metadata: ReportResult["metadata"];
}

export function EmissionAggregationTable({
  data,
  metadata,
}: EmissionAggregationTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  // Memoize footer totals from metadata
  const totals = useMemo(
    () => ({
      theoretical: formatEmission(metadata.totalTheoreticalEmissions),
      real: formatEmission(metadata.totalRealEmissions),
      deltaAbs: formatEmission(metadata.totalDeltaAbsolute),
      deltaPct: formatDeltaPercentage(metadata.totalDeltaPercentage),
      km: formatKm(metadata.totalKm),
      fuel: formatFuel(metadata.totalFuel),
    }),
    [metadata]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dettaglio Aggregazioni</CardTitle>
        <CardDescription>
          {data.length} {data.length === 1 ? "gruppo" : "gruppi"} nel periodo
          selezionato
        </CardDescription>
      </CardHeader>
      <CardContent>
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
                    Nessun dato disponibile.
                  </TableCell>
                </TableRow>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
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
            {data.length > 0 && (
              <TableFooter>
                <TableRow className="font-semibold">
                  <TableCell>Totale</TableCell>
                  <TableCell className="tabular-nums">
                    {totals.theoretical}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {totals.real}
                  </TableCell>
                  <TableCell>
                    <DeltaBar
                      theoretical={metadata.totalTheoreticalEmissions}
                      real={metadata.totalRealEmissions}
                      variant="inline"
                    />
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {totals.deltaPct}
                  </TableCell>
                  <TableCell className="tabular-nums">{totals.km}</TableCell>
                  <TableCell className="tabular-nums">{totals.fuel}</TableCell>
                </TableRow>
              </TableFooter>
            )}
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
