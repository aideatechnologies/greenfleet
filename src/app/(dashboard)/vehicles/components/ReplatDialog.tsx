"use client";

import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { cn } from "@/lib/utils";
import { replatVehicleAction } from "../actions/replat-vehicle";

// Form-specific schema (vehicleId is passed as prop)
const replatFormSchema = z.object({
  newPlateNumber: z
    .string()
    .min(2, { error: "Targa obbligatoria (minimo 2 caratteri)" })
    .max(10, { error: "Targa non valida (massimo 10 caratteri)" })
    .transform((val) => val.trim().toUpperCase().replace(/\s/g, "")),
  effectiveDate: z.coerce.date({
    error: "Data effetto obbligatoria",
  }),
  notes: z
    .string()
    .max(500, { error: "Le note non possono superare 500 caratteri" })
    .optional()
    .transform((val) => (val === "" ? undefined : val)),
});

// Explicit form values type to avoid Zod input/output type mismatches
type FormValues = {
  newPlateNumber: string;
  effectiveDate: Date;
  notes: string | undefined;
};

type ReplatDialogProps = {
  vehicleId: number;
  currentPlate: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ReplatDialog({
  vehicleId,
  currentPlate,
  open,
  onOpenChange,
}: ReplatDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm<FormValues>({
    resolver: zodResolver(replatFormSchema) as Resolver<FormValues>,
    defaultValues: {
      newPlateNumber: "",
      effectiveDate: new Date(),
      notes: "",
    },
    mode: "onBlur",
  });

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      form.reset({
        newPlateNumber: "",
        effectiveDate: new Date(),
        notes: "",
      });
    }
  }, [open, form]);

  function handleSubmit(values: FormValues) {
    startTransition(async () => {
      try {
        const result = await replatVehicleAction({
          vehicleId,
          newPlateNumber: values.newPlateNumber,
          effectiveDate: values.effectiveDate,
          notes: values.notes,
        });

        if (result.success) {
          toast.success(
            `Ritargatura completata: ${result.data.newPlate}`
          );
          onOpenChange(false);
          router.refresh();
        } else {
          toast.error(result.error);
        }
      } catch {
        toast.error("Errore nella ritargatura del veicolo");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Ritargatura Veicolo</DialogTitle>
          <DialogDescription>
            Targa corrente:{" "}
            <span className="font-mono font-bold uppercase">
              {currentPlate}
            </span>
            . Inserisci la nuova targa e la data di effetto.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            {/* Nuova targa */}
            <FormField
              control={form.control}
              name="newPlateNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nuova targa *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="ES. AB123CD"
                      className="font-mono uppercase tracking-wider"
                      {...field}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value.toUpperCase().replace(/\s/g, "")
                        )
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Data effetto */}
            <FormField
              control={form.control}
              name="effectiveDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data effetto *</FormLabel>
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
                            : "Seleziona data"}
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
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Note */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Note</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Motivo della ritargatura, riferimenti..."
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
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
                Annulla
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Ritargatura..." : "Conferma Ritargatura"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
