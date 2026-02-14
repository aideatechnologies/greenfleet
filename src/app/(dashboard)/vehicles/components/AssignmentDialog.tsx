"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { CalendarIcon, Check, ChevronsUpDown, Users } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
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
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { cn } from "@/lib/utils";
import { assignVehicleAction } from "../actions/assign-vehicle";
import { getActiveEmployeesAction } from "../actions/get-active-employees";
import type { Employee } from "@/generated/prisma/client";

// Form-specific schema (vehicleId is passed as prop)
const assignFormSchema = z.object({
  employeeId: z
    .string()
    .min(1, { error: "Seleziona un dipendente" }),
  startDate: z.coerce.date({
    error: "Data di inizio assegnazione non valida",
  }),
  notes: z
    .string()
    .max(500, { error: "Le note non possono superare 500 caratteri" })
    .optional()
    .transform((val) => (val === "" ? undefined : val)),
});

// Explicit form values type to avoid Zod input/output type mismatches
type FormValues = {
  employeeId: string;
  startDate: Date;
  notes: string | undefined;
};

type AssignmentDialogProps = {
  vehicleId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function AssignmentDialog({
  vehicleId,
  open,
  onOpenChange,
}: AssignmentDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [employeeOpen, setEmployeeOpen] = useState(false);
  const [loadingEmployees, setLoadingEmployees] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(assignFormSchema) as Resolver<FormValues>,
    defaultValues: {
      employeeId: "",
      startDate: new Date(),
      notes: "",
    },
    mode: "onBlur",
  });

  // Load employees when dialog opens
  useEffect(() => {
    if (open && employees.length === 0) {
      setLoadingEmployees(true);
      async function loadEmployees() {
        const result = await getActiveEmployeesAction();
        if (result.success) {
          setEmployees(result.data);
        } else {
          toast.error("Errore nel caricamento dei dipendenti");
        }
        setLoadingEmployees(false);
      }
      loadEmployees();
    }
  }, [open, employees.length]);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      form.reset({
        employeeId: "",
        startDate: new Date(),
        notes: "",
      });
      setEmployeeSearch("");
    }
  }, [open, form]);

  function handleSubmit(values: FormValues) {
    startTransition(async () => {
      try {
        const result = await assignVehicleAction({
          vehicleId,
          employeeId: values.employeeId,
          startDate: values.startDate,
          notes: values.notes,
        });

        if (result.success) {
          toast.success("Dipendente assegnato con successo");
          onOpenChange(false);
          router.refresh();
        } else {
          toast.error(result.error);
        }
      } catch {
        toast.error("Errore nell'assegnazione del dipendente");
      }
    });
  }

  const filteredEmployees = employees.filter((emp) => {
    if (!employeeSearch) return true;
    const term = employeeSearch.toLowerCase();
    return (
      emp.firstName.toLowerCase().includes(term) ||
      emp.lastName.toLowerCase().includes(term)
    );
  });

  const selectedEmployee = employees.find(
    (e) => e.id === form.watch("employeeId")
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Assegna Dipendente</DialogTitle>
          <DialogDescription>
            Seleziona il dipendente da assegnare a questo veicolo e la data di
            inizio assegnazione.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            {/* Dipendente */}
            <FormField
              control={form.control}
              name="employeeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dipendente *</FormLabel>
                  <Popover open={employeeOpen} onOpenChange={setEmployeeOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={employeeOpen}
                          className={cn(
                            "w-full justify-between font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                          disabled={loadingEmployees}
                        >
                          {loadingEmployees
                            ? "Caricamento..."
                            : selectedEmployee
                              ? selectedEmployee.isPool
                                ? "Pool (Veicoli Condivisi)"
                                : `${selectedEmployee.firstName} ${selectedEmployee.lastName}`
                              : "Seleziona dipendente"}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent
                      className="w-[--radix-popover-trigger-width] p-0"
                      align="start"
                    >
                      <Command>
                        <CommandInput
                          placeholder="Cerca dipendente..."
                          value={employeeSearch}
                          onValueChange={setEmployeeSearch}
                        />
                        <CommandList>
                          <CommandEmpty>
                            Nessun dipendente trovato
                          </CommandEmpty>
                          <CommandGroup>
                            {/* Pool option first */}
                            {filteredEmployees
                              .filter((emp) => emp.isPool)
                              .map((emp) => (
                                <CommandItem
                                  key={emp.id}
                                  value="Pool Veicoli Condivisi"
                                  onSelect={() => {
                                    field.onChange(emp.id);
                                    setEmployeeOpen(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      field.value === emp.id
                                        ? "opacity-100"
                                        : "opacity-0"
                                    )}
                                  />
                                  <Users className="mr-2 h-4 w-4 text-indigo-500" />
                                  <span className="font-medium text-indigo-700">
                                    Pool (Veicoli Condivisi)
                                  </span>
                                </CommandItem>
                              ))}
                            {/* Separator if pool exists */}
                            {filteredEmployees.some((emp) => emp.isPool) && (
                              <div className="mx-2 my-1 border-t" />
                            )}
                            {/* Regular employees */}
                            {filteredEmployees
                              .filter((emp) => !emp.isPool)
                              .map((emp) => (
                                <CommandItem
                                  key={emp.id}
                                  value={`${emp.firstName} ${emp.lastName}`}
                                  onSelect={() => {
                                    field.onChange(emp.id);
                                    setEmployeeOpen(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      field.value === emp.id
                                        ? "opacity-100"
                                        : "opacity-0"
                                    )}
                                  />
                                  {emp.firstName} {emp.lastName}
                                </CommandItem>
                              ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Data inizio */}
            <FormField
              control={form.control}
              name="startDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data inizio assegnazione *</FormLabel>
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
                    <Input
                      placeholder="Note aggiuntive sull'assegnazione..."
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
                {isPending ? "Assegnazione..." : "Assegna"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
