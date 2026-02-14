"use client";

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
import { AlertTriangle } from "lucide-react";

type SuccessionConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeContractInfo: string;
  onConfirm: () => void;
  isPending?: boolean;
};

export function SuccessionConfirmDialog({
  open,
  onOpenChange,
  activeContractInfo,
  onConfirm,
  isPending = false,
}: SuccessionConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Contratto attivo esistente
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>{activeContractInfo}</p>
              <div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
                <p className="font-medium">Attenzione</p>
                <p>
                  Procedendo, il contratto attivo attuale verra chiuso
                  automaticamente e sostituito dal nuovo contratto. Questa azione
                  non puo essere annullata.
                </p>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Annulla</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isPending}
            className="bg-amber-600 text-white hover:bg-amber-700"
          >
            {isPending
              ? "Creazione in corso..."
              : "Conferma e chiudi precedente"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
