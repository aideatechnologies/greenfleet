"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { UserForm } from "../../components/UserForm";
import { updateUser } from "../../actions/update-user";

export function EditUserClient({
  userId,
  allowedRoles,
  defaultValues,
}: {
  userId: string;
  allowedRoles: Array<{ value: string; label: string }>;
  defaultValues: { name: string; email: string; role: "admin" | "mobility_manager" | "member" };
}) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setIsLoading(true);
    try {
      const result = await updateUser(userId, formData);
      if (result.success) {
        toast.success("Utente aggiornato");
        router.push("/settings/users");
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
    <UserForm
      mode="edit"
      allowedRoles={allowedRoles}
      defaultValues={defaultValues}
      onSubmit={handleSubmit}
      isLoading={isLoading}
    />
  );
}
