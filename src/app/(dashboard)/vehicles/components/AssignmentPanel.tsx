"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { toast } from "sonner";
import { UserPlus, UserMinus, ArrowRightLeft, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { AssignmentDialog } from "./AssignmentDialog";
import { unassignVehicleAction } from "../actions/unassign-vehicle";
import type { VehicleAssignmentWithEmployee } from "@/lib/services/assignment-service";

type AssignmentPanelProps = {
  vehicleId: number;
  currentAssignment: VehicleAssignmentWithEmployee | null;
  canEdit: boolean;
};

export function AssignmentPanel({
  vehicleId,
  currentAssignment,
  canEdit,
}: AssignmentPanelProps) {
  const router = useRouter();
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [unassignDialogOpen, setUnassignDialogOpen] = useState(false);
  const [isUnassigning, setIsUnassigning] = useState(false);

  async function handleUnassign() {
    setIsUnassigning(true);
    try {
      const result = await unassignVehicleAction({
        vehicleId,
        endDate: new Date(),
      });

      if (result.success) {
        toast.success("Assegnazione rimossa con successo");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error("Errore nella rimozione dell'assegnazione");
    } finally {
      setIsUnassigning(false);
      setUnassignDialogOpen(false);
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Assegnazione</CardTitle>
            {canEdit && (
              <div className="flex gap-2">
                {currentAssignment ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setAssignDialogOpen(true)}
                    >
                      <ArrowRightLeft className="mr-2 h-4 w-4" />
                      Cambia
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setUnassignDialogOpen(true)}
                    >
                      <UserMinus className="mr-2 h-4 w-4" />
                      Rimuovi
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAssignDialogOpen(true)}
                  >
                    <UserPlus className="mr-2 h-4 w-4" />
                    Assegna Dipendente
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {currentAssignment ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                {currentAssignment.employee.isPool ? (
                  <Badge variant="default" className="bg-indigo-600 hover:bg-indigo-600/90">
                    <Users className="mr-1 h-3 w-3" />
                    Pool
                  </Badge>
                ) : (
                  <Badge variant="default" className="bg-green-600 hover:bg-green-600/90">
                    Attivo
                  </Badge>
                )}
              </div>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <dt className="text-muted-foreground">Dipendente</dt>
                <dd className="font-medium">
                  {currentAssignment.employee.isPool
                    ? "Veicolo condiviso — assegnato al Pool"
                    : `${currentAssignment.employee.firstName} ${currentAssignment.employee.lastName}`}
                </dd>
                <dt className="text-muted-foreground">Data assegnazione</dt>
                <dd className="font-medium">
                  {format(new Date(currentAssignment.startDate), "dd MMM yyyy", {
                    locale: it,
                  })}
                </dd>
                {currentAssignment.notes && (
                  <>
                    <dt className="text-muted-foreground">Note</dt>
                    <dd className="font-medium">{currentAssignment.notes}</dd>
                  </>
                )}
              </dl>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Nessun dipendente assegnato a questo veicolo.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Assignment Dialog */}
      <AssignmentDialog
        vehicleId={vehicleId}
        open={assignDialogOpen}
        onOpenChange={setAssignDialogOpen}
      />

      {/* Unassign Confirmation Dialog */}
      <AlertDialog open={unassignDialogOpen} onOpenChange={setUnassignDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rimuovi assegnazione</AlertDialogTitle>
            <AlertDialogDescription>
              Stai per rimuovere l&apos;assegnazione di{" "}
              <strong>
                {currentAssignment?.employee.firstName}{" "}
                {currentAssignment?.employee.lastName}
              </strong>{" "}
              da questo veicolo. L&apos;assegnazione verra chiusa con data odierna.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isUnassigning}>
              Annulla
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleUnassign}
              disabled={isUnassigning}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isUnassigning ? "Rimozione..." : "Rimuovi assegnazione"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
