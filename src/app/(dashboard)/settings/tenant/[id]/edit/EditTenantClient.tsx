"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { TenantForm } from "../../components/TenantForm";
import { updateTenant } from "../../actions/update-tenant";

export function EditTenantClient({
  tenantId,
  defaultValues,
}: {
  tenantId: string;
  defaultValues: { name: string; slug: string };
}) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setIsLoading(true);
    try {
      const result = await updateTenant(tenantId, formData);
      if (result.success) {
        toast.success("Società aggiornata");
        router.push("/settings/tenant");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error("Errore nell'aggiornamento");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <TenantForm
      mode="edit"
      defaultValues={defaultValues}
      onSubmit={handleSubmit}
      isLoading={isLoading}
    />
  );
}
