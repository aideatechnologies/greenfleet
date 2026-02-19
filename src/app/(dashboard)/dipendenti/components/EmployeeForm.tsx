"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  createEmployeeSchema,
  type CreateEmployeeInput,
} from "@/lib/schemas/employee";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { createEmployeeAction } from "../actions/create-employee";
import { updateEmployeeAction } from "../actions/update-employee";
import { getCarlistsAction } from "../actions/get-carlists";

type EmployeeFormProps =
  | {
      mode: "create";
    }
  | {
      mode: "edit";
      employeeId: string;
      defaultValues: CreateEmployeeInput;
    };

type CarlistOption = { id: string; name: string };

export function EmployeeForm(props: EmployeeFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [carlists, setCarlists] = useState<CarlistOption[]>([]);
  const isEdit = props.mode === "edit";

  useEffect(() => {
    async function loadCarlists() {
      const result = await getCarlistsAction();
      if (result.success) {
        setCarlists(result.data);
      }
    }
    loadCarlists();
  }, []);

  const form = useForm<CreateEmployeeInput>({
    resolver: zodResolver(createEmployeeSchema) as unknown as Resolver<CreateEmployeeInput>,
    defaultValues: isEdit
      ? props.defaultValues
      : {
          firstName: "",
          lastName: "",
          email: "",
          phone: "",
          fiscalCode: "",
          matricola: "",
          avgMonthlyKm: undefined,
          carlistId: undefined,
        },
    mode: "onBlur",
  });

  function handleSubmit(values: CreateEmployeeInput) {
    startTransition(async () => {
      try {
        const result = isEdit
          ? await updateEmployeeAction({ ...values, id: props.employeeId })
          : await createEmployeeAction(values);

        if (result.success) {
          toast.success(
            isEdit
              ? "Dipendente aggiornato con successo"
              : "Dipendente creato con successo"
          );
          if (isEdit) {
            router.push(`/dipendenti/${props.employeeId}`);
          } else {
            router.push("/dipendenti");
          }
          router.refresh();
        } else {
          toast.error(result.error);
        }
      } catch {
        toast.error(
          isEdit
            ? "Errore nell'aggiornamento del dipendente"
            : "Errore nella creazione del dipendente"
        );
      }
    });
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="space-y-6 max-w-2xl"
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome *</FormLabel>
                <FormControl>
                  <Input placeholder="Mario" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="lastName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cognome *</FormLabel>
                <FormControl>
                  <Input placeholder="Rossi" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="mario.rossi@azienda.it"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Telefono</FormLabel>
                <FormControl>
                  <Input
                    type="tel"
                    placeholder="+39 333 1234567"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="fiscalCode"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>Codice Fiscale</FormLabel>
                <FormControl>
                  <Input
                    placeholder="RSSMRA85M01H501Z"
                    {...field}
                    onChange={(e) =>
                      field.onChange(e.target.value.toUpperCase())
                    }
                    className="font-mono uppercase"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="matricola"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Matricola</FormLabel>
                <FormControl>
                  <Input
                    placeholder="MAT-001"
                    {...field}
                    value={field.value ?? ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="avgMonthlyKm"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Km medi mensili</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      type="number"
                      step="1"
                      min="0"
                      placeholder="0"
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        field.onChange(
                          val === "" ? undefined : parseInt(val, 10)
                        );
                      }}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      km
                    </span>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {carlists.length > 0 && (
            <FormField
              control={form.control}
              name="carlistId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Parco Auto (Carlist)</FormLabel>
                  <Select
                    onValueChange={(val) =>
                      field.onChange(val === "__none__" ? undefined : val)
                    }
                    value={field.value != null ? String(field.value) : "__none__"}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Nessun parco auto" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="__none__">Nessun parco auto</SelectItem>
                      {carlists.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>

        <div className="flex gap-3">
          <Button type="submit" disabled={isPending}>
            {isPending
              ? isEdit
                ? "Salvataggio..."
                : "Creazione..."
              : isEdit
                ? "Salva modifiche"
                : "Crea dipendente"}
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
