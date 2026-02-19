"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import {
  createKmReadingSchema,
  updateKmReadingSchema,
} from "@/lib/schemas/km-reading";
import type {
  CreateKmReadingInput,
  UpdateKmReadingInput,
} from "@/lib/schemas/km-reading";
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
  Form,
  FormControl,
  FormDescription,
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
import { getTenantVehiclesForKmAction } from "../actions/get-tenant-vehicles";
import { createKmReadingAction } from "../actions/create-km-reading";
import { updateKmReadingAction } from "../actions/update-km-reading";
import { getLastOdometerAction } from "../actions/get-last-odometer";

// ---------------------------------------------------------------------------
// Form values type
// ---------------------------------------------------------------------------

type FormValues = {
  vehicleId: string;
  date: Date;
  odometerKm: number;
  notes?: string;
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type KmReadingFormProps = {
  mode?: "create" | "edit";
  recordId?: string;
  defaultValues?: FormValues;
  defaultVehicleId?: string;
  isDriver?: boolean;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function KmReadingForm({
  mode = "create",
  recordId,
  defaultValues: initialDefaults,
  defaultVehicleId,
  isDriver = false,
}: KmReadingFormProps) {
  const router = useRouter();
  const t = useTranslations("kmReadings");
  const tCommon = useTranslations("common");
  const [isPending, startTransition] = useTransition();
  const [vehicles, setVehicles] = useState<VehicleOptionItem[]>([]);
  const [lastOdometer, setLastOdometer] = useState<{
    odometerKm: number;
    date: Date;
    source: string;
  } | null>(null);

  const isEdit = mode === "edit";
  const schema = isEdit ? updateKmReadingSchema : createKmReadingSchema;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema) as unknown as Resolver<FormValues>,
    defaultValues: initialDefaults ?? {
      vehicleId: defaultVehicleId ?? "",
      date: undefined as unknown as Date,
      odometerKm: undefined as unknown as number,
      notes: "",
    },
    mode: "onBlur",
  });

  const watchedVehicleId = form.watch("vehicleId");

  // Load vehicles for selector
  useEffect(() => {
    async function loadVehicles() {
      const result = await getTenantVehiclesForKmAction();
      if (result.success) {
        const mapped: VehicleOptionItem[] = result.data.map((v) => ({
          id: String(v.id),
          licensePlate: v.licensePlate,
          catalogVehicle: v.catalogVehicle,
        }));
        setVehicles(mapped);
        // If driver has only one vehicle, auto-select it
        if (isDriver && mapped.length === 1 && !initialDefaults) {
          form.setValue("vehicleId", mapped[0].id);
        }
      }
    }
    loadVehicles();
  }, [isDriver, form, initialDefaults]);

  // Load last known odometer when vehicle changes
  useEffect(() => {
    if (!watchedVehicleId) {
      setLastOdometer(null);
      return;
    }

    async function loadLastOdometer() {
      const result = await getLastOdometerAction(Number(watchedVehicleId));
      if (result.success) {
        setLastOdometer(result.data);
      }
    }
    loadLastOdometer();
  }, [watchedVehicleId]);

  function handleSubmit(values: FormValues) {
    startTransition(async () => {
      try {
        if (isEdit && recordId) {
          const result = await updateKmReadingAction(
            Number(recordId),
            values as UpdateKmReadingInput
          );
          if (result.success) {
            toast.success(t("readingUpdated"));
            router.push("/km-readings");
            router.refresh();
          } else {
            toast.error(result.error);
          }
        } else {
          const result = await createKmReadingAction(
            values as CreateKmReadingInput
          );
          if (result.success) {
            toast.success(t("readingCreated"));
            router.push("/km-readings");
            router.refresh();
          } else {
            toast.error(result.error);
          }
        }
      } catch {
        toast.error(t("readingSaveError"));
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
                <FormLabel>{t("readingDate")}</FormLabel>
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
                {lastOdometer && (
                  <FormDescription>
                    {t("lastReading", {
                      km: new Intl.NumberFormat("it-IT").format(
                        lastOdometer.odometerKm
                      ),
                      date: format(new Date(lastOdometer.date), "dd MMM yyyy", {
                        locale: it,
                      }),
                    })}
                  </FormDescription>
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
                ? t("updateReading")
                : t("createReading")}
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
