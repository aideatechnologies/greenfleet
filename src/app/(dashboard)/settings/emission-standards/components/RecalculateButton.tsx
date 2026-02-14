"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { recalculateEmissions } from "../actions/recalculate-emissions";

export function RecalculateButton() {
  const [isLoading, setIsLoading] = useState(false);

  async function handleRecalculate() {
    setIsLoading(true);
    try {
      const result = await recalculateEmissions();
      if (result.success) {
        const { updated, errors } = result.data;
        if (errors > 0) {
          toast.warning(
            `Ricalcolo completato: ${updated} motori aggiornati, ${errors} errori`
          );
        } else if (updated === 0) {
          toast.info("Nessun motore da aggiornare");
        } else {
          toast.success(`Ricalcolo completato: ${updated} motori aggiornati`);
        }
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error("Errore nel ricalcolo delle emissioni");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" disabled={isLoading}>
          <RefreshCw
            className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
          />
          {isLoading ? "Ricalcolo..." : "Ricalcola emissioni"}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Ricalcola emissioni</AlertDialogTitle>
          <AlertDialogDescription>
            Questa operazione ricalcolera i valori WLTP e NEDC mancanti per
            tutti i motori nel catalogo, usando la configurazione di conversione
            associata o quella predefinita. I valori inseriti manualmente non
            verranno sovrascritti.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Annulla</AlertDialogCancel>
          <AlertDialogAction onClick={handleRecalculate} disabled={isLoading}>
            {isLoading ? "Ricalcolo in corso..." : "Ricalcola"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
