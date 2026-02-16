"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import {
  createGwpConfigSchema,
  type CreateGwpConfigInput,
} from "@/lib/schemas/gwp-config";
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
import { toast } from "sonner";
import { createGwpConfigAction } from "../actions/create-gwp-config";
import { updateGwpConfigAction } from "../actions/update-gwp-config";

const GAS_OPTIONS = ["CO2", "CH4", "N2O", "HFC", "PFC", "SF6", "NF3"] as const;

type EditValues = {
  gasName: string;
  gwpValue: number;
  source: string;
  isActive: boolean;
};

type GwpConfigFormProps =
  | {
      mode: "create";
      trigger?: never;
      configId?: never;
      defaultValues?: never;
    }
  | {
      mode: "edit";
      trigger: ReactNode;
      configId: number;
      defaultValues: EditValues;
    };

export function GwpConfigForm(props: GwpConfigFormProps) {
  const isEdit = props.mode === "edit";
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<CreateGwpConfigInput>({
    resolver: zodResolver(createGwpConfigSchema),
    defaultValues: isEdit
      ? {
          gasName: props.defaultValues.gasName as (typeof GAS_OPTIONS)[number],
          gwpValue: props.defaultValues.gwpValue,
          source: props.defaultValues.source,
        }
      : {
          gasName: "" as string as (typeof GAS_OPTIONS)[number],
          gwpValue: 0,
          source: "",
        },
  });

  async function handleSubmit(values: CreateGwpConfigInput) {
    setIsLoading(true);
    try {
      const result = isEdit
        ? await updateGwpConfigAction(props.configId, {
            gwpValue: values.gwpValue,
            source: values.source,
          })
        : await createGwpConfigAction(values);

      if (result.success) {
        toast.success(
          isEdit
            ? "Configurazione GWP aggiornata"
            : "Configurazione GWP creata"
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
      const result = await updateGwpConfigAction(props.configId, {
        isActive: !props.defaultValues.isActive,
      });
      if (result.success) {
        toast.success(
          props.defaultValues.isActive
            ? "Configurazione GWP disattivata"
            : "Configurazione GWP attivata"
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
            Nuova configurazione GWP
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>
            {isEdit
              ? "Modifica configurazione GWP"
              : "Nuova configurazione GWP"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Modifica il potenziale di riscaldamento globale per il gas selezionato."
              : "Inserisci un nuovo potenziale di riscaldamento globale (GWP) per un gas Kyoto."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="gasName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Gas</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={isEdit}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona gas" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {GAS_OPTIONS.map((gas) => (
                        <SelectItem key={gas} value={gas}>
                          {gas}
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
              name="gwpValue"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Valore GWP</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="Es. 28"
                      {...field}
                      onChange={(e) =>
                        field.onChange(parseFloat(e.target.value))
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="source"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fonte</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Es. IPCC AR5, IPCC AR6"
                      maxLength={100}
                      {...field}
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
                    Le configurazioni inattive non saranno usate nel calcolo
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
                    : "Crea configurazione"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
