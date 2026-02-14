import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { tenantService } from "@/lib/services/tenant-service";
import { TenantTable } from "./components/TenantTable";

export default async function TenantListPage() {
  const tenants = await tenantService.listTenants();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Società</h2>
          <p className="text-muted-foreground">
            Gestisci le società registrate sulla piattaforma.
          </p>
        </div>
        <Button asChild>
          <Link href="/settings/tenant/new">
            <Plus className="mr-2 h-4 w-4" />
            Nuova società
          </Link>
        </Button>
      </div>
      <TenantTable tenants={tenants} />
    </div>
  );
}
