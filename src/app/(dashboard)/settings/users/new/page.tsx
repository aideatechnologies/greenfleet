import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { getSessionContext, isGlobalAdmin, isTenantAdmin } from "@/lib/auth/permissions";
import { NewUserClient } from "./NewUserClient";

export default async function NewUserPage() {
  const ctx = await getSessionContext();
  if (!ctx || !ctx.organizationId) {
    redirect("/login");
  }

  const tenantId = ctx.organizationId;

  // RBAC: only tenant admins can create users
  const canManage = await isTenantAdmin(ctx, tenantId);
  if (!canManage) {
    redirect("/settings/users");
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

  // Load available tenants: all for owner, only current for admin
  let tenants: Array<{ id: string; name: string }>;
  if (isOwner) {
    tenants = await prisma.organization.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
  } else {
    const org = await prisma.organization.findUnique({
      where: { id: tenantId },
      select: { id: true, name: true },
    });
    tenants = org ? [org] : [];
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Nuovo utente</h2>
        <p className="text-muted-foreground">
          Crea un nuovo utente e assegnalo a un&apos;organizzazione.
        </p>
      </div>
      <NewUserClient
        defaultTenantId={tenantId}
        tenants={tenants}
        allowedRoles={allowedRoles}
      />
    </div>
  );
}
