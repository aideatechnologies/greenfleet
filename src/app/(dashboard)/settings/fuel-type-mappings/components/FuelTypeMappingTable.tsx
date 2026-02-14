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
import { deleteFuelTypeMappingAction } from "../actions/delete-fuel-type-mapping";
import { FuelTypeMappingForm } from "./FuelTypeMappingForm";
import { SCOPE_LABELS, type EmissionScope } from "@/types/emission";

type MacroFuelTypeRef = {
  id: string;
  name: string;
  scope: number;
  unit: string;
};

type FuelTypeMappingRow = {
  id: string;
  vehicleFuelType: string;
  macroFuelTypeId: string;
  scope: number;
  description?: string;
  macroFuelType: MacroFuelTypeRef;
};

export function FuelTypeMappingTable({
  mappings,
  macroFuelTypes,
  canEdit,
}: {
  mappings: FuelTypeMappingRow[];
  macroFuelTypes: MacroFuelTypeRef[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    id: string;
    label: string;
  }>({ open: false, id: "", label: "" });
  const [isLoading, setIsLoading] = useState(false);

  async function handleDelete() {
    setIsLoading(true);
    try {
      const result = await deleteFuelTypeMappingAction(deleteDialog.id);
      if (result.success) {
        toast.success("Mappatura carburante eliminata");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error("Errore nell'eliminazione");
    } finally {
      setIsLoading(false);
      setDeleteDialog({ open: false, id: "", label: "" });
    }
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tipo Carburante Veicolo</TableHead>
            <TableHead>Descrizione</TableHead>
            <TableHead>Macro Tipo</TableHead>
            <TableHead>Scope</TableHead>
            {canEdit && <TableHead className="w-[50px]" />}
          </TableRow>
        </TableHeader>
        <TableBody>
          {mappings.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={canEdit ? 5 : 4}
                className="text-center text-muted-foreground"
              >
                Nessuna mappatura carburante presente
              </TableCell>
            </TableRow>
          )}
          {mappings.map((mapping) => (
            <TableRow key={mapping.id}>
              <TableCell className="font-medium">
                {mapping.vehicleFuelType}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {mapping.description || "-"}
              </TableCell>
              <TableCell>{mapping.macroFuelType.name}</TableCell>
              <TableCell>
                <Badge
                  variant={mapping.scope === 1 ? "default" : "secondary"}
                  className={
                    mapping.scope === 1
                      ? "bg-green-100 text-green-800 hover:bg-green-100"
                      : "bg-blue-100 text-blue-800 hover:bg-blue-100"
                  }
                >
                  {SCOPE_LABELS[mapping.scope as EmissionScope] ??
                    `Scope ${mapping.scope}`}
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
                      <FuelTypeMappingForm
                        mode="edit"
                        mappingId={mapping.id}
                        macroFuelTypes={macroFuelTypes}
                        defaultValues={{
                          vehicleFuelType: mapping.vehicleFuelType,
                          macroFuelTypeId: mapping.macroFuelTypeId,
                          scope: mapping.scope,
                          description: mapping.description ?? "",
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
                            id: mapping.id,
                            label:
                              mapping.description || mapping.vehicleFuelType,
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
            <AlertDialogTitle>Elimina mappatura carburante</AlertDialogTitle>
            <AlertDialogDescription>
              Stai per eliminare la mappatura per &quot;{deleteDialog.label}
              &quot;. Questa azione non puo essere annullata.
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
