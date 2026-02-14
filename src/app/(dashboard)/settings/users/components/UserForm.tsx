"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff } from "lucide-react";
import {
  createUserSchema,
  updateUserSchema,
  type CreateUserInput,
  type UpdateUserInput,
} from "@/lib/schemas/user";
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

type TenantOption = { id: string; name: string };

type UserFormProps =
  | {
      mode: "create";
      tenantId: string;
      tenants: TenantOption[];
      canAssignAdmin: boolean;
      onSubmit: (data: FormData) => Promise<void>;
      isLoading: boolean;
    }
  | {
      mode: "edit";
      canAssignAdmin: boolean;
      defaultValues: { name: string; email: string; role: "admin" | "member" };
      onSubmit: (data: FormData) => Promise<void>;
      isLoading: boolean;
    };

export function UserForm(props: UserFormProps) {
  const isEdit = props.mode === "edit";
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<CreateUserInput | UpdateUserInput>({
    resolver: zodResolver(isEdit ? updateUserSchema : createUserSchema),
    defaultValues: isEdit
      ? props.defaultValues
      : { name: "", email: "", password: "", role: "member", tenantId: props.tenantId },
  });

  async function handleSubmit(values: CreateUserInput | UpdateUserInput) {
    const formData = new FormData();
    if (values.name) formData.set("name", values.name);
    if (values.email) formData.set("email", values.email);
    if (values.role) formData.set("role", values.role);
    if ("password" in values && values.password) {
      formData.set("password", values.password);
    }
    if ("tenantId" in values && values.tenantId) {
      formData.set("tenantId", values.tenantId);
    }
    await props.onSubmit(formData);
  }

  const tenants = !isEdit ? props.tenants : [];
  const showTenantSelect = !isEdit && tenants.length > 0;

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
              <FormLabel>Nome</FormLabel>
              <FormControl>
                <Input placeholder="Mario Rossi" {...field} />
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
        {!isEdit && (
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Minimo 12 caratteri"
                      className="pr-10"
                      {...field}
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowPassword((v) => !v)}
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <EyeOff className="size-4" />
                      ) : (
                        <Eye className="size-4" />
                      )}
                    </button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        <FormField
          control={form.control}
          name="role"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Ruolo</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona ruolo" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="member">Autista</SelectItem>
                  {props.canAssignAdmin && (
                    <SelectItem value="admin">Fleet Manager</SelectItem>
                  )}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        {showTenantSelect && (
          <FormField
            control={form.control}
            name="tenantId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Organizzazione</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona organizzazione" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {tenants.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        <div className="flex gap-2">
          <Button type="submit" disabled={props.isLoading}>
            {props.isLoading
              ? isEdit
                ? "Salvataggio..."
                : "Creazione..."
              : isEdit
                ? "Salva modifiche"
                : "Crea utente"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
