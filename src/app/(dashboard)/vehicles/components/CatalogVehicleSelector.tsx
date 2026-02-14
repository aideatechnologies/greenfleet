"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Car, Search, X, Loader2, ChevronLeft } from "lucide-react";
import {
  searchCatalogModelsAction,
  getCatalogAllestimentiAction,
  getCatalogVariantsAction,
  type CatalogModelGroup,
} from "../actions/search-catalog";
import {
  formatEmissions,
  formatPower,
  formatConsumption,
} from "@/lib/utils/format";
import { SEARCH_DEBOUNCE_MS } from "@/lib/utils/constants";
import type { CatalogVehicleWithEngines } from "@/lib/services/catalog-service";

type CatalogVehicleSelectorProps = {
  onSelect: (vehicle: CatalogVehicleWithEngines) => void;
  selectedVehicle: CatalogVehicleWithEngines | null;
  onClear: () => void;
  fuelTypeLabels?: Record<string, string>;
};

type Step = "search" | "allestimento" | "variant";

export function CatalogVehicleSelector({
  onSelect,
  selectedVehicle,
  onClear,
  fuelTypeLabels = {},
}: CatalogVehicleSelectorProps) {
  // Search state
  const [query, setQuery] = useState("");
  const [modelResults, setModelResults] = useState<CatalogModelGroup[]>([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Selection flow state
  const [step, setStep] = useState<Step>("search");
  const [selectedModel, setSelectedModel] = useState<{
    marca: string;
    modello: string;
    imageUrl: string | null;
  } | null>(null);
  const [allestimenti, setAllestimenti] = useState<(string | null)[]>([]);
  const [selectedAllestimento, setSelectedAllestimento] = useState<
    string | null
  >(null);
  const [variants, setVariants] = useState<CatalogVehicleWithEngines[]>([]);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // --- Search ---

  const searchModels = useCallback(async (term: string) => {
    if (term.trim().length < 2) {
      setModelResults([]);
      setIsSearchOpen(false);
      return;
    }
    setIsLoading(true);
    try {
      const result = await searchCatalogModelsAction(term);
      if (result.success) {
        setModelResults(result.data);
        setIsSearchOpen(result.data.length > 0);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  function handleQueryChange(value: string) {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      searchModels(value);
    }, SEARCH_DEBOUNCE_MS);
  }

  // Close search dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // --- Step handlers ---

  async function handleModelSelect(model: CatalogModelGroup) {
    setSelectedModel(model);
    setIsSearchOpen(false);
    setQuery("");
    setModelResults([]);
    setIsLoading(true);

    const result = await getCatalogAllestimentiAction(model.marca, model.modello);
    if (!result.success) {
      setIsLoading(false);
      return;
    }

    const allest = result.data;
    setAllestimenti(allest);

    if (allest.length <= 1) {
      // Auto-select the only allestimento (or null)
      const selected = allest[0] ?? null;
      await handleAllestimentoSelect(model.marca, model.modello, selected);
    } else {
      setStep("allestimento");
      setIsLoading(false);
    }
  }

  async function handleAllestimentoSelect(
    marca: string,
    modello: string,
    allestimento: string | null
  ) {
    setSelectedAllestimento(allestimento);
    setIsLoading(true);

    const result = await getCatalogVariantsAction(marca, modello, allestimento);
    if (!result.success) {
      setIsLoading(false);
      return;
    }

    const vars = result.data;
    setVariants(vars);

    if (vars.length === 1) {
      // Auto-select the only variant
      onSelect(vars[0]);
      setIsLoading(false);
    } else {
      setStep("variant");
      setIsLoading(false);
    }
  }

  function handleReset() {
    setStep("search");
    setSelectedModel(null);
    setAllestimenti([]);
    setSelectedAllestimento(null);
    setVariants([]);
    setQuery("");
    setModelResults([]);
  }

  // --- Render: selected vehicle summary ---

  if (selectedVehicle) {
    const primaryEngine = selectedVehicle.engines[0];
    const fuelLabel = primaryEngine
      ? (fuelTypeLabels[primaryEngine.fuelType] ??
        primaryEngine.fuelType)
      : null;

    return (
      <Card>
        <CardContent className="flex items-start gap-4 pt-6">
          <div className="flex size-16 shrink-0 items-center justify-center rounded-lg bg-muted">
            {selectedVehicle.imageUrl ? (
              <img
                src={selectedVehicle.imageUrl}
                alt={`${selectedVehicle.marca} ${selectedVehicle.modello}`}
                className="size-16 rounded-lg object-cover"
              />
            ) : (
              <Car className="size-8 text-muted-foreground" />
            )}
          </div>
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold">
                {selectedVehicle.marca} {selectedVehicle.modello}
              </h3>
              {fuelLabel && <Badge variant="outline">{fuelLabel}</Badge>}
            </div>
            {selectedVehicle.allestimento && (
              <p className="text-sm text-muted-foreground">
                {selectedVehicle.allestimento}
              </p>
            )}
            {selectedVehicle.annoImmatricolazione && (
              <p className="text-sm text-muted-foreground">
                Anno: {selectedVehicle.annoImmatricolazione}
              </p>
            )}
            {primaryEngine && (
              <div className="flex flex-wrap gap-3 pt-1 text-sm text-muted-foreground">
                {primaryEngine.co2GKm != null && (
                  <span>CO2: {formatEmissions(primaryEngine.co2GKm)}</span>
                )}
                {primaryEngine.potenzaKw != null && (
                  <span>
                    Potenza: {formatPower(primaryEngine.potenzaKw)}
                  </span>
                )}
                {primaryEngine.consumptionL100Km != null && (
                  <span>
                    Consumo:{" "}
                    {formatConsumption(primaryEngine.consumptionL100Km)}
                  </span>
                )}
              </div>
            )}
          </div>
          <Button variant="ghost" size="icon" onClick={onClear}>
            <X className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    );
  }

  // --- Render: selection flow ---

  return (
    <div ref={containerRef} className="space-y-3">
      {/* Breadcrumb / back when past search step */}
      {selectedModel && (
        <div className="flex items-center gap-2 text-sm">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="h-7 px-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Indietro
          </Button>
          <div className="flex items-center gap-1.5">
            {selectedModel.imageUrl ? (
              <img
                src={selectedModel.imageUrl}
                alt=""
                className="size-5 rounded object-cover"
              />
            ) : (
              <Car className="size-4 text-muted-foreground" />
            )}
            <span className="font-medium">
              {selectedModel.marca} {selectedModel.modello}
            </span>
          </div>
          {step === "variant" && selectedAllestimento && (
            <>
              <span className="text-muted-foreground">/</span>
              <span className="text-muted-foreground">
                {selectedAllestimento}
              </span>
            </>
          )}
        </div>
      )}

      {/* Loading overlay */}
      {isLoading && step !== "search" && (
        <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Caricamento...
        </div>
      )}

      {/* Step 1: Search */}
      {step === "search" && (
        <div className="relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Cerca modello (es. Alfa Romeo Giulia)..."
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              onFocus={() => {
                if (modelResults.length > 0) setIsSearchOpen(true);
              }}
              className="pl-9"
            />
            {isLoading && (
              <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
            )}
          </div>

          {/* Search results dropdown */}
          {isSearchOpen && (
            <div className="absolute z-50 mt-1 max-h-80 w-full overflow-y-auto rounded-md border bg-popover shadow-md">
              {modelResults.map((model, idx) => (
                <div key={`${model.marca}|${model.modello}`}>
                  {idx > 0 && <Separator />}
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-accent"
                    onClick={() => handleModelSelect(model)}
                  >
                    <div className="flex size-10 shrink-0 items-center justify-center rounded bg-muted">
                      {model.imageUrl ? (
                        <img
                          src={model.imageUrl}
                          alt={`${model.marca} ${model.modello}`}
                          className="size-10 rounded object-cover"
                        />
                      ) : (
                        <Car className="size-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1">
                      <span className="font-medium">
                        {model.marca} {model.modello}
                      </span>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {model.count}{" "}
                      {model.count === 1 ? "variante" : "varianti"}
                    </Badge>
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* No results message */}
          {query.trim().length >= 2 &&
            !isLoading &&
            modelResults.length === 0 &&
            isSearchOpen && (
              <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover p-4 text-center text-sm text-muted-foreground shadow-md">
                Nessun modello trovato nel catalogo
              </div>
            )}
        </div>
      )}

      {/* Step 2: Allestimento */}
      {step === "allestimento" && !isLoading && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Seleziona allestimento</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {allestimenti.map((allest) => (
              <button
                key={allest ?? "__null__"}
                type="button"
                className="rounded-lg border px-4 py-3 text-left text-sm transition-colors hover:bg-accent"
                onClick={() =>
                  selectedModel &&
                  handleAllestimentoSelect(
                    selectedModel.marca,
                    selectedModel.modello,
                    allest
                  )
                }
              >
                {allest ?? "Standard"}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 3: Variant (anno) */}
      {step === "variant" && !isLoading && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Seleziona anno</p>
          <div className="grid gap-2 sm:grid-cols-3">
            {variants.map((variant) => {
              const primaryEngine = variant.engines[0];
              const fuelLabel = primaryEngine
                ? (fuelTypeLabels[primaryEngine.fuelType] ??
                  primaryEngine.fuelType)
                : null;

              return (
                <button
                  key={variant.id}
                  type="button"
                  className="space-y-1 rounded-lg border px-4 py-3 text-left text-sm transition-colors hover:bg-accent"
                  onClick={() => onSelect(variant)}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">
                      {variant.annoImmatricolazione ?? "N/D"}
                    </span>
                    {fuelLabel && (
                      <Badge variant="outline" className="text-xs">
                        {fuelLabel}
                      </Badge>
                    )}
                  </div>
                  {primaryEngine?.co2GKm != null && (
                    <p className="text-xs text-muted-foreground">
                      CO2: {formatEmissions(primaryEngine.co2GKm)}
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
