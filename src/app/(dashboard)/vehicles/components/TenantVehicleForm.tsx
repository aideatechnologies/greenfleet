"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { createTenantVehicleSchema } from "@/lib/schemas/tenant-vehicle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { VehicleStatus, VEHICLE_STATUS_LABELS } from "@/types/vehicle";
import { createTenantVehicleAction } from "../actions/create-tenant-vehicle";
import { getActiveEmployeesAction } from "../actions/get-active-employees";
import type { Employee } from "@/generated/prisma/client";

// Explicit form values type to avoid Zod input/output type mismatches
type FormValues = {
  catalogVehicleId: string;
  licensePlate: string;
  registrationDate: Date;
  status: string;
  assignedEmployeeId: string | undefined;
  notes: string | undefined;
};

type TenantVehicleFormProps = {
  catalogVehicleId: string;
};

export function TenantVehicleForm({
  catalogVehicleId,
}: TenantVehicleFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [employeeOpen, setEmployeeOpen] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(createTenantVehicleSchema) as Resolver<FormValues>,
    defaultValues: {
      catalogVehicleId,
      licensePlate: "",
      registrationDate: undefined as unknown as Date,
      status: "ACTIVE",
      assignedEmployeeId: undefined,
      notes: "",
    },
    mode: "onBlur",
  });

  // Sync catalogVehicleId prop changes into the form
  useEffect(() => {
    form.setValue("catalogVehicleId", catalogVehicleId);
  }, [catalogVehicleId, form]);

  // Load active employees for the dropdown
  useEffect(() => {
    async function loadEmployees() {
      const result = await getActiveEmployeesAction();
      if (result.success) {
        setEmployees(result.data);
      }
    }
    loadEmployees();
  }, []);

  function handleSubmit(values: FormValues) {
    startTransition(async () => {
      try {
        const result = await createTenantVehicleAction(values);
        if (result.success) {
          toast.success("Veicolo aggiunto con successo");
          router.push("/vehicles");
          router.refresh();
        } else {
          toast.error(result.error);
        }
      } catch {
        toast.error("Errore nell'aggiunta del veicolo");
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
    (e) => e.id === form.watch("assignedEmployeeId")
  );

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="space-y-6 max-w-2xl"
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Targa */}
          <FormField
            control={form.control}
            name="licensePlate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Targa *</FormLabel>
                <FormControl>
                  <Input
                    placeholder="AA123BB"
                    {...field}
                    onChange={(e) =>
                      field.onChange(e.target.value.toUpperCase())
                    }
                    className="font-mono uppercase tracking-wider"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Data immatricolazione */}
          <FormField
            control={form.control}
            name="registrationDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Data immatricolazione *</FormLabel>
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
                      disabled={(date) => date > new Date()}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Stato */}
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Stato</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona stato" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.values(VehicleStatus).map((status) => (
                      <SelectItem key={status} value={status}>
                        {VEHICLE_STATUS_LABELS[status]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Dipendente assegnato */}
          <FormField
            control={form.control}
            name="assignedEmployeeId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Dipendente assegnato</FormLabel>
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
                      >
                        {selectedEmployee
                          ? `${selectedEmployee.firstName} ${selectedEmployee.lastName}`
                          : "Seleziona dipendente"}
                        <span className="ml-2 shrink-0 opacity-50">
                          {employeeOpen ? "\u25B2" : "\u25BC"}
                        </span>
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                    <Command>
                      <CommandInput
                        placeholder="Cerca dipendente..."
                        value={employeeSearch}
                        onValueChange={setEmployeeSearch}
                      />
                      <CommandList>
                        <CommandEmpty>Nessun dipendente trovato</CommandEmpty>
                        <CommandGroup>
                          <CommandItem
                            value="__none__"
                            onSelect={() => {
                              field.onChange(undefined);
                              setEmployeeOpen(false);
                            }}
                          >
                            <span className="text-muted-foreground">
                              Nessun assegnatario
                            </span>
                          </CommandItem>
                          {filteredEmployees.map((emp) => (
                            <CommandItem
                              key={emp.id}
                              value={`${emp.firstName} ${emp.lastName}`}
                              onSelect={() => {
                                field.onChange(emp.id);
                                setEmployeeOpen(false);
                              }}
                            >
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

          {/* Note */}
          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>Note</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Note aggiuntive sul veicolo..."
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex gap-3">
          <Button type="submit" disabled={isPending}>
            {isPending ? "Salvataggio..." : "Aggiungi veicolo"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isPending}
          >
            Annulla
          </Button>
        </div>
      </form>
    </Form>
  );
}
