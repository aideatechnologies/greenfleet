"use server";

import type { ActionResult } from "@/types/action-result";
import { ErrorCode } from "@/types/action-result";
import { requireAuth } from "@/lib/auth/permissions";
import { getPrismaForTenant } from "@/lib/db/client";
import { getSuppliersByTypeCode } from "@/lib/services/supplier-service";
import type { SupplierOptionItem } from "@/components/forms/SupplierSelector";

type ContractSuppliersResult = {
  nlt: SupplierOptionItem[];
  leasing: SupplierOptionItem[];
};

export async function getContractSuppliersAction(): Promise<
  ActionResult<ContractSuppliersResult>
> {
  const authResult = await requireAuth();
  if (!authResult.success) return authResult;
  const { ctx } = authResult;

  const tenantId = ctx.organizationId;
  if (!tenantId) {
    return {
      success: false,
      error: "Nessun tenant attivo nella sessione",
      code: ErrorCode.FORBIDDEN,
    };
  }

  try {
    const prisma = getPrismaForTenant(tenantId);
    const [nltSuppliers, leasingSuppliers] = await Promise.all([
      getSuppliersByTypeCode(prisma, "NLT"),
      getSuppliersByTypeCode(prisma, "LEASING"),
    ]);

    const mapSuppliers = (list: typeof nltSuppliers): SupplierOptionItem[] =>
      list.map((s) => ({
        id: String(s.id),
        name: s.name,
        vatNumber: s.vatNumber,
        supplierType: {
          code: s.supplierType.code,
          label: s.supplierType.label,
        },
      }));

    return {
      success: true,
      data: {
        nlt: mapSuppliers(nltSuppliers),
        leasing: mapSuppliers(leasingSuppliers),
      },
    };
  } catch {
    return {
      success: false,
      error: "Errore nel caricamento dei fornitori",
      code: ErrorCode.INTERNAL,
    };
  }
}
