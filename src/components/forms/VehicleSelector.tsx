"use client";

import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type VehicleOptionItem = {
  id: string;
  licensePlate: string;
  catalogVehicle: {
    marca: string;
    modello: string;
    allestimento: string | null;
  };
};

type VehicleSelectorProps = {
  vehicles: VehicleOptionItem[];
  onSelect: (vehicleId: string) => void;
  defaultVehicleId?: string;
  disabled?: boolean;
};

export function VehicleSelector({
  vehicles,
  onSelect,
  defaultVehicleId,
  disabled = false,
}: VehicleSelectorProps) {
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(defaultVehicleId ?? "");
  const [search, setSearch] = useState("");

  const selectedVehicle = vehicles.find((v) => v.id === selectedId);

  const filteredVehicles = vehicles.filter((v) => {
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      v.licensePlate.toLowerCase().includes(term) ||
      v.catalogVehicle.marca.toLowerCase().includes(term) ||
      v.catalogVehicle.modello.toLowerCase().includes(term)
    );
  });

  function handleSelect(vehicleId: string) {
    setSelectedId(vehicleId);
    onSelect(vehicleId);
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between font-normal",
            !selectedId && "text-muted-foreground"
          )}
        >
          {selectedVehicle ? (
            <span className="flex items-center gap-2 truncate">
              <span className="font-mono font-medium uppercase">
                {selectedVehicle.licensePlate}
              </span>
              <span className="text-muted-foreground">
                {selectedVehicle.catalogVehicle.marca}{" "}
                {selectedVehicle.catalogVehicle.modello}
              </span>
            </span>
          ) : (
            "Seleziona veicolo"
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[--radix-popover-trigger-width] p-0"
        align="start"
      >
        <Command>
          <CommandInput
            placeholder="Cerca per targa, marca, modello..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>Nessun veicolo trovato</CommandEmpty>
            <CommandGroup>
              {filteredVehicles.map((v) => (
                <CommandItem
                  key={v.id}
                  value={`${v.licensePlate} ${v.catalogVehicle.marca} ${v.catalogVehicle.modello}`}
                  onSelect={() => handleSelect(v.id)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selectedId === v.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex flex-col">
                    <span className="font-mono font-medium uppercase">
                      {v.licensePlate}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {v.catalogVehicle.marca} {v.catalogVehicle.modello}
                      {v.catalogVehicle.allestimento &&
                        ` - ${v.catalogVehicle.allestimento}`}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
