"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import {
  createMacroFuelTypeSchema,
  type CreateMacroFuelTypeInput,
} from "@/lib/schemas/macro-fuel-type";
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
import { Switch } from "@/components/ui/switch";
import { FUEL_UNITS, type FuelUnit } from "@/lib/utils/fuel-units";
import { toast } from "sonner";
import { createMacroFuelTypeAction } from "../actions/create-macro-fuel-type";
import { updateMacroFuelTypeAction } from "../actions/update-macro-fuel-type";

type EditValues = {
  name: string;
  scope: number;
  unit: FuelUnit;
  color: string;
  sortOrder: number;
  isActive: boolean;
};

type MacroFuelTypeFormProps =
  | {
      mode: "create";
      trigger?: never;
      macroFuelTypeId?: never;
      defaultValues?: never;
    }
  | {
      mode: "edit";
      trigger: ReactNode;
      macroFuelTypeId: string;
      defaultValues: EditValues;
    };

export function MacroFuelTypeForm(props: MacroFuelTypeFormProps) {
  const isEdit = props.mode === "edit";
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<CreateMacroFuelTypeInput & { isActive?: boolean }>({
    resolver: zodResolver(createMacroFuelTypeSchema),
    defaultValues: isEdit
      ? {
          name: props.defaultValues.name,
          scope: props.defaultValues.scope,
          unit: props.defaultValues.unit,
          color: props.defaultValues.color,
          sortOrder: props.defaultValues.sortOrder,
        }
      : {
          name: "",
          scope: 1,
          unit: "L",
          color: "#6366f1",
          sortOrder: 0,
        },
  });

  async function handleSubmit(
    values: CreateMacroFuelTypeInput & { isActive?: boolean }
  ) {
    setIsLoading(true);
    try {
      const result = isEdit
        ? await updateMacroFuelTypeAction(props.macroFuelTypeId, {
            ...values,
            isActive: props.defaultValues.isActive,
          })
        : await createMacroFuelTypeAction(values);

      if (result.success) {
        toast.success(
          isEdit
            ? "Macro tipo carburante aggiornato"
            : "Macro tipo carburante creato"
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

  async function handleToggleActive() {
    if (!isEdit) return;
    setIsLoading(true);
    try {
      const result = await updateMacroFuelTypeAction(props.macroFuelTypeId, {
        isActive: !props.defaultValues.isActive,
      });
      if (result.success) {
        toast.success(
          props.defaultValues.isActive
            ? "Macro tipo disattivato"
            : "Macro tipo attivato"
        );
        setOpen(false);
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
            Nuovo macro tipo
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>
            {isEdit
              ? "Modifica macro tipo carburante"
              : "Nuovo macro tipo carburante"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Modifica le proprieta del macro tipo carburante."
              : "Crea un nuovo macro tipo per raggruppare i carburanti per scope emissivo."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Es. Benzina, Diesel, Elettrico"
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
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Colore</FormLabel>
                  <FormControl>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={field.value ?? "#6366f1"}
                        onChange={field.onChange}
                        className="h-10 w-10 cursor-pointer rounded-md border border-input p-0.5"
                      />
                      <Input
                        value={field.value ?? "#6366f1"}
                        onChange={field.onChange}
                        maxLength={7}
                        className="w-28 font-mono"
                        placeholder="#6366f1"
                      />
                    </div>
                  </FormControl>
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

            <FormField
              control={form.control}
              name="unit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Unita di misura</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona unita" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {FUEL_UNITS.map((u) => (
                        <SelectItem key={u.value} value={u.value}>
                          {u.label}
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
              name="sortOrder"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ordine</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      placeholder="0"
                      {...field}
                      onChange={(e) =>
                        field.onChange(parseInt(e.target.value) || 0)
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {isEdit && (
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <span className="text-sm font-medium">Attivo</span>
                  <p className="text-xs text-muted-foreground">
                    I macro tipi inattivi non saranno selezionabili
                  </p>
                </div>
                <Switch
                  checked={props.defaultValues.isActive}
                  onCheckedChange={handleToggleActive}
                  disabled={isLoading}
                />
              </div>
            )}

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
                    : "Crea macro tipo"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
