"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";

import { contractSchema, updateContractSchema } from "@/lib/schemas/contract";
import type { ContractInput, UpdateContractInput } from "@/lib/schemas/contract";
import { CONTRACT_TYPE_LABELS, type ContractType } from "@/types/contract";
import { ErrorCode } from "@/types/action-result";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { cn } from "@/lib/utils";
import {
  VehicleSelector,
  type VehicleOptionItem,
} from "@/components/forms/VehicleSelector";
import {
  SupplierSelector,
  type SupplierOptionItem,
} from "@/components/forms/SupplierSelector";
import { getTenantVehiclesAction } from "../actions/get-tenant-vehicles";
import { getNltSuppliersAction } from "../actions/get-nlt-suppliers";
import { createContractAction } from "../actions/create-contract";
import { updateContractAction } from "../actions/update-contract";
import { SuccessionConfirmDialog } from "./SuccessionConfirmDialog";

// ---------------------------------------------------------------------------
// Form values type for React Hook Form (matches z.input)
// ---------------------------------------------------------------------------

type ProprietarioValues = {
  type: "PROPRIETARIO";
  vehicleId: string;
  contractNumber: string;
  contractKm?: number | null;
  notes?: string;
  purchaseDate: Date;
  purchasePrice: number;
  residualValue?: number;
};

type BreveTermineValues = {
  type: "BREVE_TERMINE";
  vehicleId: string;
  contractNumber: string;
  contractKm?: number | null;
  notes?: string;
  supplierId: string;
  startDate: Date;
  endDate: Date;
  dailyRate: number;
  includedKm?: number;
};

type LungoTermineValues = {
  type: "LUNGO_TERMINE";
  vehicleId: string;
  contractNumber: string;
  contractKm?: number | null;
  notes?: string;
  supplierId: string;
  startDate: Date;
  endDate: Date;
  monthlyRate: number;
  franchiseKm?: number;
  extraKmPenalty?: number;
  includedServices?: string;
};

type LeasingFinanziarioValues = {
  type: "LEASING_FINANZIARIO";
  vehicleId: string;
  contractNumber: string;
  contractKm?: number | null;
  notes?: string;
  supplierId: string;
  startDate: Date;
  endDate: Date;
  monthlyRate: number;
  buybackValue?: number;
  maxDiscount?: number;
};

type FormValues =
  | ProprietarioValues
  | BreveTermineValues
  | LungoTermineValues
  | LeasingFinanziarioValues;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type ContractFormProps = {
  contractType: ContractType;
  mode?: "create" | "edit";
  contractId?: string;
  defaultValues?: FormValues;
  defaultVehicleId?: string;
};

// ---------------------------------------------------------------------------
// Default values per type
// ---------------------------------------------------------------------------

function getDefaultValues(
  contractType: ContractType,
  defaults?: FormValues
): FormValues {
  if (defaults) return defaults;

  switch (contractType) {
    case "PROPRIETARIO":
      return {
        type: "PROPRIETARIO",
        vehicleId: "",
        contractNumber: "",
        contractKm: undefined,
        notes: "",
        purchaseDate: undefined as unknown as Date,
        purchasePrice: undefined as unknown as number,
        residualValue: undefined,
      };
    case "BREVE_TERMINE":
      return {
        type: "BREVE_TERMINE",
        vehicleId: "",
        contractNumber: "",
        contractKm: undefined,
        notes: "",
        supplierId: "",
        startDate: undefined as unknown as Date,
        endDate: undefined as unknown as Date,
        dailyRate: undefined as unknown as number,
        includedKm: undefined,
      };
    case "LUNGO_TERMINE":
      return {
        type: "LUNGO_TERMINE",
        vehicleId: "",
        contractNumber: "",
        contractKm: undefined,
        notes: "",
        supplierId: "",
        startDate: undefined as unknown as Date,
        endDate: undefined as unknown as Date,
        monthlyRate: undefined as unknown as number,
        franchiseKm: undefined,
        extraKmPenalty: undefined,
        includedServices: "",
      };
    case "LEASING_FINANZIARIO":
      return {
        type: "LEASING_FINANZIARIO",
        vehicleId: "",
        contractNumber: "",
        contractKm: undefined,
        notes: "",
        supplierId: "",
        startDate: undefined as unknown as Date,
        endDate: undefined as unknown as Date,
        monthlyRate: undefined as unknown as number,
        buybackValue: undefined,
        maxDiscount: undefined,
      };
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ContractForm({
  contractType,
  mode = "create",
  contractId,
  defaultValues: initialDefaults,
  defaultVehicleId,
}: ContractFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [vehicles, setVehicles] = useState<VehicleOptionItem[]>([]);
  const [nltSuppliers, setNltSuppliers] = useState<SupplierOptionItem[]>([]);
  const [successionDialogOpen, setSuccessionDialogOpen] = useState(false);
  const [successionInfo, setSuccessionInfo] = useState("");
  const [pendingValues, setPendingValues] = useState<FormValues | null>(null);

  const isEdit = mode === "edit";
  const schema = isEdit ? updateContractSchema : contractSchema;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema) as unknown as Resolver<FormValues>,
    defaultValues: getDefaultValues(contractType, initialDefaults),
    mode: "onBlur",
  });

  // Load vehicles and suppliers for selectors
  useEffect(() => {
    async function loadOptions() {
      const [vehiclesResult, suppliersResult] = await Promise.all([
        getTenantVehiclesAction(),
        getNltSuppliersAction(),
      ]);
      if (vehiclesResult.success) setVehicles(vehiclesResult.data);
      if (suppliersResult.success) setNltSuppliers(suppliersResult.data);
    }
    loadOptions();
  }, []);

  function handleSuccessionConfirm() {
    if (!pendingValues) return;
    startTransition(async () => {
      try {
        const result = await createContractAction(
          pendingValues as ContractInput,
          true
        );
        if (result.success) {
          toast.success("Contratto creato con successo. Il contratto precedente e stato chiuso.");
          setSuccessionDialogOpen(false);
          setPendingValues(null);
          router.push("/contracts");
          router.refresh();
        } else {
          toast.error(result.error);
        }
      } catch {
        toast.error("Errore nel salvataggio del contratto");
      }
    });
  }

  function handleSubmit(values: FormValues) {
    startTransition(async () => {
      try {
        if (isEdit && contractId) {
          const result = await updateContractAction(
            Number(contractId),
            values as UpdateContractInput
          );
          if (result.success) {
            toast.success("Contratto aggiornato con successo");
            router.push(`/contracts/${contractId}`);
            router.refresh();
          } else {
            toast.error(result.error);
          }
        } else {
          const result = await createContractAction(values as ContractInput);
          if (result.success) {
            toast.success("Contratto creato con successo");
            router.push("/contracts");
            router.refresh();
          } else if (
            !result.success &&
            result.code === ErrorCode.CONFLICT
          ) {
            // Vehicle has an active contract — show confirmation dialog
            setPendingValues(values);
            setSuccessionInfo(result.error);
            setSuccessionDialogOpen(true);
          } else {
            toast.error(result.error);
          }
        }
      } catch {
        toast.error("Errore nel salvataggio del contratto");
      }
    });
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="space-y-6 max-w-2xl"
      >
        {/* Contract type badge (read-only) */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">
            Tipo contratto:
          </span>
          <Badge variant="secondary">
            {CONTRACT_TYPE_LABELS[contractType]}
          </Badge>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Vehicle selector (only in create mode) */}
          {!isEdit && (
            <FormField
              control={form.control}
              name="vehicleId"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Veicolo *</FormLabel>
                  <FormControl>
                    <VehicleSelector
                      vehicles={vehicles}
                      defaultVehicleId={defaultVehicleId ?? field.value}
                      onSelect={(id) => field.onChange(id)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {/* Numero contratto (obbligatorio) */}
          <FormField
            control={form.control}
            name="contractNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Numero Contratto *</FormLabel>
                <FormControl>
                  <Input placeholder="N. contratto" {...field} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Km contratto (shared across all types) */}
          <NumberField
            form={form}
            name="contractKm"
            label="Km contratto"
            unit="km"
          />

          {/* Type-specific fields */}
          {contractType === "PROPRIETARIO" && (
            <ProprietarioFields form={form} />
          )}
          {contractType === "BREVE_TERMINE" && (
            <BreveTermineFields form={form} suppliers={nltSuppliers} />
          )}
          {contractType === "LUNGO_TERMINE" && (
            <LungoTermineFields form={form} suppliers={nltSuppliers} />
          )}
          {contractType === "LEASING_FINANZIARIO" && (
            <LeasingFinanziarioFields form={form} suppliers={nltSuppliers} />
          )}

          {/* Notes (all types) */}
          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>Note</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Note aggiuntive sul contratto..."
                    rows={3}
                    {...field}
                    value={field.value ?? ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex gap-3">
          <Button type="submit" disabled={isPending}>
            {isPending
              ? "Salvataggio..."
              : isEdit
                ? "Aggiorna contratto"
                : "Salva contratto"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.back()}
            disabled={isPending}
          >
            Annulla
          </Button>
        </div>
      </form>

      <SuccessionConfirmDialog
        open={successionDialogOpen}
        onOpenChange={setSuccessionDialogOpen}
        activeContractInfo={successionInfo}
        onConfirm={handleSuccessionConfirm}
        isPending={isPending}
      />
    </Form>
  );
}

// ---------------------------------------------------------------------------
// Date Picker helper
// ---------------------------------------------------------------------------

function DatePickerField({
  form,
  name,
  label,
  required = false,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: any;
  name: string;
  label: string;
  required?: boolean;
}) {
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>
            {label}
            {required && " *"}
          </FormLabel>
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
  );
}

// ---------------------------------------------------------------------------
// Currency input helper
// ---------------------------------------------------------------------------

function CurrencyField({
  form,
  name,
  label,
  required = false,
  description,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: any;
  name: string;
  label: string;
  required?: boolean;
  description?: string;
}) {
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>
            {label}
            {required && " *"}
          </FormLabel>
          <FormControl>
            <div className="relative">
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                {...field}
                value={field.value ?? ""}
                onChange={(e) => {
                  const val = e.target.value;
                  field.onChange(val === "" ? undefined : parseFloat(val));
                }}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                EUR
              </span>
            </div>
          </FormControl>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

// ---------------------------------------------------------------------------
// Number input helper
// ---------------------------------------------------------------------------

function NumberField({
  form,
  name,
  label,
  required = false,
  unit,
  step = "1",
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: any;
  name: string;
  label: string;
  required?: boolean;
  unit?: string;
  step?: string;
}) {
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>
            {label}
            {required && " *"}
          </FormLabel>
          <FormControl>
            <div className="relative">
              <Input
                type="number"
                step={step}
                min="0"
                placeholder="0"
                {...field}
                value={field.value ?? ""}
                onChange={(e) => {
                  const val = e.target.value;
                  field.onChange(
                    val === ""
                      ? undefined
                      : step === "1"
                        ? parseInt(val, 10)
                        : parseFloat(val)
                  );
                }}
              />
              {unit && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  {unit}
                </span>
              )}
            </div>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

// ---------------------------------------------------------------------------
// Proprietario fields
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ProprietarioFields({ form }: { form: any }) {
  return (
    <>
      <DatePickerField
        form={form}
        name="purchaseDate"
        label="Data acquisto"
        required
      />
      <CurrencyField
        form={form}
        name="purchasePrice"
        label="Prezzo di acquisto"
        required
      />
      <CurrencyField
        form={form}
        name="residualValue"
        label="Valore residuo"
        description="Valore stimato alla fine del ciclo di vita"
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// Breve Termine fields
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function BreveTermineFields({ form, suppliers }: { form: any; suppliers: SupplierOptionItem[] }) {
  return (
    <>
      <FormField
        control={form.control}
        name="supplierId"
        render={({ field }) => (
          <FormItem className="sm:col-span-2">
            <FormLabel>Fornitore *</FormLabel>
            <FormControl>
              <SupplierSelector
                suppliers={suppliers}
                defaultSupplierId={field.value}
                onSelect={(id) => field.onChange(id)}
                placeholder="Seleziona fornitore noleggio"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <DatePickerField
        form={form}
        name="startDate"
        label="Data inizio"
        required
      />
      <DatePickerField
        form={form}
        name="endDate"
        label="Data fine"
        required
      />
      <CurrencyField
        form={form}
        name="dailyRate"
        label="Canone giornaliero"
        required
      />
      <NumberField
        form={form}
        name="includedKm"
        label="Km inclusi"
        unit="km"
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// Lungo Termine fields
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function LungoTermineFields({ form, suppliers }: { form: any; suppliers: SupplierOptionItem[] }) {
  return (
    <>
      <FormField
        control={form.control}
        name="supplierId"
        render={({ field }) => (
          <FormItem className="sm:col-span-2">
            <FormLabel>Fornitore *</FormLabel>
            <FormControl>
              <SupplierSelector
                suppliers={suppliers}
                defaultSupplierId={field.value}
                onSelect={(id) => field.onChange(id)}
                placeholder="Seleziona fornitore noleggio"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <DatePickerField
        form={form}
        name="startDate"
        label="Data inizio"
        required
      />
      <DatePickerField
        form={form}
        name="endDate"
        label="Data fine"
        required
      />
      <CurrencyField
        form={form}
        name="monthlyRate"
        label="Canone mensile"
        required
      />
      <NumberField
        form={form}
        name="franchiseKm"
        label="Km in franchigia"
        unit="km"
      />
      <CurrencyField
        form={form}
        name="extraKmPenalty"
        label="Penale extra km"
        description="Costo per km oltre la franchigia"
      />
      <FormField
        control={form.control}
        name="includedServices"
        render={({ field }) => (
          <FormItem className="sm:col-span-2">
            <FormLabel>Servizi inclusi</FormLabel>
            <FormControl>
              <Textarea
                placeholder="Manutenzione, assicurazione, soccorso stradale..."
                rows={2}
                {...field}
                value={field.value ?? ""}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// Leasing Finanziario fields
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function LeasingFinanziarioFields({ form, suppliers }: { form: any; suppliers: SupplierOptionItem[] }) {
  return (
    <>
      <FormField
        control={form.control}
        name="supplierId"
        render={({ field }) => (
          <FormItem className="sm:col-span-2">
            <FormLabel>Societa di leasing *</FormLabel>
            <FormControl>
              <SupplierSelector
                suppliers={suppliers}
                defaultSupplierId={field.value}
                onSelect={(id) => field.onChange(id)}
                placeholder="Seleziona societa di leasing"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <DatePickerField
        form={form}
        name="startDate"
        label="Data inizio"
        required
      />
      <DatePickerField
        form={form}
        name="endDate"
        label="Data fine"
        required
      />
      <CurrencyField
        form={form}
        name="monthlyRate"
        label="Canone mensile"
        required
      />
      <CurrencyField
        form={form}
        name="buybackValue"
        label="Valore di riscatto"
        description="Importo per il riscatto a fine contratto"
      />
      <CurrencyField
        form={form}
        name="maxDiscount"
        label="Sconto massimo"
      />
    </>
  );
}
