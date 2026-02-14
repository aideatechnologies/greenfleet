"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  emissionConversionConfigSchema,
  type EmissionConversionConfigInput,
} from "@/lib/schemas/emission-standard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
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
  FormDescription,
} from "@/components/ui/form";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import {
  createConversionConfig,
  updateConversionConfig,
} from "../actions/manage-conversion-config";

type ConversionConfigFormProps =
  | {
      mode: "create";
      trigger?: never;
      configId?: never;
      defaultValues?: never;
    }
  | {
      mode: "edit";
      trigger: ReactNode;
      configId: string;
      defaultValues: EmissionConversionConfigInput;
    };

export function ConversionConfigForm(props: ConversionConfigFormProps) {
  const isEdit = props.mode === "edit";
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<EmissionConversionConfigInput>({
    resolver: zodResolver(emissionConversionConfigSchema),
    defaultValues: isEdit
      ? props.defaultValues
      : {
          name: "",
          nedcToWltpFactor: 1.21,
          wltpToNedcFactor: 0.83,
          isDefault: false,
        },
  });

  async function handleSubmit(values: EmissionConversionConfigInput) {
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.set("name", values.name);
      formData.set("nedcToWltpFactor", String(values.nedcToWltpFactor));
      formData.set("wltpToNedcFactor", String(values.wltpToNedcFactor));
      formData.set("isDefault", String(values.isDefault));

      const result = isEdit
        ? await updateConversionConfig(props.configId, formData)
        : await createConversionConfig(formData);

      if (result.success) {
        toast.success(
          isEdit
            ? "Configurazione aggiornata"
            : "Configurazione creata"
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
            Nuova configurazione
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Modifica configurazione" : "Nuova configurazione"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Modifica i fattori di conversione tra standard WLTP e NEDC."
              : "Crea una nuova configurazione di conversione tra standard WLTP e NEDC."}
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
                      placeholder="Es. Standard EU 2021"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="nedcToWltpFactor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fattore NEDC → WLTP</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      min="1.00"
                      max="2.00"
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value))}
                    />
                  </FormControl>
                  <FormDescription>
                    Valore tra 1,00 e 2,00. Tipico: 1,21
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="wltpToNedcFactor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fattore WLTP → NEDC</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      min="0.50"
                      max="1.00"
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value))}
                    />
                  </FormControl>
                  <FormDescription>
                    Valore tra 0,50 e 1,00. Tipico: 0,83
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isDefault"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Predefinita</FormLabel>
                    <FormDescription>
                      Usa questa configurazione come predefinita per le nuove
                      conversioni
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
