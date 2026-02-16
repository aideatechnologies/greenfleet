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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { MoreHorizontal, Trash2, Pencil, Info } from "lucide-react";
import { toast } from "sonner";
import { deleteEmissionFactorAction } from "../actions/delete-emission-factor";
import { EmissionFactorForm } from "./EmissionFactorForm";
import { SCOPE_LABELS, type EmissionScope } from "@/types/emission";
import { formatNumber } from "@/lib/utils/format";

type MacroFuelTypeRef = {
  id: number;
  name: string;
  scope: number;
  unit: string;
};

type EmissionFactorRow = {
  id: number;
  macroFuelTypeId: number | null;
  macroFuelType?: MacroFuelTypeRef | null;
  fuelType?: string | null;
  co2: number;
  ch4: number;
  n2o: number;
  hfc: number;
  pfc: number;
  sf6: number;
  nf3: number;
  source: string;
  effectiveDate: Date;
  createdAt: Date;
};

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

type FuelTypeOption = {
  value: string;
  label: string;
};

export function EmissionFactorTable({
  factors,
  macroFuelTypes,
  fuelTypeOptions = [],
  canEdit,
}: {
  factors: EmissionFactorRow[];
  macroFuelTypes: MacroFuelTypeRef[];
  fuelTypeOptions?: FuelTypeOption[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    id: number;
    label: string;
  }>({ open: false, id: 0, label: "" });
  const [isLoading, setIsLoading] = useState(false);

  async function handleDelete() {
    setIsLoading(true);
    try {
      const result = await deleteEmissionFactorAction(deleteDialog.id);
      if (result.success) {
        toast.success("Fattore di emissione eliminato");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error("Errore nell'eliminazione");
    } finally {
      setIsLoading(false);
      setDeleteDialog({ open: false, id: 0, label: "" });
    }
  }

  return (
    <>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Macro Tipo</TableHead>
              <TableHead>Scope</TableHead>
              <TableHead>Tipo Carburante</TableHead>
              <TableHead className="text-right">CO2</TableHead>
              <TableHead className="text-right">CH4</TableHead>
              <TableHead className="text-right">N2O</TableHead>
              <TableHead className="text-right">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger className="flex items-center gap-1">
                      Altri gas
                      <Info className="h-3 w-3" />
                    </TooltipTrigger>
                    <TooltipContent>
                      HFC, PFC, SF6, NF3
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </TableHead>
              <TableHead>Fonte</TableHead>
              <TableHead>Data Efficacia</TableHead>
              {canEdit && <TableHead className="w-[50px]" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {factors.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={canEdit ? 10 : 9}
                  className="text-center text-muted-foreground"
                >
                  Nessun fattore di emissione presente
                </TableCell>
              </TableRow>
            )}
            {factors.map((factor) => {
              const secondaryGasSum =
                factor.hfc + factor.pfc + factor.sf6 + factor.nf3;

              return (
                <TableRow key={factor.id}>
                  <TableCell className="font-medium">
                    {factor.macroFuelType?.name ?? "N/A"}
                  </TableCell>
                  <TableCell>
                    {factor.macroFuelType ? (
                      <Badge
                        variant={
                          factor.macroFuelType.scope === 1
                            ? "default"
                            : "secondary"
                        }
                        className={
                          factor.macroFuelType.scope === 1
                            ? "bg-green-100 text-green-800 hover:bg-green-100"
                            : "bg-blue-100 text-blue-800 hover:bg-blue-100"
                        }
                      >
                        {SCOPE_LABELS[
                          factor.macroFuelType.scope as EmissionScope
                        ] ?? `Scope ${factor.macroFuelType.scope}`}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {factor.fuelType ? (
                      <Badge variant="outline">
                        {fuelTypeOptions.find(
                          (o) => o.value === factor.fuelType
                        )?.label ?? factor.fuelType}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">
                        Tutti
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatNumber(factor.co2, 6)}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatNumber(factor.ch4, 6)}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatNumber(factor.n2o, 6)}
                  </TableCell>
                  <TableCell className="text-right">
                    {secondaryGasSum > 0 ? (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger className="font-mono">
                            {formatNumber(secondaryGasSum, 6)}
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="space-y-1 text-xs">
                              <div>HFC: {formatNumber(factor.hfc, 6)}</div>
                              <div>PFC: {formatNumber(factor.pfc, 6)}</div>
                              <div>SF6: {formatNumber(factor.sf6, 6)}</div>
                              <div>NF3: {formatNumber(factor.nf3, 6)}</div>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : (
                      <span className="font-mono text-muted-foreground">0</span>
                    )}
                  </TableCell>
                  <TableCell>{factor.source}</TableCell>
                  <TableCell>{formatDate(factor.effectiveDate)}</TableCell>
                  {canEdit && (
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <EmissionFactorForm
                            mode="edit"
                            factorId={factor.id}
                            macroFuelTypes={macroFuelTypes}
                            fuelTypeOptions={fuelTypeOptions}
                            defaultValues={{
                              macroFuelTypeId:
                                factor.macroFuelTypeId ?? 0,
                              fuelType: factor.fuelType ?? "",
                              co2: factor.co2,
                              ch4: factor.ch4,
                              n2o: factor.n2o,
                              hfc: factor.hfc,
                              pfc: factor.pfc,
                              sf6: factor.sf6,
                              nf3: factor.nf3,
                              source: factor.source,
                              effectiveDate: new Date(factor.effectiveDate),
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
                                id: factor.id,
                                label:
                                  factor.macroFuelType?.name ?? "N/A",
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
              );
            })}
          </TableBody>
        </Table>
      </div>

      <AlertDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Elimina fattore di emissione</AlertDialogTitle>
            <AlertDialogDescription>
              Stai per eliminare il fattore di emissione per &quot;
              {deleteDialog.label}&quot;. Questa azione non puo essere
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
