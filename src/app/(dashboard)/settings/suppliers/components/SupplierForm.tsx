"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { SupplierType } from "@/generated/prisma/client";
import {
  createSupplierSchema,
  updateSupplierSchema,
} from "@/lib/schemas/supplier";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createSupplierAction, updateSupplierAction } from "../actions/supplier-actions";
import { getSupplierTypesAction } from "../actions/supplier-type-actions";

// ---------------------------------------------------------------------------
// Form values type (uses string for supplierTypeId; Zod coerces to number)
// ---------------------------------------------------------------------------

type SupplierFormValues = {
  supplierTypeId: string;
  name: string;
  vatNumber?: string;
  address?: string;
  pec?: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  notes?: string;
};

type SupplierFormProps = {
  mode: "create" | "edit";
  supplierId?: string;
  defaultValues?: SupplierFormValues;
};

export function SupplierForm({ mode, supplierId, defaultValues }: SupplierFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [supplierTypes, setSupplierTypes] = useState<SupplierType[]>([]);

  const isEdit = mode === "edit";
  const schema = isEdit ? updateSupplierSchema : createSupplierSchema;

  const form = useForm<SupplierFormValues>({
    resolver: zodResolver(schema) as unknown as Resolver<SupplierFormValues>,
    defaultValues: defaultValues ?? {
      supplierTypeId: "",
      name: "",
      vatNumber: "",
      address: "",
      pec: "",
      contactName: "",
      contactPhone: "",
      contactEmail: "",
      notes: "",
    },
    mode: "onBlur",
  });

  useEffect(() => {
    async function loadTypes() {
      const result = await getSupplierTypesAction();
      if (result.success) {
        setSupplierTypes(result.data.filter((t) => t.isActive));
      }
    }
    loadTypes();
  }, []);

  function handleSubmit(values: SupplierFormValues) {
    startTransition(async () => {
      try {
        if (isEdit && supplierId) {
          const result = await updateSupplierAction(Number(supplierId), values);
          if (result.success) {
            toast.success("Fornitore aggiornato con successo");
            router.push("/settings/suppliers");
            router.refresh();
          } else {
            toast.error(result.error);
          }
        } else {
          const result = await createSupplierAction(values);
          if (result.success) {
            toast.success("Fornitore creato con successo");
            router.push("/settings/suppliers");
            router.refresh();
          } else {
            toast.error(result.error);
          }
        }
      } catch {
        toast.error("Errore nel salvataggio del fornitore");
      }
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 max-w-2xl">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="supplierTypeId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo Fornitore *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona tipo" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {supplierTypes.map((type) => (
                      <SelectItem key={type.id} value={String(type.id)}>
                        {type.label}
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
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome *</FormLabel>
                <FormControl>
                  <Input placeholder="Ragione sociale" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="vatNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Partita IVA</FormLabel>
                <FormControl>
                  <Input placeholder="IT01234567890" {...field} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="pec"
            render={({ field }) => (
              <FormItem>
                <FormLabel>PEC</FormLabel>
                <FormControl>
                  <Input placeholder="pec@fornitore.it" {...field} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="address"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>Indirizzo</FormLabel>
                <FormControl>
                  <Input placeholder="Via, CAP, Citta" {...field} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="contactName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Referente</FormLabel>
                <FormControl>
                  <Input placeholder="Nome e cognome" {...field} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="contactPhone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Telefono</FormLabel>
                <FormControl>
                  <Input placeholder="+39 ..." {...field} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="contactEmail"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email Contatto</FormLabel>
                <FormControl>
                  <Input placeholder="email@fornitore.it" {...field} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

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
            {isPending ? "Salvataggio..." : isEdit ? "Aggiorna fornitore" : "Salva fornitore"}
          </Button>
          <Button type="button" variant="ghost" onClick={() => router.back()} disabled={isPending}>
            Annulla
          </Button>
        </div>
      </form>
    </Form>
  );
}
