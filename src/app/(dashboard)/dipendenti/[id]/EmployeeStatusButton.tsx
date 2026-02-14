"use client";

import { useState } from "react";
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
} from "@/components/ui/alert-dialog";
import { Ban, RotateCcw } from "lucide-react";
import { deactivateEmployeeAction } from "../actions/deactivate-employee";
import { reactivateEmployeeAction } from "../actions/reactivate-employee";

type EmployeeStatusButtonProps = {
  employeeId: string;
  employeeName: string;
  isActive: boolean;
};

export function EmployeeStatusButton({
  employeeId,
  employeeName,
  isActive,
}: EmployeeStatusButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  async function handleConfirm() {
    setIsLoading(true);
    try {
      const result = isActive
        ? await deactivateEmployeeAction(employeeId)
        : await reactivateEmployeeAction(employeeId);

      if (result.success) {
        toast.success(
          isActive ? "Dipendente disattivato" : "Dipendente riattivato"
        );
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error("Si è verificato un errore");
    } finally {
      setIsLoading(false);
      setOpen(false);
    }
  }

  return (
    <>
      <Button
        variant={isActive ? "destructive" : "outline"}
        onClick={() => setOpen(true)}
      >
        {isActive ? (
          <>
            <Ban className="mr-2 h-4 w-4" />
            Disattiva
          </>
        ) : (
          <>
            <RotateCcw className="mr-2 h-4 w-4" />
            Riattiva
          </>
        )}
      </Button>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isActive ? "Disattiva dipendente" : "Riattiva dipendente"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isActive
                ? `Stai per disattivare "${employeeName}". Il dipendente non sarà più visibile nelle selezioni attive.`
                : `Stai per riattivare "${employeeName}". Il dipendente tornerà visibile nelle selezioni attive.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>
              Annulla
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm} disabled={isLoading}>
              {isLoading
                ? isActive
                  ? "Disattivazione..."
                  : "Riattivazione..."
                : isActive
                  ? "Disattiva"
                  : "Riattiva"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
