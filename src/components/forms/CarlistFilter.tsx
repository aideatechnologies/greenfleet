"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CarlistOption } from "@/lib/services/carlist-service";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type CarlistFilterProps = {
  options: CarlistOption[];
  value?: string;
  onValueChange: (value: string | undefined) => void;
  placeholder?: string;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Shared combobox component to filter by carlist.
 * Receives pre-loaded carlist options from the server.
 */
export function CarlistFilter({
  options,
  value,
  onValueChange,
  placeholder = "Tutte le carlist",
}: CarlistFilterProps) {
  return (
    <Select
      value={value ?? "all"}
      onValueChange={(val) => onValueChange(val === "all" ? undefined : val)}
    >
      <SelectTrigger className="w-[200px]">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{placeholder}</SelectItem>
        {options.map((option) => (
          <SelectItem key={option.id} value={option.id}>
            {option.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
