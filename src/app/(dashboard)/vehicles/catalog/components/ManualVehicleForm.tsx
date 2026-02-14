"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus, Trash2, Loader2 } from "lucide-react";

import {
  manualVehicleWithEnginesSchema,
  type ManualVehicleWithEnginesInput,
  type ManualVehicleWithEnginesFormValues,
} from "@/lib/schemas/vehicle";
import { Co2Standard } from "@/types/vehicle";
import { createManualVehicle } from "../../actions/create-manual-vehicle";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Form,
  FormControl,
  FormDescription,
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
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const EMPTY_ENGINE: ManualVehicleWithEnginesFormValues["engines"][number] = {
  fuelType: "" as string,
  cilindrata: undefined,
  potenzaKw: undefined,
  potenzaCv: undefined,
  co2GKm: undefined,
  co2Standard: "WLTP",
  consumptionL100Km: undefined,
  consumptionUnit: "L/100KM",
};

type ManualVehicleFormProps = {
  fuelTypeOptions?: Array<{ value: string; label: string }>;
};

export function ManualVehicleForm({ fuelTypeOptions = [] }: ManualVehicleFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm<ManualVehicleWithEnginesFormValues>({
    resolver: zodResolver(manualVehicleWithEnginesSchema),
    mode: "onBlur",
    defaultValues: {
      marca: "",
      modello: "",
      allestimento: "",
      carrozzeria: "",
      normativa: "",
      capacitaSerbatoioL: undefined,
      isHybrid: false,
      engines: [{ ...EMPTY_ENGINE }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "engines",
  });

  function onSubmit(values: ManualVehicleWithEnginesFormValues) {
    startTransition(async () => {
      try {
        // Pulisci stringhe vuote opzionali prima dell'invio.
        // Il server action ri-valida con safeParse, quindi i default
        // di Zod (co2Standard, consumptionUnit, isHybrid) vengono applicati.
        const cleanedValues: ManualVehicleWithEnginesInput = {
          marca: values.marca,
          modello: values.modello,
          allestimento: values.allestimento || undefined,
          carrozzeria: values.carrozzeria || undefined,
          normativa: values.normativa || undefined,
          capacitaSerbatoioL: values.capacitaSerbatoioL,
          isHybrid: values.isHybrid ?? false,
          engines: values.engines.map((engine) => ({
            fuelType: engine.fuelType,
            cilindrata: engine.cilindrata,
            potenzaKw: engine.potenzaKw,
            potenzaCv: engine.potenzaCv,
            co2GKm: engine.co2GKm,
            co2Standard: engine.co2Standard ?? "WLTP",
            consumptionL100Km: engine.consumptionL100Km,
            consumptionUnit: engine.consumptionUnit || "L/100KM",
          })),
        };

        const result = await createManualVehicle(cleanedValues);

        if (result.success) {
          toast.success("Veicolo creato con successo");
          router.push("/vehicles/catalog");
          router.refresh();
        } else {
          toast.error(result.error);
        }
      } catch {
        toast.error("Errore imprevisto durante il salvataggio");
      }
    });
  }

  /**
   * Helper per convertire il valore di un input numerico.
   * Restituisce undefined se il campo e' vuoto, altrimenti il numero.
   */
  function parseNumberInput(value: string): number | undefined {
    if (value === "") return undefined;
    const n = Number(value);
    return Number.isNaN(n) ? undefined : n;
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {/* ----------------------------------------------------------------
            Sezione: Dati Veicolo
        ---------------------------------------------------------------- */}
        <Card>
          <CardHeader>
            <CardTitle>Dati veicolo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {/* Marca */}
              <FormField
                control={form.control}
                name="marca"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Marca <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="Es. Fiat" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Modello */}
              <FormField
                control={form.control}
                name="modello"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Modello <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="Es. Ducato" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Allestimento */}
              <FormField
                control={form.control}
                name="allestimento"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Allestimento</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Es. Maxi XL H2"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Carrozzeria */}
              <FormField
                control={form.control}
                name="carrozzeria"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Carrozzeria</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Es. Furgone"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Normativa */}
              <FormField
                control={form.control}
                name="normativa"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Normativa</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Es. Euro 6d"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormDescription>
                      Standard di emissioni del veicolo
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Capacita serbatoio */}
              <FormField
                control={form.control}
                name="capacitaSerbatoioL"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Capacita serbatoio (L)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        placeholder="Es. 80"
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(parseNumberInput(e.target.value))
                        }
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Ibrido */}
              <FormField
                control={form.control}
                name="isHybrid"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 md:col-span-2">
                    <div className="space-y-0.5">
                      <FormLabel>Veicolo ibrido</FormLabel>
                      <FormDescription>
                        Attiva se il veicolo ha una doppia motorizzazione
                        (termico + elettrico)
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        <Separator />

        {/* ----------------------------------------------------------------
            Sezione: Motori
        ---------------------------------------------------------------- */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Motori</CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ ...EMPTY_ENGINE })}
            >
              <Plus className="size-4" />
              Aggiungi motore
            </Button>
          </CardHeader>
          <CardContent className="space-y-6">
            {fields.map((fieldItem, index) => (
              <div
                key={fieldItem.id}
                className="relative rounded-lg border p-4 space-y-4"
              >
                {/* Header motore */}
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">
                    Motore {index + 1}
                  </h4>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={fields.length <= 1}
                    onClick={() => remove(index)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="size-4" />
                    Rimuovi
                  </Button>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {/* Tipo alimentazione */}
                  <FormField
                    control={form.control}
                    name={`engines.${index}.fuelType`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Tipo alimentazione{" "}
                          <span className="text-destructive">*</span>
                        </FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
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

                  {/* Cilindrata */}
                  <FormField
                    control={form.control}
                    name={`engines.${index}.cilindrata`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cilindrata (cc)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="1"
                            min="0"
                            placeholder="Es. 2287"
                            value={field.value ?? ""}
                            onChange={(e) =>
                              field.onChange(parseNumberInput(e.target.value))
                            }
                            onBlur={field.onBlur}
                            name={field.name}
                            ref={field.ref}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Potenza kW */}
                  <FormField
                    control={form.control}
                    name={`engines.${index}.potenzaKw`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Potenza (kW)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.1"
                            min="0"
                            placeholder="Es. 103"
                            value={field.value ?? ""}
                            onChange={(e) =>
                              field.onChange(parseNumberInput(e.target.value))
                            }
                            onBlur={field.onBlur}
                            name={field.name}
                            ref={field.ref}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Potenza CV */}
                  <FormField
                    control={form.control}
                    name={`engines.${index}.potenzaCv`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Potenza (CV)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.1"
                            min="0"
                            placeholder="Es. 140"
                            value={field.value ?? ""}
                            onChange={(e) =>
                              field.onChange(parseNumberInput(e.target.value))
                            }
                            onBlur={field.onBlur}
                            name={field.name}
                            ref={field.ref}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* CO2 g/km */}
                  <FormField
                    control={form.control}
                    name={`engines.${index}.co2GKm`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Emissioni CO2 (g/km)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.1"
                            min="0"
                            placeholder="Es. 198"
                            value={field.value ?? ""}
                            onChange={(e) =>
                              field.onChange(parseNumberInput(e.target.value))
                            }
                            onBlur={field.onBlur}
                            name={field.name}
                            ref={field.ref}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Standard CO2 */}
                  <FormField
                    control={form.control}
                    name={`engines.${index}.co2Standard`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Standard CO2</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Seleziona standard" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Object.values(Co2Standard).map((std) => (
                              <SelectItem key={std} value={std}>
                                {std}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Ciclo di misurazione delle emissioni
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Consumo L/100km */}
                  <FormField
                    control={form.control}
                    name={`engines.${index}.consumptionL100Km`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Consumo (L/100km)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.1"
                            min="0"
                            placeholder="Es. 7.5"
                            value={field.value ?? ""}
                            onChange={(e) =>
                              field.onChange(parseNumberInput(e.target.value))
                            }
                            onBlur={field.onBlur}
                            name={field.name}
                            ref={field.ref}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            ))}

            {/* Errore validazione array motori */}
            {form.formState.errors.engines?.root && (
              <p className="text-sm text-destructive">
                {form.formState.errors.engines.root.message}
              </p>
            )}
            {form.formState.errors.engines?.message && (
              <p className="text-sm text-destructive">
                {form.formState.errors.engines.message}
              </p>
            )}
          </CardContent>
        </Card>

        {/* ----------------------------------------------------------------
            Footer: Azioni
        ---------------------------------------------------------------- */}
        <div className="flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.back()}
            disabled={isPending}
          >
            Annulla
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending && <Loader2 className="size-4 animate-spin" />}
            Salva veicolo
          </Button>
        </div>
      </form>
    </Form>
  );
}
