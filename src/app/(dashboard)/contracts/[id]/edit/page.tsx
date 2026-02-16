import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { getSessionContext, isTenantAdmin } from "@/lib/auth/permissions";
import { getPrismaForTenant } from "@/lib/db/client";
import { getContractById } from "@/lib/services/contract-service";
import { ContractStatus, type ContractType } from "@/types/contract";
import { EditContractClient } from "./EditContractClient";

export default async function EditContractPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await getSessionContext();
  if (!ctx || !ctx.organizationId) {
    redirect("/login");
  }

  const tenantId = ctx.organizationId;
  const canEdit = await isTenantAdmin(ctx, tenantId);
  if (!canEdit) {
    redirect("/contracts");
  }

  const prisma = getPrismaForTenant(tenantId);
  const contract = await getContractById(prisma, id);

  if (!contract) {
    notFound();
  }

  if (contract.status === ContractStatus.CLOSED) {
    redirect(`/contracts/${id}`);
  }

  const contractType = contract.type as ContractType;

  // Build default values for the form based on the contract type
  const defaultValues = buildDefaultValues(contract, contractType);

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link
          href="/contracts"
          className="hover:text-foreground transition-colors"
        >
          Contratti
        </Link>
        <ChevronRight className="h-4 w-4" />
        <Link
          href={`/contracts/${id}`}
          className="hover:text-foreground transition-colors"
        >
          {contract.vehicle.licensePlate}
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground">Modifica</span>
      </nav>

      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          Modifica contratto
        </h2>
        <p className="text-muted-foreground">
          Aggiorna i dati del contratto per{" "}
          <span className="font-mono font-medium uppercase">
            {contract.vehicle.licensePlate}
          </span>
          .
        </p>
      </div>

      <EditContractClient
        contractId={id}
        contractType={contractType}
        defaultValues={defaultValues}
        defaultVehicleId={contract.vehicleId}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helper to extract default form values from a contract
// ---------------------------------------------------------------------------

function buildDefaultValues(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  contract: Record<string, any>,
  contractType: ContractType
) {
  const base = {
    type: contractType,
    vehicleId: contract.vehicleId as string,
    notes: (contract.notes as string) ?? "",
  };

  switch (contractType) {
    case "PROPRIETARIO":
      return {
        ...base,
        purchaseDate: contract.purchaseDate
          ? new Date(contract.purchaseDate as string)
          : undefined,
        purchasePrice: contract.purchasePrice as number | undefined,
        residualValue: contract.residualValue as number | undefined,
      };
    case "BREVE_TERMINE":
      return {
        ...base,
        supplierId: (contract.supplierId as string) ?? "",
        startDate: contract.startDate
          ? new Date(contract.startDate as string)
          : undefined,
        endDate: contract.endDate
          ? new Date(contract.endDate as string)
          : undefined,
        dailyRate: contract.dailyRate as number | undefined,
        includedKm: contract.includedKm as number | undefined,
      };
    case "LUNGO_TERMINE":
      return {
        ...base,
        supplierId: (contract.supplierId as string) ?? "",
        startDate: contract.startDate
          ? new Date(contract.startDate as string)
          : undefined,
        endDate: contract.endDate
          ? new Date(contract.endDate as string)
          : undefined,
        monthlyRate: contract.monthlyRate as number | undefined,
        franchiseKm: contract.franchiseKm as number | undefined,
        extraKmPenalty: contract.extraKmPenalty as number | undefined,
        includedServices: (contract.includedServices as string) ?? "",
      };
    case "LEASING_FINANZIARIO":
      return {
        ...base,
        supplierId: (contract.supplierId as string) ?? "",
        startDate: contract.startDate
          ? new Date(contract.startDate as string)
          : undefined,
        endDate: contract.endDate
          ? new Date(contract.endDate as string)
          : undefined,
        monthlyRate: contract.monthlyRate as number | undefined,
        buybackValue: contract.buybackValue as number | undefined,
        maxDiscount: contract.maxDiscount as number | undefined,
      };
  }
}
