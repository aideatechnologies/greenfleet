"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  createCarlistSchema,
  type CreateCarlistInput,
} from "@/lib/schemas/carlist";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { createCarlistAction } from "../actions/create-carlist";
import { updateCarlistAction } from "../actions/update-carlist";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type CarlistFormProps =
  | {
      mode: "create";
      open: boolean;
      onOpenChange: (open: boolean) => void;
    }
  | {
      mode: "edit";
      carlistId: string;
      defaultValues: CreateCarlistInput;
      open: boolean;
      onOpenChange: (open: boolean) => void;
    };

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CarlistForm(props: CarlistFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const isEdit = props.mode === "edit";

  const form = useForm<CreateCarlistInput>({
    resolver: zodResolver(createCarlistSchema) as Resolver<CreateCarlistInput>,
    defaultValues: isEdit
      ? props.defaultValues
      : {
          name: "",
          description: "",
        },
    mode: "onBlur",
  });

  function handleSubmit(values: CreateCarlistInput) {
    startTransition(async () => {
      try {
        const result = isEdit
          ? await updateCarlistAction(props.carlistId, values)
          : await createCarlistAction(values);

        if (result.success) {
          toast.success(
            isEdit
              ? "Carlist aggiornata con successo"
              : "Carlist creata con successo"
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
            ? "Errore nell'aggiornamento della carlist"
            : "Errore nella creazione della carlist"
        );
      }
    });
  }

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Modifica carlist" : "Nuova carlist"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Modifica il nome o la descrizione della carlist."
              : "Crea un nuovo raggruppamento di veicoli."}
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
                  <FormLabel>Nome *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Es. Veicoli commerciali"
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
                    <Textarea
                      placeholder="Descrizione opzionale del raggruppamento..."
                      rows={3}
                      {...field}
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
                    : "Crea carlist"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
