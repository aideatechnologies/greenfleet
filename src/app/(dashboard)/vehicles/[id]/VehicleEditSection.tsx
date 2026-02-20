"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { CalendarIcon, Pencil } from "lucide-react";
import { z } from "zod";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { VehicleStatus, VEHICLE_STATUS_LABELS } from "@/types/vehicle";
import { VEHICLE_STATUS_VALUES } from "@/types/vehicle";
import { UNCATALOGED_VEHICLE_ID } from "@/lib/utils/constants";
import { updateTenantVehicleAction } from "../actions/update-tenant-vehicle";
import { getActiveEmployeesAction } from "../actions/get-active-employees";
import { CatalogVehicleSelector } from "../components/CatalogVehicleSelector";
import type { TenantVehicleWithDetails } from "@/lib/services/tenant-vehicle-service";
import type { CatalogVehicleWithEngines } from "@/lib/services/catalog-service";
import type { Employee } from "@/generated/prisma/client";

// Zod schema for validation
const editFormSchema = z.object({
  licensePlate: z
    .string()
    .min(2, { error: "La targa deve avere almeno 2 caratteri" })
    .max(10, { error: "La targa non puo superare 10 caratteri" })
    .transform((val) => val.trim().toUpperCase()),
  registrationDate: z.coerce.date({
    error: "Data di immatricolazione non valida",
  }),
  status: z.enum(VEHICLE_STATUS_VALUES as unknown as [string, ...string[]], {
    error: "Stato non valido",
  }),
  assignedEmployeeId: z
    .coerce.number({ error: "L'assegnatario è obbligatorio" }),
  notes: z
    .string()
    .max(500, { error: "Le note non possono superare 500 caratteri" })
    .nullable()
    .optional()
    .transform((val) => (val === "" ? null : val)),
});

// Explicit form values type to avoid Zod input/output type mismatches
type FormValues = {
  licensePlate: string;
  registrationDate: Date;
  status: string;
  assignedEmployeeId: number;
  notes: string | null | undefined;
};

type VehicleEditSectionProps = {
  vehicle: TenantVehicleWithDetails;
  canEdit: boolean;
};

export function VehicleEditSection({
  vehicle,
  canEdit,
}: VehicleEditSectionProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isEditing, setIsEditing] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [employeeOpen, setEmployeeOpen] = useState(false);

  const isUncataloged = Number(vehicle.catalogVehicleId) === UNCATALOGED_VEHICLE_ID;

  function handleAssociateCatalog(catalogVehicle: CatalogVehicleWithEngines) {
    startTransition(async () => {
      try {
        const result = await updateTenantVehicleAction({
          id: vehicle.id,
          catalogVehicleId: catalogVehicle.id,
        });
        if (result.success) {
          toast.success("Modello da catalogo associato con successo");
          router.refresh();
        } else {
          toast.error(result.error);
        }
      } catch {
        toast.error("Errore nell'associazione del modello");
      }
    });
  }

  const form = useForm<FormValues>({
    resolver: zodResolver(editFormSchema) as unknown as Resolver<FormValues>,
    defaultValues: {
      licensePlate: vehicle.licensePlate,
      registrationDate: new Date(vehicle.registrationDate),
      status: vehicle.status,
      assignedEmployeeId: vehicle.assignedEmployeeId != null ? Number(vehicle.assignedEmployeeId) : undefined as unknown as number,
      notes: vehicle.notes ?? "",
    } as FormValues,
    mode: "onBlur",
  });

  // Load employees when editing starts
  useEffect(() => {
    if (isEditing && employees.length === 0) {
      async function loadEmployees() {
        const result = await getActiveEmployeesAction();
        if (result.success) {
          setEmployees(result.data);
        }
      }
      loadEmployees();
    }
  }, [isEditing, employees.length]);

  function handleSubmit(values: FormValues) {
    startTransition(async () => {
      try {
        const result = await updateTenantVehicleAction({
          id: vehicle.id,
          ...values,
        });
        if (result.success) {
          toast.success("Veicolo aggiornato con successo");
          setIsEditing(false);
          router.refresh();
        } else {
          toast.error(result.error);
        }
      } catch {
        toast.error("Errore nell'aggiornamento del veicolo");
      }
    });
  }

  function handleCancel() {
    form.reset({
      licensePlate: vehicle.licensePlate,
      registrationDate: new Date(vehicle.registrationDate),
      status: vehicle.status,
      assignedEmployeeId: vehicle.assignedEmployeeId != null ? Number(vehicle.assignedEmployeeId) : undefined as unknown as number,
      notes: vehicle.notes ?? "",
    } as FormValues);
    setIsEditing(false);
  }

  const filteredEmployees = employees.filter((emp) => {
    if (!employeeSearch) return true;
    const term = employeeSearch.toLowerCase();
    return (
      emp.firstName.toLowerCase().includes(term) ||
      emp.lastName.toLowerCase().includes(term)
    );
  });

  const selectedEmployee =
    employees.find((e) => Number(e.id) === form.watch("assignedEmployeeId")) ??
    vehicle.assignedEmployee;

  // Read-only view
  if (!isEditing) {
    return (
      <>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Dati operativi</CardTitle>
              {canEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  Modifica
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <dt className="text-muted-foreground">Targa</dt>
              <dd className="font-mono font-medium uppercase tracking-wider">
                {vehicle.licensePlate}
              </dd>
              <dt className="text-muted-foreground">Data immatricolazione</dt>
              <dd className="font-medium">
                {format(new Date(vehicle.registrationDate), "dd MMMM yyyy", {
                  locale: it,
                })}
              </dd>
              <dt className="text-muted-foreground">Stato</dt>
              <dd>
                {VEHICLE_STATUS_LABELS[vehicle.status as VehicleStatus] ??
                  vehicle.status}
              </dd>
              <dt className="text-muted-foreground">Dipendente assegnato</dt>
              <dd className="font-medium">
                {vehicle.assignedEmployee
                  ? `${vehicle.assignedEmployee.firstName} ${vehicle.assignedEmployee.lastName}`
                  : "-"}
              </dd>
              <dt className="text-muted-foreground">Note</dt>
              <dd className="font-medium">{vehicle.notes ?? "-"}</dd>
              <dt className="text-muted-foreground">Data inserimento</dt>
              <dd className="font-medium">
                {format(new Date(vehicle.createdAt), "dd MMMM yyyy", {
                  locale: it,
                })}
              </dd>
            </dl>
          </CardContent>
        </Card>

        {/* Catalog association for uncataloged vehicles */}
        {isUncataloged && canEdit && (
          <Card>
            <CardHeader>
              <CardTitle>Associa modello da catalogo</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-sm text-muted-foreground">
                Questo veicolo non ha un modello da catalogo associato. Cerca e
                seleziona un modello per aggiungere dati tecnici e motorizzazioni.
              </p>
              <CatalogVehicleSelector
                onSelect={handleAssociateCatalog}
                selectedVehicle={null}
                onClear={() => {}}
              />
            </CardContent>
          </Card>
        )}
      </>
    );
  }

  // Edit mode
  return (
    <Card>
      <CardHeader>
        <CardTitle>Dati operativi</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            {/* Targa */}
            <FormField
              control={form.control}
              name="licensePlate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Targa *</FormLabel>
                  <FormControl>
                    <Input
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
                  <FormLabel>Stato *</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
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
                  <FormLabel>Dipendente assegnato *</FormLabel>
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
                <FormItem>
                  <FormLabel>Note</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Note aggiuntive..."
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={isPending}>
                {isPending ? "Salvataggio..." : "Salva modifiche"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={isPending}
              >
                Annulla
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
