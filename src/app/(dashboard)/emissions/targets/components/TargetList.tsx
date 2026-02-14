"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";

import {
  TARGET_SCOPE_LABELS,
  TARGET_PERIOD_LABELS,
  TARGET_STATUS_LABELS,
} from "@/types/emission-target";
import type { TargetScope, TargetPeriod, TargetStatus } from "@/types/emission-target";
import { ProgressTarget } from "@/components/data-display/ProgressTarget";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { cn } from "@/lib/utils";
import { deleteEmissionTargetAction } from "../actions/delete-emission-target";
import { EmissionTargetForm } from "./EmissionTargetForm";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SerializedMilestone = {
  label: string;
  date: string;
  expectedValue: number;
  achieved: boolean;
  onTrack: boolean;
};

type SerializedProgress = {
  targetValue: number;
  currentValue: number;
  percentage: number;
  remaining: number;
  status: TargetStatus;
  milestones: SerializedMilestone[];
};

export type TargetWithProgress = {
  id: string;
  scope: string;
  carlistId: string | null;
  carlistName: string | null;
  targetValue: number;
  period: string;
  startDate: string;
  endDate: string;
  description: string | null;
  createdBy: string;
  progress: SerializedProgress;
};

type TargetListProps = {
  targets: TargetWithProgress[];
  canEdit: boolean;
};

// ---------------------------------------------------------------------------
// Number formatter
// ---------------------------------------------------------------------------

const fmt = new Intl.NumberFormat("it-IT", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});

// ---------------------------------------------------------------------------
// Status badge variant
// ---------------------------------------------------------------------------

function statusBadgeVariant(status: TargetStatus) {
  switch (status) {
    case "on-track":
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400";
    case "at-risk":
      return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400";
    case "off-track":
      return "bg-destructive/10 text-destructive";
    case "completed":
      return "bg-muted text-muted-foreground";
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TargetList({ targets, canEdit }: TargetListProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<TargetWithProgress | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  function handleDelete() {
    if (!deleteTargetId) return;
    startTransition(async () => {
      const result = await deleteEmissionTargetAction(deleteTargetId);
      if (result.success) {
        toast.success("Target eliminato con successo");
        setDeleteTargetId(null);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  // Empty state
  if (targets.length === 0 && !createOpen) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed p-12">
        <p className="text-lg font-medium text-muted-foreground">
          Configura il tuo primo target di emissioni
        </p>
        <p className="text-sm text-muted-foreground">
          Definisci obiettivi di riduzione per monitorare i progressi della tua
          flotta.
        </p>
        {canEdit && (
          <>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Nuovo target
            </Button>
            <EmissionTargetForm
              mode="create"
              open={createOpen}
              onOpenChange={setCreateOpen}
            />
          </>
        )}
      </div>
    );
  }

  return (
    <>
      {/* Action bar */}
      {canEdit && (
        <div className="flex justify-end">
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nuovo target
          </Button>
        </div>
      )}

      {/* Card grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {targets.map((target) => {
          const scope = target.scope as TargetScope;
          const period = target.period as TargetPeriod;
          const { progress } = target;

          // Map milestones to ProgressTarget format
          const progressMilestones =
            progress.milestones.length > 0
              ? progress.milestones.map((m) => ({
                  position: (m.expectedValue / progress.targetValue) * 100,
                  label: m.label,
                  reached: m.achieved,
                }))
              : undefined;

          return (
            <Card key={target.id} className="relative">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    {scope === "Carlist" && target.carlistName
                      ? target.carlistName
                      : TARGET_SCOPE_LABELS[scope]}
                  </CardTitle>
                  <Badge
                    variant="outline"
                    className={cn("text-xs", statusBadgeVariant(progress.status))}
                  >
                    {TARGET_STATUS_LABELS[progress.status]}
                  </Badge>
                </div>
                <CardDescription className="flex items-center gap-2">
                  <span>{TARGET_PERIOD_LABELS[period]}</span>
                  <span className="text-muted-foreground/40">|</span>
                  <span>
                    {format(new Date(target.startDate), "dd MMM yyyy", {
                      locale: it,
                    })}{" "}
                    -{" "}
                    {format(new Date(target.endDate), "dd MMM yyyy", {
                      locale: it,
                    })}
                  </span>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Progress bar */}
                <ProgressTarget
                  value={progress.currentValue}
                  target={progress.targetValue}
                  valueLabel={`${fmt.format(progress.currentValue)} kgCO2e`}
                  targetLabel={`Target: ${fmt.format(progress.targetValue)} kgCO2e`}
                  milestones={progressMilestones}
                  overTargetIsBad
                  variant="full"
                />

                {/* Description */}
                {target.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {target.description}
                  </p>
                )}

                {/* Remaining */}
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    Rimanente: {fmt.format(Math.max(progress.remaining, 0))}{" "}
                    kgCO2e
                  </span>
                  {scope === "Carlist" && (
                    <Badge variant="secondary" className="text-[10px]">
                      Carlist
                    </Badge>
                  )}
                </div>

                {/* Actions */}
                {canEdit && (
                  <div className="flex justify-end gap-1 pt-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditTarget(target)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      <span className="sr-only">Modifica</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeleteTargetId(target.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span className="sr-only">Elimina</span>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Create dialog */}
      {canEdit && (
        <EmissionTargetForm
          mode="create"
          open={createOpen}
          onOpenChange={setCreateOpen}
        />
      )}

      {/* Edit dialog */}
      {canEdit && editTarget && (
        <EmissionTargetForm
          mode="edit"
          targetId={editTarget.id}
          defaultValues={{
            scope: editTarget.scope as "Fleet" | "Carlist",
            carlistId: editTarget.carlistId ?? undefined,
            targetValue: editTarget.targetValue,
            period: editTarget.period as "Annual" | "Monthly",
            startDate: new Date(editTarget.startDate),
            endDate: new Date(editTarget.endDate),
            description: editTarget.description ?? undefined,
          }}
          open={!!editTarget}
          onOpenChange={(open) => {
            if (!open) setEditTarget(null);
          }}
        />
      )}

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deleteTargetId}
        onOpenChange={(open) => {
          if (!open) setDeleteTargetId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare il target?</AlertDialogTitle>
            <AlertDialogDescription>
              Questa azione non puo essere annullata. Il target di emissioni
              verra eliminato permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isPending ? "Eliminazione..." : "Elimina"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
