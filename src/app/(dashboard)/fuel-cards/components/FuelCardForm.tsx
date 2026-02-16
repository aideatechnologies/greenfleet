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
  createFuelCardSchema,
  type CreateFuelCardInput,
} from "@/lib/schemas/fuel-card";
import {
  FuelCardStatus,
  FUEL_CARD_STATUS_LABELS,
  FuelCardAssignmentType,
  FUEL_CARD_ASSIGNMENT_TYPE_LABELS,
} from "@/types/fuel-card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
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
import {
  SupplierSelector,
  type SupplierOptionItem,
} from "@/components/forms/SupplierSelector";
import {
  VehicleSelector,
  type VehicleOptionItem,
} from "@/components/forms/VehicleSelector";
import {
  EmployeeSelector,
  type EmployeeOptionItem,
} from "@/components/forms/EmployeeSelector";
import { createFuelCardAction, updateFuelCardAction } from "../actions/fuel-card-actions";
import { getFuelCardOptionsAction } from "../actions/get-fuel-card-options";

type FuelCardFormProps = {
  mode: "create" | "edit";
  fuelCardId?: string;
  defaultValues?: CreateFuelCardInput;
};

export function FuelCardForm({ mode, fuelCardId, defaultValues }: FuelCardFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [suppliers, setSuppliers] = useState<SupplierOptionItem[]>([]);
  const [vehicles, setVehicles] = useState<VehicleOptionItem[]>([]);
  const [employees, setEmployees] = useState<EmployeeOptionItem[]>([]);

  const isEdit = mode === "edit";

  const form = useForm<CreateFuelCardInput>({
    resolver: zodResolver(createFuelCardSchema) as unknown as Resolver<CreateFuelCardInput>,
    defaultValues: defaultValues ?? {
      cardNumber: "",
      issuer: "",
      supplierId: "",
      expiryDate: undefined,
      status: "ACTIVE",
      assignmentType: "VEHICLE",
      assignedVehicleId: "",
      assignedEmployeeId: "",
      notes: "",
    },
    mode: "onBlur",
  });

  const assignmentType = form.watch("assignmentType");

  useEffect(() => {
    async function loadOptions() {
      const result = await getFuelCardOptionsAction();
      if (result.success) {
        setSuppliers(result.data.suppliers);
        setVehicles(result.data.vehicles);
        setEmployees(result.data.employees);
      }
    }
    loadOptions();
  }, []);

  function handleSubmit(values: CreateFuelCardInput) {
    startTransition(async () => {
      try {
        if (isEdit && fuelCardId) {
          const result = await updateFuelCardAction(fuelCardId, values);
          if (result.success) {
            toast.success("Carta carburante aggiornata con successo");
            router.push("/fuel-cards");
            router.refresh();
          } else {
            toast.error(result.error);
          }
        } else {
          const result = await createFuelCardAction(values);
          if (result.success) {
            toast.success("Carta carburante creata con successo");
            router.push("/fuel-cards");
            router.refresh();
          } else {
            toast.error(result.error);
          }
        }
      } catch {
        toast.error("Errore nel salvataggio della carta carburante");
      }
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 max-w-2xl">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="cardNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Numero Carta *</FormLabel>
                <FormControl>
                  <Input placeholder="1234 5678 9012" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="issuer"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Societa Emittente *</FormLabel>
                <FormControl>
                  <Input placeholder="Q8, ENI, IP..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="supplierId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fornitore Carburante</FormLabel>
                <FormControl>
                  <SupplierSelector
                    suppliers={suppliers}
                    defaultSupplierId={field.value}
                    onSelect={(id) => field.onChange(id)}
                    placeholder="Seleziona fornitore carburante"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="expiryDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Scadenza</FormLabel>
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
                          ? format(new Date(field.value), "dd MMMM yyyy", { locale: it })
                          : "Seleziona data"}
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value ? new Date(field.value) : undefined}
                      onSelect={(date) => field.onChange(date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Stato *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona stato" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.values(FuelCardStatus).map((s) => (
                      <SelectItem key={s} value={s}>
                        {FUEL_CARD_STATUS_LABELS[s]}
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
            name="assignmentType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo Assegnazione *</FormLabel>
                <Select
                  onValueChange={(val) => {
                    field.onChange(val);
                    // Reset conditional fields
                    if (val !== "VEHICLE") form.setValue("assignedVehicleId", "");
                    if (val !== "EMPLOYEE") form.setValue("assignedEmployeeId", "");
                  }}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona tipo" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.values(FuelCardAssignmentType).map((t) => (
                      <SelectItem key={t} value={t}>
                        {FUEL_CARD_ASSIGNMENT_TYPE_LABELS[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {assignmentType === "VEHICLE" && (
            <FormField
              control={form.control}
              name="assignedVehicleId"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Veicolo *</FormLabel>
                  <FormControl>
                    <VehicleSelector
                      vehicles={vehicles}
                      defaultVehicleId={field.value}
                      onSelect={(id) => field.onChange(id)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {assignmentType === "EMPLOYEE" && (
            <FormField
              control={form.control}
              name="assignedEmployeeId"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Dipendente *</FormLabel>
                  <FormControl>
                    <EmployeeSelector
                      employees={employees}
                      defaultEmployeeId={field.value}
                      onSelect={(id) => field.onChange(id)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>Note</FormLabel>
                <FormControl>
                  <Textarea placeholder="Note aggiuntive..." rows={3} {...field} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex gap-3">
          <Button type="submit" disabled={isPending}>
            {isPending ? "Salvataggio..." : isEdit ? "Aggiorna carta" : "Salva carta"}
          </Button>
          <Button type="button" variant="ghost" onClick={() => router.back()} disabled={isPending}>
            Annulla
          </Button>
        </div>
      </form>
    </Form>
  );
}
