"use client";

import { useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import type { CatalogFilterOptions } from "@/lib/services/catalog-service";

type CatalogFiltersProps = {
  filterOptions: CatalogFilterOptions;
  currentMarca?: string;
  currentCarburante?: string;
  currentNormativa?: string;
  fuelTypeLabels?: Record<string, string>;
};

// Valore sentinel per "tutti" — shadcn Select non supporta value=""
const ALL_VALUE = "__ALL__";

export function CatalogFilters({
  filterOptions,
  currentMarca,
  currentCarburante,
  currentNormativa,
  fuelTypeLabels = {},
}: CatalogFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const updateFilter = useCallback(
    (key: string, value: string | undefined) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === undefined || value === ALL_VALUE) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
      params.set("page", "1");
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams]
  );

  const clearFilter = useCallback(
    (key: string) => {
      updateFilter(key, undefined);
    },
    [updateFilter]
  );

  const clearAllFilters = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("marca");
    params.delete("carburante");
    params.delete("normativa");
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`);
  }, [router, pathname, searchParams]);

  const hasActiveFilters = !!(currentMarca || currentCarburante || currentNormativa);

  // Chip attivi
  const activeChips: { label: string; key: string }[] = [];
  if (currentMarca) {
    activeChips.push({ label: `Marca: ${currentMarca}`, key: "marca" });
  }
  if (currentCarburante) {
    const label =
      fuelTypeLabels[currentCarburante] ?? currentCarburante;
    activeChips.push({ label: `Carburante: ${label}`, key: "carburante" });
  }
  if (currentNormativa) {
    activeChips.push({
      label: `Normativa: ${currentNormativa}`,
      key: "normativa",
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Selettori filtri */}
      <div className="flex flex-wrap gap-2">
        {/* Filtro Marca */}
        <Select
          value={currentMarca ?? ALL_VALUE}
          onValueChange={(val) => updateFilter("marca", val)}
        >
          <SelectTrigger className="w-[160px]" size="sm">
            <SelectValue placeholder="Tutte le marche" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>Tutte le marche</SelectItem>
            {filterOptions.marche.map((marca) => (
              <SelectItem key={marca} value={marca}>
                {marca}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Filtro Carburante */}
        <Select
          value={currentCarburante ?? ALL_VALUE}
          onValueChange={(val) => updateFilter("carburante", val)}
        >
          <SelectTrigger className="w-[180px]" size="sm">
            <SelectValue placeholder="Tutti i carburanti" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>Tutti i carburanti</SelectItem>
            {filterOptions.carburanti.map((fuel) => (
              <SelectItem key={fuel} value={fuel}>
                {fuelTypeLabels[fuel] ?? fuel}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Filtro Normativa */}
        <Select
          value={currentNormativa ?? ALL_VALUE}
          onValueChange={(val) => updateFilter("normativa", val)}
        >
          <SelectTrigger className="w-[160px]" size="sm">
            <SelectValue placeholder="Tutte le normative" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>Tutte le normative</SelectItem>
            {filterOptions.normative.map((norm) => (
              <SelectItem key={norm} value={norm}>
                {norm}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Chip filtri attivi */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2">
          {activeChips.map((chip) => (
            <span
              key={chip.key}
              className="inline-flex items-center gap-1 rounded-full border bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground"
            >
              {chip.label}
              <button
                type="button"
                onClick={() => clearFilter(chip.key)}
                className="ml-0.5 rounded-full p-0.5 hover:bg-secondary-foreground/10 transition-colors"
                aria-label={`Rimuovi filtro ${chip.label}`}
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
          <Button
            variant="ghost"
            size="xs"
            onClick={clearAllFilters}
            className="text-muted-foreground"
          >
            Rimuovi tutti
          </Button>
        </div>
      )}
    </div>
  );
}
