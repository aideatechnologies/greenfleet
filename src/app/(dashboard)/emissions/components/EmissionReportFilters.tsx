"use client";

import { useState, useTransition, useRef } from "react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { CalendarIcon, ChevronDown, ChevronUp, Loader2, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { MultiSelectCombobox } from "@/components/forms/MultiSelectCombobox";
import type {
  AggregationLevel,
  PeriodGranularity,
  ReportResult,
  VehicleFilters,
  FilterOptions,
  ReportFilterPreset,
} from "@/types/report";
import { generateReportAction } from "../actions/generate-report";
import { savePresetAction, deletePresetAction } from "../actions/preset-actions";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type CarlistOption = {
  id: number;
  name: string;
};

interface EmissionReportFiltersProps {
  carlists: CarlistOption[];
  onReportGenerated: (result: ReportResult) => void;
  defaultStartDate: Date;
  defaultEndDate: Date;
  filterOptions: FilterOptions;
  presets: ReportFilterPreset[];
  onPresetSaved?: (preset: ReportFilterPreset) => void;
  onPresetDeleted?: (presetId: number) => void;
  resultsRef?: React.RefObject<HTMLDivElement | null>;
}

// ---------------------------------------------------------------------------
// Aggregation level labels
// ---------------------------------------------------------------------------

const AGGREGATION_LABELS: Record<AggregationLevel, string> = {
  FLEET: "Totale Parco",
  VEHICLE: "Per Veicolo",
  CARLIST: "Per Carlist",
  FUEL_TYPE: "Per Carburante",
  PERIOD: "Per Periodo",
};

const GRANULARITY_LABELS: Record<PeriodGranularity, string> = {
  MONTHLY: "Mensile",
  QUARTERLY: "Trimestrale",
  YEARLY: "Annuale",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function EmissionReportFilters({
  carlists,
  onReportGenerated,
  defaultStartDate,
  defaultEndDate,
  filterOptions,
  presets,
  onPresetSaved,
  onPresetDeleted,
  resultsRef,
}: EmissionReportFiltersProps) {
  const [startDate, setStartDate] = useState<Date | undefined>(defaultStartDate);
  const [endDate, setEndDate] = useState<Date | undefined>(defaultEndDate);
  const [aggregationLevel, setAggregationLevel] =
    useState<AggregationLevel>("VEHICLE");
  const [periodGranularity, setPeriodGranularity] =
    useState<PeriodGranularity>("MONTHLY");
  const [carlistId, setCarlistId] = useState<number | undefined>(undefined);

  // Advanced filters
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [vehicleFilters, setVehicleFilters] = useState<VehicleFilters>({});

  // Preset
  const [selectedPresetId, setSelectedPresetId] = useState<string>("__none__");
  const [presetName, setPresetName] = useState("");
  const [presetDialogOpen, setPresetDialogOpen] = useState(false);

  // Report generation
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const updateFilter = (key: keyof VehicleFilters, value: unknown) => {
    setVehicleFilters((prev) => {
      const next = { ...prev };
      if (Array.isArray(value) && value.length === 0) {
        delete next[key];
        return next;
      }
      if (value === undefined || value === "" || value === null) {
        delete next[key];
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (next as any)[key] = value;
      }
      return next;
    });
  };

  const hasActiveFilters = Object.keys(vehicleFilters).length > 0;

  const applyPreset = (presetId: string) => {
    setSelectedPresetId(presetId);
    if (presetId === "__none__") return;
    const preset = presets.find((p) => String(p.id) === presetId);
    if (!preset) return;
    const { carlistId: pCarlist, aggregationLevel: pAgg, periodGranularity: pGran, ...vf } = preset.filters;
    setVehicleFilters(vf);
    if (pCarlist != null) setCarlistId(pCarlist);
    if (pAgg) setAggregationLevel(pAgg);
    if (pGran) setPeriodGranularity(pGran);
    setShowAdvanced(Object.keys(vf).length > 0);
  };

  const handleSavePreset = async () => {
    if (!presetName.trim()) return;
    const filters = {
      ...vehicleFilters,
      carlistId,
      aggregationLevel,
      periodGranularity,
    };
    const result = await savePresetAction(presetName.trim(), filters);
    if (result.success) {
      onPresetSaved?.(result.data);
      setPresetName("");
      setPresetDialogOpen(false);
    }
  };

  const handleDeletePreset = async () => {
    if (selectedPresetId === "__none__") return;
    const numericId = Number(selectedPresetId);
    const result = await deletePresetAction(numericId);
    if (result.success) {
      onPresetDeleted?.(numericId);
      setSelectedPresetId("__none__");
    }
  };

  const handleGenerateReport = () => {
    if (!startDate || !endDate) return;

    setError(null);
    startTransition(async () => {
      const cleanFilters = hasActiveFilters ? vehicleFilters : undefined;

      const result = await generateReportAction({
        dateRange: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
        aggregationLevel,
        periodGranularity,
        carlistId,
        vehicleFilters: cleanFilters,
      });

      if (result.success) {
        onReportGenerated(result.data);
        // Scroll to results
        setTimeout(() => {
          resultsRef?.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 100);
      } else {
        setError(result.error);
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Filtri Report</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Date Range: Start */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Data Inizio</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !startDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 size-4" />
                  {startDate
                    ? format(startDate, "dd/MM/yyyy", { locale: it })
                    : "Seleziona data"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={setStartDate}
                  locale={it}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Date Range: End */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Data Fine</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !endDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 size-4" />
                  {endDate
                    ? format(endDate, "dd/MM/yyyy", { locale: it })
                    : "Seleziona data"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={endDate}
                  onSelect={setEndDate}
                  locale={it}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Aggregation Level */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Aggregazione</label>
            <Select
              value={aggregationLevel}
              onValueChange={(v) =>
                setAggregationLevel(v as AggregationLevel)
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Seleziona aggregazione" />
              </SelectTrigger>
              <SelectContent>
                {(
                  Object.entries(AGGREGATION_LABELS) as [
                    AggregationLevel,
                    string,
                  ][]
                ).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Period Granularity */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Granularita</label>
            <Select
              value={periodGranularity}
              onValueChange={(v) =>
                setPeriodGranularity(v as PeriodGranularity)
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Seleziona granularita" />
              </SelectTrigger>
              <SelectContent>
                {(
                  Object.entries(GRANULARITY_LABELS) as [
                    PeriodGranularity,
                    string,
                  ][]
                ).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Carlist filter */}
        {carlists.length > 0 && (
          <div className="mt-4">
            <div className="space-y-2 sm:w-48">
              <label className="text-sm font-medium">Carlist</label>
              <Select
                value={carlistId != null ? String(carlistId) : "__all__"}
                onValueChange={(v) =>
                  setCarlistId(v === "__all__" ? undefined : Number(v))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Tutte le carlist" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Tutte le carlist</SelectItem>
                  {carlists.map((cl) => (
                    <SelectItem key={cl.id} value={String(cl.id)}>
                      {cl.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Preset section */}
        <div className="mt-4 rounded-md border bg-muted/30 p-3">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Preset Filtri
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="sm:w-56">
              <Select value={selectedPresetId} onValueChange={applyPreset}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleziona preset" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Nessun preset</SelectItem>
                  {presets.length === 0 ? (
                    <SelectItem value="__empty__" disabled>
                      Nessun preset salvato
                    </SelectItem>
                  ) : (
                    presets.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>
                        {p.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              {/* Save preset */}
              <Dialog open={presetDialogOpen} onOpenChange={setPresetDialogOpen}>
                <DialogTrigger asChild>
                  <Button type="button" variant="outline" size="sm">
                    <Save className="mr-1 size-3.5" />
                    Salva Preset
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Salva Preset Filtri</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-2 py-4">
                    <label className="text-sm font-medium">Nome preset</label>
                    <Input
                      value={presetName}
                      onChange={(e) => setPresetName(e.target.value)}
                      placeholder="Es. Flotta Diesel 2025"
                    />
                  </div>
                  <DialogFooter>
                    <Button type="button" onClick={handleSavePreset} disabled={!presetName.trim()}>
                      Salva
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* Delete preset */}
              {selectedPresetId !== "__none__" && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleDeletePreset}
                >
                  <Trash2 className="mr-1 size-3.5" />
                  Elimina
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Advanced filters toggle */}
        <div className="mt-4">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-muted-foreground"
          >
            {showAdvanced ? (
              <ChevronUp className="mr-1 size-4" />
            ) : (
              <ChevronDown className="mr-1 size-4" />
            )}
            Filtri Avanzati Veicolo
            {hasActiveFilters && (
              <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                {Object.keys(vehicleFilters).length} attivi
              </span>
            )}
          </Button>
        </div>

        {/* Advanced filters panel */}
        {showAdvanced && (
          <div className="mt-3 space-y-4 rounded-md border p-4">
            {/* Targhe filter — full width */}
            <div className="space-y-1">
              <label className="text-xs font-medium">Targhe</label>
              <MultiSelectCombobox
                options={filterOptions.targhe}
                selected={vehicleFilters.licensePlates ?? []}
                onChange={(v) => updateFilter("licensePlates", v)}
                placeholder="Tutte le targhe"
                searchPlaceholder="Cerca targa..."
              />
            </div>

            {/* Row 1: Selects */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <div className="space-y-1">
                <label className="text-xs font-medium">Marca</label>
                <MultiSelectCombobox
                  options={filterOptions.marche}
                  selected={vehicleFilters.marca ?? []}
                  onChange={(v) => updateFilter("marca", v)}
                  placeholder="Tutte le marche"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium">Carrozzeria</label>
                <MultiSelectCombobox
                  options={filterOptions.carrozzerie}
                  selected={vehicleFilters.carrozzeria ?? []}
                  onChange={(v) => updateFilter("carrozzeria", v)}
                  placeholder="Tutte"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium">Carburante</label>
                <MultiSelectCombobox
                  options={filterOptions.carburanti}
                  selected={vehicleFilters.fuelType ?? []}
                  onChange={(v) => updateFilter("fuelType", v)}
                  placeholder="Tutti"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium">Modello</label>
                <Input
                  value={vehicleFilters.modello ?? ""}
                  onChange={(e) =>
                    updateFilter("modello", e.target.value || undefined)
                  }
                  placeholder="Es. 500"
                />
              </div>

              <div className="flex items-end space-x-2 pb-1">
                <Checkbox
                  id="isHybrid"
                  checked={vehicleFilters.isHybrid ?? false}
                  onCheckedChange={(checked) =>
                    updateFilter("isHybrid", checked === true ? true : undefined)
                  }
                />
                <label htmlFor="isHybrid" className="text-xs font-medium">
                  Solo ibridi
                </label>
              </div>
            </div>

            {/* Row 2: Range filters */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <RangeFilter
                label="Cilindrata (cc)"
                minValue={vehicleFilters.cilindrataMin}
                maxValue={vehicleFilters.cilindrataMax}
                onMinChange={(v) => updateFilter("cilindrataMin", v)}
                onMaxChange={(v) => updateFilter("cilindrataMax", v)}
              />
              <RangeFilter
                label="Potenza (kW)"
                minValue={vehicleFilters.potenzaKwMin}
                maxValue={vehicleFilters.potenzaKwMax}
                onMinChange={(v) => updateFilter("potenzaKwMin", v)}
                onMaxChange={(v) => updateFilter("potenzaKwMax", v)}
              />
              <RangeFilter
                label="Potenza (CV)"
                minValue={vehicleFilters.potenzaCvMin}
                maxValue={vehicleFilters.potenzaCvMax}
                onMinChange={(v) => updateFilter("potenzaCvMin", v)}
                onMaxChange={(v) => updateFilter("potenzaCvMax", v)}
              />
              <RangeFilter
                label="CO2 g/km"
                minValue={vehicleFilters.co2GKmMin}
                maxValue={vehicleFilters.co2GKmMax}
                onMinChange={(v) => updateFilter("co2GKmMin", v)}
                onMaxChange={(v) => updateFilter("co2GKmMax", v)}
              />
              <RangeFilter
                label="Prezzo listino"
                minValue={vehicleFilters.prezzoListinoMin}
                maxValue={vehicleFilters.prezzoListinoMax}
                onMinChange={(v) => updateFilter("prezzoListinoMin", v)}
                onMaxChange={(v) => updateFilter("prezzoListinoMax", v)}
              />
            </div>

            {hasActiveFilters && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setVehicleFilters({})}
              >
                Resetta filtri avanzati
              </Button>
            )}
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="mt-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Submit */}
        <div className="mt-4 flex justify-end">
          <Button
            type="button"
            onClick={handleGenerateReport}
            disabled={isPending || !startDate || !endDate}
          >
            {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
            Genera Report
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Range filter helper component
// ---------------------------------------------------------------------------

function RangeFilter({
  label,
  minValue,
  maxValue,
  onMinChange,
  onMaxChange,
}: {
  label: string;
  minValue?: number;
  maxValue?: number;
  onMinChange: (v: number | undefined) => void;
  onMaxChange: (v: number | undefined) => void;
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium">{label}</label>
      <div className="flex gap-1">
        <Input
          type="number"
          placeholder="Min"
          value={minValue ?? ""}
          onChange={(e) => {
            const v = e.target.value;
            onMinChange(v ? Number(v) : undefined);
          }}
          className="h-8 text-xs"
        />
        <Input
          type="number"
          placeholder="Max"
          value={maxValue ?? ""}
          onChange={(e) => {
            const v = e.target.value;
            onMaxChange(v ? Number(v) : undefined);
          }}
          className="h-8 text-xs"
        />
      </div>
    </div>
  );
}
