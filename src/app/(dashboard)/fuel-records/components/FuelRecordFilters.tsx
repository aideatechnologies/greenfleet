"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

type FuelRecordFiltersProps = {
  fuelTypeOptions?: Array<{ value: string; label: string }>;
};

export function FuelRecordFilters({ fuelTypeOptions = [] }: FuelRecordFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentFuelType = searchParams.get("fuelType") ?? "";

  const updateFilter = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      // Reset to page 1 when filters change
      params.delete("page");
      router.push(`/fuel-records?${params.toString()}`);
    },
    [router, searchParams]
  );

  const hasFilters = currentFuelType !== "";

  function clearFilters() {
    router.push("/fuel-records");
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select
        value={currentFuelType}
        onValueChange={(value) =>
          updateFilter("fuelType", value === "ALL" ? null : value)
        }
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Tipo carburante" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">Tutti i tipi</SelectItem>
          {fuelTypeOptions.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters}>
          <X className="mr-1 h-4 w-4" />
          Cancella filtri
        </Button>
      )}
    </div>
  );
}
