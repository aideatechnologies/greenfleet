"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { UserForm } from "../../components/UserForm";
import { updateUser } from "../../actions/update-user";

export function EditUserClient({
  userId,
  canAssignAdmin,
  defaultValues,
}: {
  userId: string;
  canAssignAdmin: boolean;
  defaultValues: { name: string; email: string; role: "admin" | "member" };
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
      canAssignAdmin={canAssignAdmin}
      defaultValues={defaultValues}
      onSubmit={handleSubmit}
      isLoading={isLoading}
    />
  );
}
