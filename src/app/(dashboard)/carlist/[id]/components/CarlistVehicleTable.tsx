"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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
import { Car, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type {
  CarlistVehicle,
  CatalogVehicle,
  Engine,
} from "@/generated/prisma/client";
import { removeCatalogVehiclesFromCarlistAction } from "../../actions/manage-vehicles";
import { AddVehicleDialog } from "./AddVehicleDialog";
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

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type CarlistVehicleRow = CarlistVehicle & {
  catalogVehicle: CatalogVehicle & {
    engines: Engine[];
  };
};

type CarlistVehicleTableProps = {
  carlistId: number;
  vehicles: CarlistVehicleRow[];
  canEdit: boolean;
  fuelTypeLabels?: Record<string, string>;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CarlistVehicleTable({
  carlistId,
  vehicles,
  canEdit,
  fuelTypeLabels = {},
}: CarlistVehicleTableProps) {
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<CarlistVehicleRow | null>(
    null
  );
  const [isRemoving, startRemoveTransition] = useTransition();

  function handleRemoveClick(row: CarlistVehicleRow, e: React.MouseEvent) {
    e.stopPropagation();
    setRemoveTarget(row);
    setRemoveDialogOpen(true);
  }

  function handleRemoveConfirm() {
    if (!removeTarget) return;
    startRemoveTransition(async () => {
      try {
        const result = await removeCatalogVehiclesFromCarlistAction({
          carlistId,
          catalogVehicleIds: [removeTarget.catalogVehicleId],
        });
        if (result.success) {
          toast.success("Veicolo rimosso dalla carlist");
          router.refresh();
        } else {
          toast.error(result.error);
        }
      } catch {
        toast.error("Errore nella rimozione del veicolo");
      } finally {
        setRemoveDialogOpen(false);
        setRemoveTarget(null);
      }
    });
  }

  const columns = useMemo<ColumnDef<CarlistVehicleRow>[]>(
    () => [
      {
        id: "marca",
        header: "Marca",
        cell: ({ row }) => (
          <span className="font-medium">
            {row.original.catalogVehicle.marca}
          </span>
        ),
      },
      {
        id: "modello",
        header: "Modello",
        cell: ({ row }) => (
          <div>
            <span className="text-sm">
              {row.original.catalogVehicle.modello}
            </span>
            {row.original.catalogVehicle.allestimento && (
              <p className="text-xs text-muted-foreground">
                {row.original.catalogVehicle.allestimento}
              </p>
            )}
          </div>
        ),
      },
      {
        id: "motore",
        header: "Motore",
        cell: ({ row }) => {
          const engine = row.original.catalogVehicle.engines[0];
          if (!engine) return "-";
          const parts: string[] = [];
          const fuelLabel = fuelTypeLabels[engine.fuelType] ?? engine.fuelType;
          parts.push(fuelLabel);
          if (engine.potenzaKw) parts.push(`${engine.potenzaKw} kW`);
          if (engine.cilindrata) parts.push(`${engine.cilindrata} cc`);
          return (
            <div className="text-sm">
              <Badge variant="outline" className="mr-1">
                {fuelLabel}
              </Badge>
              {engine.potenzaKw && (
                <span className="text-xs text-muted-foreground">
                  {engine.potenzaKw} kW
                  {engine.cilindrata ? ` · ${engine.cilindrata} cc` : ""}
                </span>
              )}
            </div>
          );
        },
      },
      ...(canEdit
        ? [
            {
              id: "actions",
              header: "",
              cell: ({ row }: { row: { original: CarlistVehicleRow } }) => (
                <div className="flex justify-end">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={(e) => handleRemoveClick(row.original, e)}
                    title="Rimuovi dalla carlist"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ),
            } satisfies ColumnDef<CarlistVehicleRow>,
          ]
        : []),
    ],
    [canEdit, fuelTypeLabels]
  );

  const table = useReactTable({
    data: vehicles,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  // IDs of catalog vehicles already in the carlist
  const existingCatalogVehicleIds = useMemo(
    () => vehicles.map((v) => Number(v.catalogVehicleId)),
    [vehicles]
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Veicoli nella carlist</h3>
        {canEdit && (
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Aggiungi veicoli
          </Button>
        )}
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
                    <p>Nessun veicolo in questa carlist</p>
                    <p className="text-xs">
                      Aggiungi veicoli catalogo per popolare il raggruppamento.
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
                    router.push(
                      `/vehicles/catalog/${row.original.catalogVehicleId}`
                    )
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

      {/* Add vehicle dialog */}
      <AddVehicleDialog
        carlistId={carlistId}
        existingCatalogVehicleIds={existingCatalogVehicleIds}
        open={addOpen}
        onOpenChange={setAddOpen}
      />

      {/* Remove confirmation */}
      <AlertDialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conferma rimozione</AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler rimuovere{" "}
              <strong>
                {removeTarget?.catalogVehicle.marca}{" "}
                {removeTarget?.catalogVehicle.modello}
              </strong>{" "}
              da questa carlist?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRemoving}>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveConfirm}
              disabled={isRemoving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isRemoving ? "Rimozione..." : "Rimuovi"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
