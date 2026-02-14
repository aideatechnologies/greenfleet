"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createTenantSchema,
  updateTenantSchema,
  type CreateTenantInput,
  type UpdateTenantInput,
} from "@/lib/schemas/tenant";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

type TenantFormProps =
  | {
      mode: "create";
      onSubmit: (data: FormData) => Promise<void>;
      isLoading: boolean;
    }
  | {
      mode: "edit";
      defaultValues: { name: string; slug: string };
      onSubmit: (data: FormData) => Promise<void>;
      isLoading: boolean;
    };

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}

export function TenantForm(props: TenantFormProps) {
  const isEdit = props.mode === "edit";

  const form = useForm<CreateTenantInput | UpdateTenantInput>({
    resolver: zodResolver(isEdit ? updateTenantSchema : createTenantSchema),
    defaultValues: isEdit
      ? props.defaultValues
      : { name: "", slug: "" },
  });

  async function handleSubmit(values: CreateTenantInput | UpdateTenantInput) {
    const formData = new FormData();
    if (values.name) formData.set("name", values.name);
    if (values.slug) formData.set("slug", values.slug);
    await props.onSubmit(formData);
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="space-y-4 max-w-md"
      >
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome società</FormLabel>
              <FormControl>
                <Input
                  placeholder="Acme S.r.l."
                  {...field}
                  onChange={(e) => {
                    field.onChange(e);
                    if (!isEdit && !form.getValues("slug")) {
                      form.setValue("slug", slugify(e.target.value));
                    }
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="slug"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Slug (identificativo URL)</FormLabel>
              <FormControl>
                <Input placeholder="acme-srl" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex gap-2">
          <Button type="submit" disabled={props.isLoading}>
            {props.isLoading
              ? isEdit
                ? "Salvataggio..."
                : "Creazione..."
              : isEdit
                ? "Salva modifiche"
                : "Crea società"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
