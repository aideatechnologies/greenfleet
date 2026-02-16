"use server";

import type { ActionResult } from "@/types/action-result";
import { ErrorCode } from "@/types/action-result";
import { requireAuth } from "@/lib/auth/permissions";
import { getPrismaForTenant } from "@/lib/db/client";
import { getSuppliersByTypeCode } from "@/lib/services/supplier-service";
import type { SupplierOptionItem } from "@/components/forms/SupplierSelector";

export async function getNltSuppliersAction(): Promise<
  ActionResult<SupplierOptionItem[]>
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
    const suppliers = await getSuppliersByTypeCode(prisma, "NLT");

    return {
      success: true,
      data: suppliers.map((s) => ({
        id: s.id,
        name: s.name,
        vatNumber: s.vatNumber,
        supplierType: {
          code: s.supplierType.code,
          label: s.supplierType.label,
        },
      })),
    };
  } catch {
    return {
      success: false,
      error: "Errore nel caricamento dei fornitori",
      code: ErrorCode.INTERNAL,
    };
  }
}
