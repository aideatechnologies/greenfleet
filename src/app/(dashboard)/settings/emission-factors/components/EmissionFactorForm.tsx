"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { CalendarIcon, Plus } from "lucide-react";
import {
  createEmissionFactorSchema,
  type CreateEmissionFactorInput,
} from "@/lib/schemas/emission-factor";
import { KYOTO_GAS_LABELS, type KyotoGas } from "@/types/emission";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { createEmissionFactorAction } from "../actions/create-emission-factor";
import { updateEmissionFactorAction } from "../actions/update-emission-factor";

type MacroFuelTypeRef = {
  id: number;
  name: string;
  scope: number;
  unit: string;
};

const GAS_FIELDS: { key: KyotoGas; label: string; primary: boolean }[] = [
  { key: "co2", label: "CO2", primary: true },
  { key: "ch4", label: "CH4", primary: true },
  { key: "n2o", label: "N2O", primary: true },
  { key: "hfc", label: "HFC", primary: false },
  { key: "pfc", label: "PFC", primary: false },
  { key: "sf6", label: "SF6", primary: false },
  { key: "nf3", label: "NF3", primary: false },
];

type FuelTypeOption = {
  value: string;
  label: string;
};

type EmissionFactorFormProps =
  | {
      mode: "create";
      trigger?: never;
      factorId?: never;
      defaultValues?: never;
      macroFuelTypes: MacroFuelTypeRef[];
      fuelTypeOptions?: FuelTypeOption[];
    }
  | {
      mode: "edit";
      trigger: ReactNode;
      factorId: number;
      defaultValues: CreateEmissionFactorInput;
      macroFuelTypes: MacroFuelTypeRef[];
      fuelTypeOptions?: FuelTypeOption[];
    };

export function EmissionFactorForm(props: EmissionFactorFormProps) {
  const isEdit = props.mode === "edit";
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<CreateEmissionFactorInput>({
    resolver: zodResolver(createEmissionFactorSchema),
    defaultValues: isEdit
      ? {
          macroFuelTypeId: props.defaultValues.macroFuelTypeId,
          fuelType: props.defaultValues.fuelType ?? "",
          co2: props.defaultValues.co2,
          ch4: props.defaultValues.ch4,
          n2o: props.defaultValues.n2o,
          hfc: props.defaultValues.hfc,
          pfc: props.defaultValues.pfc,
          sf6: props.defaultValues.sf6,
          nf3: props.defaultValues.nf3,
          source: props.defaultValues.source,
          effectiveDate: props.defaultValues.effectiveDate,
        }
      : {
          macroFuelTypeId: "",
          fuelType: "",
          co2: 0,
          ch4: 0,
          n2o: 0,
          hfc: 0,
          pfc: 0,
          sf6: 0,
          nf3: 0,
          source: "",
          effectiveDate: new Date(),
        },
  });

  async function handleSubmit(values: CreateEmissionFactorInput) {
    setIsLoading(true);
    try {
      const result = isEdit
        ? await updateEmissionFactorAction(props.factorId, values)
        : await createEmissionFactorAction(values);

      if (result.success) {
        toast.success(
          isEdit
            ? "Fattore di emissione aggiornato"
            : "Fattore di emissione creato"
        );
        setOpen(false);
        form.reset();
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error("Errore nel salvataggio");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {isEdit ? (
          props.trigger
        ) : (
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nuovo fattore
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>
            {isEdit
              ? "Modifica fattore di emissione"
              : "Nuovo fattore di emissione"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Modifica il fattore di emissione per il macro tipo selezionato."
              : "Inserisci un nuovo fattore di emissione con i valori per gas Kyoto."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="macroFuelTypeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Macro Tipo Carburante</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value ? String(field.value) : undefined}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona macro tipo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {props.macroFuelTypes.map((mft) => (
                        <SelectItem key={mft.id} value={String(mft.id)}>
                          {mft.name} (Scope {mft.scope}, {mft.unit})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="fuelType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Tipo Carburante{" "}
                    <span className="text-muted-foreground font-normal">
                      (opzionale)
                    </span>
                  </FormLabel>
                  <Select
                    onValueChange={(v) =>
                      field.onChange(v === "__all__" ? "" : v)
                    }
                    defaultValue={field.value || "__all__"}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Tutti i carburanti del macro tipo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="__all__">
                        Tutti (default macro tipo)
                      </SelectItem>
                      {(props.fuelTypeOptions ?? []).map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label} ({opt.value})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Primary gas fields */}
            <div>
              <p className="mb-2 text-sm font-medium">
                Gas principali (kg gas / unita)
              </p>
              <div className="grid grid-cols-3 gap-3">
                {GAS_FIELDS.filter((g) => g.primary).map((gas) => (
                  <FormField
                    key={gas.key}
                    control={form.control}
                    name={gas.key}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">
                          {KYOTO_GAS_LABELS[gas.key]}
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.000001"
                            min="0"
                            placeholder="0"
                            {...field}
                            onChange={(e) =>
                              field.onChange(parseFloat(e.target.value) || 0)
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ))}
              </div>
            </div>

            {/* Secondary gas fields */}
            <div>
              <p className="mb-2 text-sm font-medium">
                Gas secondari (kg gas / unita)
              </p>
              <div className="grid grid-cols-4 gap-3">
                {GAS_FIELDS.filter((g) => !g.primary).map((gas) => (
                  <FormField
                    key={gas.key}
                    control={form.control}
                    name={gas.key}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">
                          {KYOTO_GAS_LABELS[gas.key]}
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.000001"
                            min="0"
                            placeholder="0"
                            {...field}
                            onChange={(e) =>
                              field.onChange(parseFloat(e.target.value) || 0)
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ))}
              </div>
            </div>

            <FormField
              control={form.control}
              name="source"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fonte</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Es. ISPRA 2024, DEFRA 2024"
                      maxLength={100}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="effectiveDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Data Efficacia</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(
                              new Date(field.value as string | number | Date),
                              "dd MMM yyyy",
                              { locale: it }
                            )
                          ) : (
                            <span>Seleziona data</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={
                          field.value
                            ? new Date(
                                field.value as string | number | Date
                              )
                            : undefined
                        }
                        onSelect={field.onChange}
                        locale={it}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isLoading}
              >
                Annulla
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading
                  ? isEdit
                    ? "Salvataggio..."
                    : "Creazione..."
                  : isEdit
                    ? "Salva modifiche"
                    : "Crea fattore"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
