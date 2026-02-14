"use server";

import type { ActionResult } from "@/types/action-result";
import { ErrorCode } from "@/types/action-result";
import { requireAuth } from "@/lib/auth/permissions";
import { getPrismaForTenant } from "@/lib/db/client";
import { getActiveEmployees } from "@/lib/services/employee-service";
import type { Employee } from "@/generated/prisma/client";

/**
 * Recupera i dipendenti attivi del tenant corrente (per dropdown assegnazione).
 */
export async function getActiveEmployeesAction(): Promise<
  ActionResult<Employee[]>
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
    const employees = await getActiveEmployees(prisma);
    return { success: true, data: employees };
  } catch {
    return {
      success: false,
      error: "Errore nel recupero dei dipendenti",
      code: ErrorCode.INTERNAL,
    };
  }
}
