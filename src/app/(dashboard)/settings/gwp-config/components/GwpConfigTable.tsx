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
import { deleteGwpConfigAction } from "../actions/delete-gwp-config";
import { GwpConfigForm } from "./GwpConfigForm";
import { formatNumber } from "@/lib/utils/format";

type GwpConfigRow = {
  id: string;
  gasName: string;
  gwpValue: number;
  source: string;
  isActive: boolean;
  createdAt: Date;
};

export function GwpConfigTable({
  gwpConfigs,
  canEdit,
}: {
  gwpConfigs: GwpConfigRow[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    id: string;
    gasName: string;
  }>({ open: false, id: "", gasName: "" });
  const [isLoading, setIsLoading] = useState(false);

  async function handleDelete() {
    setIsLoading(true);
    try {
      const result = await deleteGwpConfigAction(deleteDialog.id);
      if (result.success) {
        toast.success("Configurazione GWP eliminata");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error("Errore nell'eliminazione");
    } finally {
      setIsLoading(false);
      setDeleteDialog({ open: false, id: "", gasName: "" });
    }
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Gas</TableHead>
            <TableHead className="text-right">GWP</TableHead>
            <TableHead>Fonte</TableHead>
            <TableHead>Attivo</TableHead>
            {canEdit && <TableHead className="w-[50px]" />}
          </TableRow>
        </TableHeader>
        <TableBody>
          {gwpConfigs.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={canEdit ? 5 : 4}
                className="text-center text-muted-foreground"
              >
                Nessuna configurazione GWP presente
              </TableCell>
            </TableRow>
          )}
          {gwpConfigs.map((config) => (
            <TableRow key={config.id}>
              <TableCell className="font-medium">{config.gasName}</TableCell>
              <TableCell className="text-right font-mono">
                {formatNumber(config.gwpValue, 0)}
              </TableCell>
              <TableCell>{config.source}</TableCell>
              <TableCell>
                <Badge variant={config.isActive ? "default" : "outline"}>
                  {config.isActive ? "Attivo" : "Inattivo"}
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
                      <GwpConfigForm
                        mode="edit"
                        configId={config.id}
                        defaultValues={{
                          gasName: config.gasName,
                          gwpValue: config.gwpValue,
                          source: config.source,
                          isActive: config.isActive,
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
                            id: config.id,
                            gasName: config.gasName,
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
            <AlertDialogTitle>Elimina configurazione GWP</AlertDialogTitle>
            <AlertDialogDescription>
              Stai per eliminare la configurazione GWP per &quot;
              {deleteDialog.gasName}&quot;. Questa azione non puo essere
              annullata.
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
