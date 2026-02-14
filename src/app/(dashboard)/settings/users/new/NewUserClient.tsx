"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { UserForm } from "../components/UserForm";
import { createUser } from "../actions/create-user";

export function NewUserClient({
  defaultTenantId,
  tenants,
  canAssignAdmin,
}: {
  defaultTenantId: string;
  tenants: Array<{ id: string; name: string }>;
  canAssignAdmin: boolean;
}) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setIsLoading(true);
    try {
      const result = await createUser(formData);
      if (result.success) {
        toast.success("Utente creato con successo");
        router.push("/settings/users");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error("Errore nella creazione");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <UserForm
      mode="create"
      tenantId={defaultTenantId}
      tenants={tenants}
      canAssignAdmin={canAssignAdmin}
      onSubmit={handleSubmit}
      isLoading={isLoading}
    />
  );
}
