import { notFound } from "next/navigation";
import { tenantService } from "@/lib/services/tenant-service";
import { EditTenantClient } from "./EditTenantClient";

export default async function EditTenantPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const tenant = await tenantService.getTenantById(id);

  if (!tenant) {
    notFound();
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          Modifica società
        </h2>
        <p className="text-muted-foreground">
          Modifica i dati di {tenant.name}.
        </p>
      </div>
      <EditTenantClient
        tenantId={tenant.id}
        defaultValues={{ name: tenant.name, slug: tenant.slug }}
      />
    </div>
  );
}
