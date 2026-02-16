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

export type EmployeeOptionItem = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  employeeCode: string | null;
};

type EmployeeSelectorProps = {
  employees: EmployeeOptionItem[];
  onSelect: (employeeId: string) => void;
  defaultEmployeeId?: string;
  disabled?: boolean;
};

export function EmployeeSelector({
  employees,
  onSelect,
  defaultEmployeeId,
  disabled = false,
}: EmployeeSelectorProps) {
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(defaultEmployeeId ?? "");
  const [search, setSearch] = useState("");

  const selectedEmployee = employees.find((e) => e.id === selectedId);

  const filteredEmployees = employees.filter((e) => {
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      e.firstName.toLowerCase().includes(term) ||
      e.lastName.toLowerCase().includes(term) ||
      (e.email?.toLowerCase().includes(term) ?? false) ||
      (e.employeeCode?.toLowerCase().includes(term) ?? false)
    );
  });

  function handleSelect(employeeId: string) {
    setSelectedId(employeeId);
    onSelect(employeeId);
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
          {selectedEmployee ? (
            <span className="flex items-center gap-2 truncate">
              <span className="font-medium">
                {selectedEmployee.firstName} {selectedEmployee.lastName}
              </span>
              {selectedEmployee.employeeCode && (
                <span className="text-muted-foreground text-xs">
                  ({selectedEmployee.employeeCode})
                </span>
              )}
            </span>
          ) : (
            "Seleziona dipendente"
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
            placeholder="Cerca per nome, codice..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>Nessun dipendente trovato</CommandEmpty>
            <CommandGroup>
              {filteredEmployees.map((e) => (
                <CommandItem
                  key={e.id}
                  value={`${e.firstName} ${e.lastName} ${e.employeeCode ?? ""}`}
                  onSelect={() => handleSelect(e.id)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selectedId === e.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex flex-col">
                    <span className="font-medium">
                      {e.firstName} {e.lastName}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {e.employeeCode && `${e.employeeCode} - `}
                      {e.email ?? ""}
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
