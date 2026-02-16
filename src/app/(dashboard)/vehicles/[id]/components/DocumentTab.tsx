import { getPrismaForTenant } from "@/lib/db/client";
import { getDocumentsByVehicle, getDocumentSummary } from "@/lib/services/vehicle-document-service";
import { DocumentTable } from "./DocumentTable";

type DocumentTabProps = {
  vehicleId: number;
  tenantId: string;
  canEdit: boolean;
};

export async function DocumentTab({
  vehicleId,
  tenantId,
  canEdit,
}: DocumentTabProps) {
  const prisma = getPrismaForTenant(tenantId);
  const [documents, summary] = await Promise.all([
    getDocumentsByVehicle(prisma, vehicleId),
    getDocumentSummary(prisma, vehicleId),
  ]);

  return (
    <DocumentTable
      documents={JSON.parse(JSON.stringify(documents))}
      summary={summary}
      vehicleId={vehicleId}
      canEdit={canEdit}
    />
  );
}
