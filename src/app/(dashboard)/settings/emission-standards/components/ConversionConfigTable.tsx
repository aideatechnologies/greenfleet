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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { MoreHorizontal, Star, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";
import {
  deleteConversionConfig,
  setDefaultConversionConfig,
} from "../actions/manage-conversion-config";
import { ConversionConfigForm } from "./ConversionConfigForm";
import { formatNumber } from "@/lib/utils/format";

type ConversionConfigRow = {
  id: string;
  name: string;
  nedcToWltpFactor: number;
  wltpToNedcFactor: number;
  isDefault: boolean;
  createdAt: Date;
};

export function ConversionConfigTable({
  configs,
}: {
  configs: ConversionConfigRow[];
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
      const result = await deleteConversionConfig(deleteDialog.id);
      if (result.success) {
        toast.success("Configurazione eliminata");
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

  async function handleSetDefault(id: string) {
    try {
      const result = await setDefaultConversionConfig(id);
      if (result.success) {
        toast.success("Configurazione predefinita aggiornata");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error("Errore nell'aggiornamento");
    }
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead className="text-right">NEDC → WLTP</TableHead>
            <TableHead className="text-right">WLTP → NEDC</TableHead>
            <TableHead>Predefinita</TableHead>
            <TableHead className="w-[50px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {configs.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={5}
                className="text-center text-muted-foreground"
              >
                Nessuna configurazione di conversione presente
              </TableCell>
            </TableRow>
          )}
          {configs.map((config) => (
            <TableRow key={config.id}>
              <TableCell className="font-medium">{config.name}</TableCell>
              <TableCell className="text-right font-mono">
                {formatNumber(config.nedcToWltpFactor, 2)}
              </TableCell>
              <TableCell className="text-right font-mono">
                {formatNumber(config.wltpToNedcFactor, 2)}
              </TableCell>
              <TableCell>
                {config.isDefault ? (
                  <Badge variant="default">Predefinita</Badge>
                ) : (
                  <Badge variant="secondary">-</Badge>
                )}
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <ConversionConfigForm
                      mode="edit"
                      configId={config.id}
                      defaultValues={{
                        name: config.name,
                        nedcToWltpFactor: config.nedcToWltpFactor,
                        wltpToNedcFactor: config.wltpToNedcFactor,
                        isDefault: config.isDefault,
                      }}
                      trigger={
                        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Modifica
                        </DropdownMenuItem>
                      }
                    />
                    {!config.isDefault && (
                      <DropdownMenuItem
                        onClick={() => handleSetDefault(config.id)}
                      >
                        <Star className="mr-2 h-4 w-4" />
                        Imposta come predefinita
                      </DropdownMenuItem>
                    )}
                    {!config.isDefault && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() =>
                            setDeleteDialog({
                              open: true,
                              id: config.id,
                              name: config.name,
                            })
                          }
                          className="text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Elimina
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
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
            <AlertDialogTitle>Elimina configurazione</AlertDialogTitle>
            <AlertDialogDescription>
              Stai per eliminare la configurazione &quot;{deleteDialog.name}
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
