"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
import { MoreHorizontal, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { deleteMacroFuelTypeAction } from "../actions/delete-macro-fuel-type";
import { MacroFuelTypeForm } from "./MacroFuelTypeForm";
import { SCOPE_LABELS, type EmissionScope } from "@/types/emission";
import type { FuelUnit } from "@/lib/utils/fuel-units";

type MacroFuelTypeRow = {
  id: string;
  name: string;
  scope: number;
  unit: string;
  color: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
};

export function MacroFuelTypeTable({
  macroFuelTypes,
  canEdit,
}: {
  macroFuelTypes: MacroFuelTypeRow[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    id: string;
    name: string;
  }>({ open: false, id: "", name: "" });
  const [isLoading, setIsLoading] = useState(false);

  async function handleDelete() {
    setIsLoading(true);
    try {
      const result = await deleteMacroFuelTypeAction(deleteDialog.id);
      if (result.success) {
        toast.success("Macro tipo carburante eliminato");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error("Errore nell'eliminazione");
    } finally {
      setIsLoading(false);
      setDeleteDialog({ open: false, id: "", name: "" });
    }
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Colore</TableHead>
            <TableHead>Scope</TableHead>
            <TableHead>Unita</TableHead>
            <TableHead className="text-right">Ordine</TableHead>
            <TableHead>Attivo</TableHead>
            {canEdit && <TableHead className="w-[50px]" />}
          </TableRow>
        </TableHeader>
        <TableBody>
          {macroFuelTypes.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={canEdit ? 7 : 6}
                className="text-center text-muted-foreground"
              >
                Nessun macro tipo carburante presente
              </TableCell>
            </TableRow>
          )}
          {macroFuelTypes.map((mft) => (
            <TableRow key={mft.id}>
              <TableCell className="font-medium">{mft.name}</TableCell>
              <TableCell>
                <span
                  className="inline-block h-5 w-5 rounded-full border border-border"
                  style={{ backgroundColor: mft.color || "#6366f1" }}
                />
              </TableCell>
              <TableCell>
                <Badge
                  variant={mft.scope === 1 ? "default" : "secondary"}
                  className={
                    mft.scope === 1
                      ? "bg-green-100 text-green-800 hover:bg-green-100"
                      : "bg-blue-100 text-blue-800 hover:bg-blue-100"
                  }
                >
                  {SCOPE_LABELS[mft.scope as EmissionScope] ?? `Scope ${mft.scope}`}
                </Badge>
              </TableCell>
              <TableCell>{mft.unit}</TableCell>
              <TableCell className="text-right">{mft.sortOrder}</TableCell>
              <TableCell>
                <Badge variant={mft.isActive ? "default" : "outline"}>
                  {mft.isActive ? "Attivo" : "Inattivo"}
                </Badge>
              </TableCell>
              {canEdit && (
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <MacroFuelTypeForm
                        mode="edit"
                        macroFuelTypeId={mft.id}
                        defaultValues={{
                          name: mft.name,
                          scope: mft.scope,
                          unit: mft.unit as FuelUnit,
                          color: mft.color,
                          sortOrder: mft.sortOrder,
                          isActive: mft.isActive,
                        }}
                        trigger={
                          <DropdownMenuItem
                            onSelect={(e) => e.preventDefault()}
                          >
                            <Pencil className="mr-2 h-4 w-4" />
                            Modifica
                          </DropdownMenuItem>
                        }
                      />
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() =>
                          setDeleteDialog({
                            open: true,
                            id: mft.id,
                            name: mft.name,
                          })
                        }
                        className="text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Elimina
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <AlertDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Elimina macro tipo carburante</AlertDialogTitle>
            <AlertDialogDescription>
              Stai per eliminare il macro tipo &quot;{deleteDialog.name}&quot;.
              Questa azione non puo essere annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isLoading}>
              {isLoading ? "Eliminazione..." : "Elimina"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
