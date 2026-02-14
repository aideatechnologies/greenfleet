"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";

import {
  createFuelRecordSchema,
  updateFuelRecordSchema,
} from "@/lib/schemas/fuel-record";
import type {
  CreateFuelRecordInput,
  UpdateFuelRecordInput,
} from "@/lib/schemas/fuel-record";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { cn } from "@/lib/utils";
import {
  VehicleSelector,
  type VehicleOptionItem,
} from "@/components/forms/VehicleSelector";
import { getTenantVehiclesForFuelAction } from "../actions/get-tenant-vehicles";
import { createFuelRecordAction } from "../actions/create-fuel-record";
import { updateFuelRecordAction } from "../actions/update-fuel-record";

// ---------------------------------------------------------------------------
// Form values type
// ---------------------------------------------------------------------------

type FormValues = {
  vehicleId: string;
  date: Date;
  fuelType: string;
  quantityLiters: number;
  quantityKwh?: number | null;
  amountEur: number;
  odometerKm: number;
  notes?: string;
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type FuelRecordFormProps = {
  mode?: "create" | "edit";
  recordId?: string;
  defaultValues?: FormValues;
  defaultVehicleId?: string;
  isDriver?: boolean;
  fuelTypeOptions?: Array<{ value: string; label: string }>;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function FuelRecordForm({
  mode = "create",
  recordId,
  defaultValues: initialDefaults,
  defaultVehicleId,
  isDriver = false,
  fuelTypeOptions = [],
}: FuelRecordFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [vehicles, setVehicles] = useState<VehicleOptionItem[]>([]);

  const isEdit = mode === "edit";
  const schema = isEdit ? updateFuelRecordSchema : createFuelRecordSchema;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema) as unknown as Resolver<FormValues>,
    defaultValues: initialDefaults ?? {
      vehicleId: defaultVehicleId ?? "",
      date: undefined as unknown as Date,
      fuelType: "",
      quantityLiters: undefined as unknown as number,
      quantityKwh: undefined,
      amountEur: undefined as unknown as number,
      odometerKm: undefined as unknown as number,
      notes: "",
    },
    mode: "onBlur",
  });

  // Load vehicles for selector
  useEffect(() => {
    async function loadVehicles() {
      const result = await getTenantVehiclesForFuelAction();
      if (result.success) {
        setVehicles(result.data);
        // If driver has only one vehicle, auto-select it
        if (isDriver && result.data.length === 1 && !initialDefaults) {
          form.setValue("vehicleId", result.data[0].id);
        }
      }
    }
    loadVehicles();
  }, [isDriver, form, initialDefaults]);

  const watchedFuelType = form.watch("fuelType");

  function handleSubmit(values: FormValues) {
    startTransition(async () => {
      try {
        if (isEdit && recordId) {
          const result = await updateFuelRecordAction(
            recordId,
            values as UpdateFuelRecordInput
          );
          if (result.success) {
            toast.success("Rifornimento aggiornato con successo");
            router.push("/fuel-records");
            router.refresh();
          } else {
            toast.error(result.error);
          }
        } else {
          const result = await createFuelRecordAction(
            values as CreateFuelRecordInput
          );
          if (result.success) {
            toast.success("Rifornimento registrato con successo");
            router.push("/fuel-records");
            router.refresh();
          } else {
            toast.error(result.error);
          }
        }
      } catch {
        toast.error("Errore nel salvataggio del rifornimento");
      }
    });
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="space-y-6 max-w-2xl"
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Vehicle selector */}
          <FormField
            control={form.control}
            name="vehicleId"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>Veicolo *</FormLabel>
                <FormControl>
                  <VehicleSelector
                    vehicles={vehicles}
                    defaultVehicleId={defaultVehicleId ?? field.value}
                    onSelect={(id) => field.onChange(id)}
                    disabled={isEdit || (isDriver && vehicles.length === 1)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Date picker */}
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Data rifornimento *</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {field.value
                          ? format(new Date(field.value), "dd MMMM yyyy", {
                              locale: it,
                            })
                          : "Seleziona data"}
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={
                        field.value ? new Date(field.value) : undefined
                      }
                      onSelect={(date) => field.onChange(date)}
                      disabled={(date) => date > new Date()}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Fuel type select */}
          <FormField
            control={form.control}
            name="fuelType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo carburante *</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value}
                >
                  <FormControl>
                    <SelectTrigger
                      className={cn(!field.value && "text-muted-foreground")}
                    >
                      <SelectValue placeholder="Seleziona tipo" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {fuelTypeOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Quantity liters - hide for ELETTRICO */}
          {watchedFuelType !== "ELETTRICO" && (
            <FormField
              control={form.control}
              name="quantityLiters"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quantita Litri *</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0,00"
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          field.onChange(
                            val === "" ? undefined : parseFloat(val)
                          );
                        }}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                        L
                      </span>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {/* Quantity kWh - show for ELETTRICO, IBRIDO_BENZINA, IBRIDO_DIESEL */}
          {(watchedFuelType === "ELETTRICO" || watchedFuelType === "IBRIDO_BENZINA" || watchedFuelType === "IBRIDO_DIESEL") && (
            <FormField
              control={form.control}
              name="quantityKwh"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quantita kWh {watchedFuelType === "ELETTRICO" ? "*" : ""}</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0,00"
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          field.onChange(val === "" ? undefined : parseFloat(val));
                        }}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                        kWh
                      </span>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {/* Amount EUR */}
          <FormField
            control={form.control}
            name="amountEur"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Importo *</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0,00"
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        field.onChange(
                          val === "" ? undefined : parseFloat(val)
                        );
                      }}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      EUR
                    </span>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Odometer km */}
          <FormField
            control={form.control}
            name="odometerKm"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Chilometraggio *</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      type="number"
                      step="1"
                      min="0"
                      placeholder="0"
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        field.onChange(
                          val === "" ? undefined : parseInt(val, 10)
                        );
                      }}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      km
                    </span>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Notes */}
          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>Note</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Note aggiuntive sul rifornimento..."
                    rows={3}
                    {...field}
                    value={field.value ?? ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex gap-3">
          <Button type="submit" disabled={isPending}>
            {isPending
              ? "Salvataggio..."
              : isEdit
                ? "Aggiorna rifornimento"
                : "Registra rifornimento"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.back()}
            disabled={isPending}
          >
            Annulla
          </Button>
        </div>
      </form>
    </Form>
  );
}
