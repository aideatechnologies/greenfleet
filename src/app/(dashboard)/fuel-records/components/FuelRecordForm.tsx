"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { useTranslations } from "next-intl";

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
import {
  getFuelCardsForVehicleAction,
  type FuelCardOptionItem,
} from "../actions/get-fuel-cards";
import { createFuelRecordAction } from "../actions/create-fuel-record";
import { updateFuelRecordAction } from "../actions/update-fuel-record";
import {
  getFuelTypesForVehicleAction,
  type FuelTypeOption,
} from "../actions/get-fuel-type-options";

// ---------------------------------------------------------------------------
// Form values type
// ---------------------------------------------------------------------------

type FormValues = {
  vehicleId: string;
  date: Date;
  fuelType: string;
  quantityLiters?: number | null;
  quantityKwh?: number | null;
  amountEur: number;
  odometerKm: number;
  fuelCardId?: string | null;
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
}: FuelRecordFormProps) {
  const router = useRouter();
  const t = useTranslations("fuelRecords");
  const tCommon = useTranslations("common");
  const [isPending, startTransition] = useTransition();
  const [vehicles, setVehicles] = useState<VehicleOptionItem[]>([]);
  const [fuelCards, setFuelCards] = useState<FuelCardOptionItem[]>([]);
  const [fuelTypeOptions, setFuelTypeOptions] = useState<FuelTypeOption[]>([]);

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
      fuelCardId: undefined,
      notes: "",
    },
    mode: "onBlur",
  });

  // Load fuel types and cards for a specific vehicle (data only, no form changes)
  const loadVehicleOptions = useCallback(async (vehicleId: string) => {
    const vid = Number(vehicleId);
    const [fuelTypesResult, fuelCardsResult] = await Promise.all([
      getFuelTypesForVehicleAction(vid),
      getFuelCardsForVehicleAction(vid),
    ]);
    let types: FuelTypeOption[] = [];
    let cards: FuelCardOptionItem[] = [];
    if (fuelTypesResult.success) {
      types = fuelTypesResult.data;
      setFuelTypeOptions(types);
    }
    if (fuelCardsResult.success) {
      cards = fuelCardsResult.data;
      setFuelCards(cards);
    }
    return { types, cards };
  }, []);

  // Handle vehicle change from user interaction: reset dependents and reload
  const handleVehicleChange = useCallback(
    async (vehicleId: string) => {
      form.setValue("vehicleId", vehicleId);
      form.setValue("fuelType", "");
      form.setValue("fuelCardId", undefined);
      setFuelTypeOptions([]);
      setFuelCards([]);
      if (vehicleId) {
        const { types, cards } = await loadVehicleOptions(vehicleId);
        if (types.length === 1) form.setValue("fuelType", types[0].value);
        if (cards.length === 1) form.setValue("fuelCardId", cards[0].id);
      }
    },
    [form, loadVehicleOptions]
  );

  // Load vehicles on mount; load fuel types/cards for pre-selected vehicle
  useEffect(() => {
    async function load() {
      const vehiclesResult = await getTenantVehiclesForFuelAction();
      if (!vehiclesResult.success) return;
      setVehicles(vehiclesResult.data);

      let vehicleIdToLoad: string | undefined;

      if (isDriver && vehiclesResult.data.length === 1 && !initialDefaults) {
        vehicleIdToLoad = vehiclesResult.data[0].id;
        form.setValue("vehicleId", vehicleIdToLoad);
      } else {
        vehicleIdToLoad = initialDefaults?.vehicleId || defaultVehicleId;
      }

      if (vehicleIdToLoad) {
        const { types, cards } = await loadVehicleOptions(vehicleIdToLoad);
        // Auto-select only for new records (edit already has values)
        if (!initialDefaults) {
          if (types.length === 1) form.setValue("fuelType", types[0].value);
          if (cards.length === 1) form.setValue("fuelCardId", cards[0].id);
        }
      }
    }
    load();
  }, [isDriver, form, initialDefaults, defaultVehicleId, loadVehicleOptions]);

  const watchedVehicleId = form.watch("vehicleId");
  const watchedFuelType = form.watch("fuelType");

  function handleSubmit(values: FormValues) {
    startTransition(async () => {
      try {
        if (isEdit && recordId) {
          const result = await updateFuelRecordAction(
            Number(recordId),
            values as UpdateFuelRecordInput
          );
          if (result.success) {
            toast.success(t("fuelRecordUpdated"));
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
            toast.success(t("fuelRecordCreated"));
            router.push("/fuel-records");
            router.refresh();
          } else {
            toast.error(result.error);
          }
        }
      } catch {
        toast.error(t("fuelRecordSaveError"));
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
                <FormLabel>{t("vehicle")}</FormLabel>
                <FormControl>
                  <VehicleSelector
                    vehicles={vehicles}
                    defaultVehicleId={defaultVehicleId ?? field.value}
                    onSelect={(id) => handleVehicleChange(id)}
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
                <FormLabel>{t("fuelDate")}</FormLabel>
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
                          : tCommon("selectDate")}
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
                <FormLabel>{t("fuelType")}</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value}
                  disabled={!watchedVehicleId}
                >
                  <FormControl>
                    <SelectTrigger
                      className={cn(!field.value && "text-muted-foreground")}
                    >
                      <SelectValue placeholder={t("selectFuelType")} />
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
                  <FormLabel>{t("quantityLiters")}</FormLabel>
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
                  <FormLabel>{watchedFuelType === "ELETTRICO" ? t("quantityKwhRequired") : t("quantityKwh")}</FormLabel>
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
                <FormLabel>{t("amount")}</FormLabel>
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
                <FormLabel>{t("odometer")}</FormLabel>
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

          {/* Fuel card selector (obbligatorio) */}
          <FormField
            control={form.control}
            name="fuelCardId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("fuelCard")}</FormLabel>
                {!watchedVehicleId || fuelCards.length > 0 ? (
                  <Select
                    onValueChange={field.onChange}
                    value={field.value ?? ""}
                    disabled={!watchedVehicleId}
                  >
                    <FormControl>
                      <SelectTrigger
                        className={cn(
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        <SelectValue placeholder={t("selectFuelCard")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {fuelCards.map((fc) => (
                        <SelectItem key={fc.id} value={fc.id}>
                          {fc.cardNumber} ({fc.supplierName})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {t("noFuelCardForVehicle")}
                  </p>
                )}
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
                <FormLabel>{tCommon("notes")}</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder={t("additionalNotes")}
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
              ? tCommon("saving")
              : isEdit
                ? t("updateFuelRecord")
                : t("createFuelRecord")}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.back()}
            disabled={isPending}
          >
            {tCommon("cancel")}
          </Button>
        </div>
      </form>
    </Form>
  );
}
