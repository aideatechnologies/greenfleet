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
  createEmissionTargetSchema,
  type CreateEmissionTargetInput,
} from "@/lib/schemas/emission-target";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

import { createEmissionTargetAction } from "../actions/create-emission-target";
import { updateEmissionTargetAction } from "../actions/update-emission-target";
import {
  getCarlistsAction,
  type CarlistOption,
} from "../actions/get-carlists";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type EmissionTargetFormProps =
  | {
      mode: "create";
      open: boolean;
      onOpenChange: (open: boolean) => void;
    }
  | {
      mode: "edit";
      targetId: string;
      defaultValues: CreateEmissionTargetInput;
      open: boolean;
      onOpenChange: (open: boolean) => void;
    };

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function EmissionTargetForm(props: EmissionTargetFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [carlists, setCarlists] = useState<CarlistOption[]>([]);
  const isEdit = props.mode === "edit";

  const form = useForm<CreateEmissionTargetInput>({
    resolver: zodResolver(
      createEmissionTargetSchema
    ) as Resolver<CreateEmissionTargetInput>,
    defaultValues: isEdit
      ? props.defaultValues
      : {
          scope: "Fleet",
          carlistId: undefined,
          targetValue: undefined as unknown as number,
          period: "Annual",
          startDate: undefined as unknown as Date,
          endDate: undefined as unknown as Date,
          description: "",
        },
    mode: "onBlur",
  });

  const watchScope = form.watch("scope");

  // Load carlists when scope is Carlist
  useEffect(() => {
    if (watchScope === "Carlist") {
      getCarlistsAction().then((result) => {
        if (result.success) {
          setCarlists(result.data);
        }
      });
    }
  }, [watchScope]);

  function handleSubmit(values: CreateEmissionTargetInput) {
    startTransition(async () => {
      try {
        const result = isEdit
          ? await updateEmissionTargetAction({
              ...values,
              id: props.targetId,
            })
          : await createEmissionTargetAction(values);

        if (result.success) {
          toast.success(
            isEdit
              ? "Target aggiornato con successo"
              : "Target creato con successo"
          );
          form.reset();
          props.onOpenChange(false);
          router.refresh();
        } else {
          toast.error(result.error);
        }
      } catch {
        toast.error(
          isEdit
            ? "Errore nell'aggiornamento del target"
            : "Errore nella creazione del target"
        );
      }
    });
  }

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Modifica target" : "Nuovo target di emissioni"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Modifica i parametri del target di emissioni."
              : "Definisci un nuovo obiettivo di riduzione delle emissioni."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            {/* Scope */}
            <FormField
              control={form.control}
              name="scope"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ambito *</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      field.onChange(value);
                      if (value === "Fleet") {
                        form.setValue("carlistId", undefined);
                      }
                    }}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona ambito" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Fleet">Intera Flotta</SelectItem>
                      <SelectItem value="Carlist">Carlist</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Scegli se il target riguarda l&apos;intera flotta o una
                    specifica carlist.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Carlist selector (only when scope = Carlist) */}
            {watchScope === "Carlist" && (
              <FormField
                control={form.control}
                name="carlistId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Carlist *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value ?? ""}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleziona carlist" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {carlists.map((cl) => (
                          <SelectItem key={cl.id} value={cl.id}>
                            {cl.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Target value */}
            <FormField
              control={form.control}
              name="targetValue"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Valore obiettivo (kgCO2e) *</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="Es. 50000"
                        value={field.value ?? ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          field.onChange(
                            val === "" ? undefined : parseFloat(val)
                          );
                        }}
                        onBlur={field.onBlur}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                        kgCO2e
                      </span>
                    </div>
                  </FormControl>
                  <FormDescription>
                    Limite massimo di emissioni per il periodo.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Period */}
            <FormField
              control={form.control}
              name="period"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Periodo *</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona periodo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Annual">Annuale</SelectItem>
                      <SelectItem value="Monthly">Mensile</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Start date */}
            <FormField
              control={form.control}
              name="startDate"
              render={({ field }) => {
                const dateVal = field.value as Date | undefined;
                return (
                  <FormItem>
                    <FormLabel>Data inizio *</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !dateVal && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {dateVal
                              ? format(new Date(dateVal), "dd MMMM yyyy", {
                                  locale: it,
                                })
                              : "Seleziona data"}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={dateVal ? new Date(dateVal) : undefined}
                          onSelect={(date) => field.onChange(date)}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />

            {/* End date */}
            <FormField
              control={form.control}
              name="endDate"
              render={({ field }) => {
                const dateVal = field.value as Date | undefined;
                return (
                  <FormItem>
                    <FormLabel>Data fine *</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !dateVal && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {dateVal
                              ? format(new Date(dateVal), "dd MMMM yyyy", {
                                  locale: it,
                                })
                              : "Seleziona data"}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={dateVal ? new Date(dateVal) : undefined}
                          onSelect={(date) => field.onChange(date)}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrizione</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descrizione opzionale del target..."
                      rows={3}
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => props.onOpenChange(false)}
                disabled={isPending}
              >
                Annulla
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending
                  ? isEdit
                    ? "Salvataggio..."
                    : "Creazione..."
                  : isEdit
                    ? "Salva modifiche"
                    : "Crea target"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
