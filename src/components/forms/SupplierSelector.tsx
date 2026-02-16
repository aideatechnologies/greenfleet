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

export type SupplierOptionItem = {
  id: string;
  name: string;
  vatNumber: string | null;
  supplierType: {
    code: string;
    label: string;
  };
};

type SupplierSelectorProps = {
  suppliers: SupplierOptionItem[];
  onSelect: (supplierId: string) => void;
  defaultSupplierId?: string;
  disabled?: boolean;
  placeholder?: string;
};

export function SupplierSelector({
  suppliers,
  onSelect,
  defaultSupplierId,
  disabled = false,
  placeholder = "Seleziona fornitore",
}: SupplierSelectorProps) {
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(defaultSupplierId ?? "");
  const [search, setSearch] = useState("");

  const selectedSupplier = suppliers.find((s) => s.id === selectedId);

  const filteredSuppliers = suppliers.filter((s) => {
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      s.name.toLowerCase().includes(term) ||
      (s.vatNumber?.toLowerCase().includes(term) ?? false)
    );
  });

  function handleSelect(supplierId: string) {
    setSelectedId(supplierId);
    onSelect(supplierId);
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
          {selectedSupplier ? (
            <span className="flex items-center gap-2 truncate">
              <span className="font-medium">{selectedSupplier.name}</span>
              {selectedSupplier.vatNumber && (
                <span className="text-muted-foreground text-xs">
                  ({selectedSupplier.vatNumber})
                </span>
              )}
            </span>
          ) : (
            placeholder
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
            placeholder="Cerca per nome, P.IVA..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>Nessun fornitore trovato</CommandEmpty>
            <CommandGroup>
              {filteredSuppliers.map((s) => (
                <CommandItem
                  key={s.id}
                  value={`${s.name} ${s.vatNumber ?? ""}`}
                  onSelect={() => handleSelect(s.id)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selectedId === s.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex flex-col">
                    <span className="font-medium">{s.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {s.supplierType.label}
                      {s.vatNumber && ` - P.IVA: ${s.vatNumber}`}
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
