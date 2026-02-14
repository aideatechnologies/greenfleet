"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { TenantForm } from "../components/TenantForm";
import { createTenant } from "../actions/create-tenant";

export default function NewTenantPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setIsLoading(true);
    try {
      const result = await createTenant(formData);
      if (result.success) {
        toast.success("Società creata con successo");
        router.push("/settings/tenant");
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
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Nuova società</h2>
        <p className="text-muted-foreground">
          Crea una nuova società sulla piattaforma.
        </p>
      </div>
      <TenantForm mode="create" onSubmit={handleSubmit} isLoading={isLoading} />
    </div>
  );
}
