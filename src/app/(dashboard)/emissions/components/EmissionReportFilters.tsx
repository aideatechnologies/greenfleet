"use client";

import { useState, useActionState } from "react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { CalendarIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
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
import { cn } from "@/lib/utils";
import type {
  AggregationLevel,
  PeriodGranularity,
  ReportResult,
} from "@/types/report";
import type { ActionResult } from "@/types/action-result";
import { generateReportAction } from "../actions/generate-report";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type CarlistOption = {
  id: string;
  name: string;
};

interface EmissionReportFiltersProps {
  carlists: CarlistOption[];
  onReportGenerated: (result: ReportResult) => void;
  defaultStartDate: Date;
  defaultEndDate: Date;
}

// ---------------------------------------------------------------------------
// Aggregation level labels
// ---------------------------------------------------------------------------

const AGGREGATION_LABELS: Record<AggregationLevel, string> = {
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
}: EmissionReportFiltersProps) {
  const [startDate, setStartDate] = useState<Date | undefined>(defaultStartDate);
  const [endDate, setEndDate] = useState<Date | undefined>(defaultEndDate);
  const [aggregationLevel, setAggregationLevel] =
    useState<AggregationLevel>("VEHICLE");
  const [periodGranularity, setPeriodGranularity] =
    useState<PeriodGranularity>("MONTHLY");
  const [carlistId, setCarlistId] = useState<string | undefined>(undefined);

  const [_state, formAction, isPending] = useActionState<
    ActionResult<ReportResult> | null,
    FormData
  >(async (_prev: ActionResult<ReportResult> | null, _formData: FormData) => {
    if (!startDate || !endDate) return null;

    const result = await generateReportAction({
      dateRange: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      aggregationLevel,
      periodGranularity,
      carlistId: carlistId === "__all__" ? undefined : carlistId,
    });

    if (result.success) {
      onReportGenerated(result.data);
    }

    return result;
  }, null);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Filtri Report</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction}>
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

          {/* Carlist filter (second row) + submit */}
          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end">
            {carlists.length > 0 && (
              <div className="space-y-2 sm:w-64">
                <label className="text-sm font-medium">
                  Carlist (opzionale)
                </label>
                <Select
                  value={carlistId ?? "__all__"}
                  onValueChange={(v) =>
                    setCarlistId(v === "__all__" ? undefined : v)
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Tutte le carlist" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Tutte le carlist</SelectItem>
                    {carlists.map((cl) => (
                      <SelectItem key={cl.id} value={cl.id}>
                        {cl.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <Button
              type="submit"
              disabled={isPending || !startDate || !endDate}
              className="sm:ml-auto"
            >
              {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Genera Report
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
