"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Search, Car, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  getAvailableCatalogVehiclesAction,
  type AvailableCatalogVehicle,
} from "../../actions/get-available-vehicles";
import { addCatalogVehiclesToCarlistAction } from "../../actions/manage-vehicles";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type AddVehicleDialogProps = {
  carlistId: number;
  existingCatalogVehicleIds: number[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AddVehicleDialog({
  carlistId,
  existingCatalogVehicleIds,
  open,
  onOpenChange,
}: AddVehicleDialogProps) {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<AvailableCatalogVehicle[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [isSubmitting, startSubmitTransition] = useTransition();

  // Load vehicles when dialog opens
  const loadVehicles = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getAvailableCatalogVehiclesAction(
        existingCatalogVehicleIds
      );
      if (result.success) {
        setVehicles(result.data);
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error("Errore nel caricamento dei veicoli catalogo");
    } finally {
      setLoading(false);
    }
  }, [existingCatalogVehicleIds]);

  useEffect(() => {
    if (open) {
      setSelectedIds(new Set());
      setSearchValue("");
      loadVehicles();
    }
  }, [open, loadVehicles]);

  // Filter vehicles by search
  const filteredVehicles = vehicles.filter((v) => {
    if (!searchValue.trim()) return true;
    const term = searchValue.trim().toLowerCase();
    return (
      v.marca.toLowerCase().includes(term) ||
      v.modello.toLowerCase().includes(term) ||
      (v.allestimento?.toLowerCase().includes(term) ?? false)
    );
  });

  function toggleVehicle(vehicleId: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(vehicleId)) {
        next.delete(vehicleId);
      } else {
        next.add(vehicleId);
      }
      return next;
    });
  }

  function toggleAll() {
    if (selectedIds.size === filteredVehicles.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredVehicles.map((v) => v.id)));
    }
  }

  function handleSubmit() {
    if (selectedIds.size === 0) return;
    startSubmitTransition(async () => {
      try {
        const result = await addCatalogVehiclesToCarlistAction({
          carlistId,
          catalogVehicleIds: Array.from(selectedIds),
        });
        if (result.success) {
          const count = result.data.added;
          toast.success(
            count === 1
              ? "1 veicolo aggiunto alla carlist"
              : `${count} veicoli aggiunti alla carlist`
          );
          onOpenChange(false);
          router.refresh();
        } else {
          toast.error(result.error);
        }
      } catch {
        toast.error("Errore nell'aggiunta dei veicoli");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Aggiungi veicoli catalogo</DialogTitle>
          <DialogDescription>
            Seleziona i veicoli catalogo da aggiungere a questa carlist.
          </DialogDescription>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Cerca per marca, modello, allestimento..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Vehicle list */}
        <div className="h-[320px] overflow-y-auto rounded-md border">
          {loading ? (
            <div className="flex items-center justify-center h-full py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredVehicles.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
              <Car className="h-8 w-8" />
              <p className="text-sm">
                {vehicles.length === 0
                  ? "Nessun veicolo catalogo disponibile"
                  : "Nessun risultato per la ricerca"}
              </p>
            </div>
          ) : (
            <div className="p-2">
              {/* Select all */}
              <div
                className="flex items-center gap-3 rounded-md px-3 py-2 hover:bg-muted/50 cursor-pointer border-b mb-1"
                onClick={toggleAll}
              >
                <Checkbox
                  checked={
                    filteredVehicles.length > 0 &&
                    selectedIds.size === filteredVehicles.length
                  }
                  onCheckedChange={() => toggleAll()}
                />
                <span className="text-sm font-medium">
                  Seleziona tutti ({filteredVehicles.length})
                </span>
              </div>

              {filteredVehicles.map((vehicle) => (
                <div
                  key={vehicle.id}
                  className="flex items-center gap-3 rounded-md px-3 py-2 hover:bg-muted/50 cursor-pointer"
                  onClick={() => toggleVehicle(vehicle.id)}
                >
                  <Checkbox
                    checked={selectedIds.has(vehicle.id)}
                    onCheckedChange={() => toggleVehicle(vehicle.id)}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {vehicle.marca} {vehicle.modello}
                      </span>
                      {vehicle.engine && (
                        <Badge variant="outline" className="text-xs">
                          {vehicle.engine.fuelType}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {vehicle.allestimento ?? ""}
                      {vehicle.engine?.potenzaKw
                        ? `${vehicle.allestimento ? " · " : ""}${vehicle.engine.potenzaKw} kW`
                        : ""}
                      {vehicle.engine?.cilindrata
                        ? ` · ${vehicle.engine.cilindrata} cc`
                        : ""}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Annulla
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={selectedIds.size === 0 || isSubmitting}
          >
            {isSubmitting
              ? "Aggiunta..."
              : `Aggiungi ${selectedIds.size > 0 ? `(${selectedIds.size})` : ""}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
