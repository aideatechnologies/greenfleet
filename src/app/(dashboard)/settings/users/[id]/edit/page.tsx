import { notFound, redirect } from "next/navigation";
import { userService } from "@/lib/services/user-service";
import { getSessionContext, isGlobalAdmin, isTenantAdmin } from "@/lib/auth/permissions";
import { EditUserClient } from "./EditUserClient";

export default async function EditUserPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: userId } = await params;
  const ctx = await getSessionContext();
  if (!ctx || !ctx.organizationId) {
    redirect("/login");
  }

  const tenantId = ctx.organizationId;

  // RBAC: only tenant admins can edit users
  const canManage = await isTenantAdmin(ctx, tenantId);
  if (!canManage) {
    redirect("/settings/users");
  }

  const user = await userService.getUserInTenant(userId, tenantId);

  if (!user) {
    notFound();
  }

  const canAssignAdmin = await isGlobalAdmin(ctx.userId);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Modifica utente</h2>
        <p className="text-muted-foreground">
          Modifica i dati di {user.name}.
        </p>
      </div>
      <EditUserClient
        userId={userId}
        canAssignAdmin={canAssignAdmin}
        defaultValues={{
          name: user.name,
          email: user.email,
          role: (user.role === "admin" || user.role === "member") ? user.role : "member",
        }}
      />
    </div>
  );
}
