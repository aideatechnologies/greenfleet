"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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
import { XCircle } from "lucide-react";
import { closeContractAction } from "../actions/close-contract";

type CloseContractButtonProps = {
  contractId: string;
};

export function CloseContractButton({ contractId }: CloseContractButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  function handleClose() {
    startTransition(async () => {
      try {
        const result = await closeContractAction(Number(contractId));
        if (result.success) {
          toast.success("Contratto chiuso con successo");
          setOpen(false);
          router.refresh();
        } else {
          toast.error(result.error);
        }
      } catch {
        toast.error("Errore nella chiusura del contratto");
      }
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm">
          <XCircle className="mr-1 h-4 w-4" />
          Chiudi contratto
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Chiudi contratto</AlertDialogTitle>
          <AlertDialogDescription>
            Sei sicuro di voler chiudere questo contratto? Questa azione non
            puo essere annullata. Il contratto verra contrassegnato come chiuso
            e non sara piu modificabile.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Annulla</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleClose}
            disabled={isPending}
            className="bg-destructive text-white hover:bg-destructive/90"
          >
            {isPending ? "Chiusura in corso..." : "Conferma chiusura"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
