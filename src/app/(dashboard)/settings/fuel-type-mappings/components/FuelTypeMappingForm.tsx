"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import {
  createFuelTypeMappingSchema,
  type CreateFuelTypeMappingInput,
} from "@/lib/schemas/fuel-type-mapping";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { toast } from "sonner";
import { createFuelTypeMappingAction } from "../actions/create-fuel-type-mapping";
import { updateFuelTypeMappingAction } from "../actions/update-fuel-type-mapping";

type MacroFuelTypeRef = {
  id: number;
  name: string;
  scope: number;
  unit: string;
};

type EditValues = {
  vehicleFuelType: string;
  macroFuelTypeId: number;
  scope: number;
  description: string;
};

type FuelTypeMappingFormProps =
  | {
      mode: "create";
      trigger?: never;
      mappingId?: never;
      defaultValues?: never;
      macroFuelTypes: MacroFuelTypeRef[];
    }
  | {
      mode: "edit";
      trigger: ReactNode;
      mappingId: number;
      defaultValues: EditValues;
      macroFuelTypes: MacroFuelTypeRef[];
    };

export function FuelTypeMappingForm(props: FuelTypeMappingFormProps) {
  const isEdit = props.mode === "edit";
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<CreateFuelTypeMappingInput>({
    resolver: zodResolver(createFuelTypeMappingSchema),
    defaultValues: isEdit
      ? {
          vehicleFuelType: props.defaultValues.vehicleFuelType,
          macroFuelTypeId: props.defaultValues.macroFuelTypeId,
          scope: props.defaultValues.scope,
          description: props.defaultValues.description,
        }
      : {
          vehicleFuelType: "" as string,
          macroFuelTypeId: "",
          scope: 1,
          description: "",
        },
  });

  async function handleSubmit(values: CreateFuelTypeMappingInput) {
    setIsLoading(true);
    try {
      const result = isEdit
        ? await updateFuelTypeMappingAction(props.mappingId, {
            macroFuelTypeId: values.macroFuelTypeId,
            description: values.description,
          })
        : await createFuelTypeMappingAction(values);

      if (result.success) {
        toast.success(
          isEdit
            ? "Mappatura carburante aggiornata"
            : "Mappatura carburante creata"
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
            Nuova mappatura
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>
            {isEdit
              ? "Modifica mappatura carburante"
              : "Nuova mappatura carburante"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Modifica l'associazione tra tipo carburante veicolo e macro tipo."
              : "Associa un tipo di carburante veicolo a un macro tipo per il calcolo emissioni."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="vehicleFuelType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo Carburante Veicolo</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Es. BENZINA, DIESEL, ELETTRICO..."
                      maxLength={100}
                      disabled={isEdit}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrizione</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Es. Benzina, Ibrido Benzina..."
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
                          {mft.name} (Scope {mft.scope})
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
              name="scope"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Scope</FormLabel>
                  <Select
                    onValueChange={(v) => field.onChange(parseInt(v))}
                    defaultValue={String(field.value)}
                    disabled={isEdit}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona scope" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="1">1 - Termico</SelectItem>
                      <SelectItem value="2">2 - Elettrico</SelectItem>
                    </SelectContent>
                  </Select>
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
                    : "Crea mappatura"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
