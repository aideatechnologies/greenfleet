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

  const isOwner = await isGlobalAdmin(ctx.userId);

  // Build allowed roles based on caller's role
  const allowedRoles: Array<{ value: string; label: string }> = [];
  if (isOwner) {
    allowedRoles.push(
      { value: "admin", label: "Fleet Manager" },
      { value: "mobility_manager", label: "Mobility Manager" },
      { value: "member", label: "Autista" },
    );
  } else if (ctx.role === "admin") {
    allowedRoles.push(
      { value: "mobility_manager", label: "Mobility Manager" },
      { value: "member", label: "Autista" },
    );
  }

  const userRole = (user.role === "admin" || user.role === "mobility_manager" || user.role === "member") ? user.role : "member";

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
        allowedRoles={allowedRoles}
        defaultValues={{
          name: user.name,
          email: user.email,
          role: userRole,
        }}
      />
    </div>
  );
}
