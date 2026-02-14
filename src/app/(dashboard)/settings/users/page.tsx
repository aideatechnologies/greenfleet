import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { userService } from "@/lib/services/user-service";
import { getSessionContext, isTenantAdmin } from "@/lib/auth/permissions";
import { UserTable } from "./components/UserTable";

export default async function UserListPage() {
  const ctx = await getSessionContext();
  if (!ctx || !ctx.organizationId) {
    redirect("/login");
  }

  const tenantId = ctx.organizationId;
  const canEdit = await isTenantAdmin(ctx, tenantId);
  const users = await userService.listUsers(tenantId);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Utenti</h2>
          <p className="text-muted-foreground">
            Gestisci gli utenti della tua organizzazione.
          </p>
        </div>
        {canEdit && (
          <Button asChild>
            <Link href="/settings/users/new">
              <Plus className="mr-2 h-4 w-4" />
              Nuovo utente
            </Link>
          </Button>
        )}
      </div>
      <UserTable
        users={users}
        currentUserId={ctx.userId}
        canEdit={canEdit}
      />
    </div>
  );
}
