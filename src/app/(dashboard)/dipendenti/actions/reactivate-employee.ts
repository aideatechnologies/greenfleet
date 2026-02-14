"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/types/action-result";
import { ErrorCode } from "@/types/action-result";
import { reactivateEmployee, getEmployeeById } from "@/lib/services/employee-service";
import { requireAuth, isTenantAdmin } from "@/lib/auth/permissions";
import { getPrismaForTenant } from "@/lib/db/client";
import { logger } from "@/lib/utils/logger";
import type { Employee } from "@/generated/prisma/client";

export async function reactivateEmployeeAction(
  employeeId: string
): Promise<ActionResult<Employee>> {
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

  const canManage = await isTenantAdmin(ctx, tenantId);
  if (!canManage) {
    return {
      success: false,
      error: "Permessi insufficienti per gestire i dipendenti",
      code: ErrorCode.FORBIDDEN,
    };
  }

  try {
    const prisma = getPrismaForTenant(tenantId);

    const existing = await getEmployeeById(prisma, employeeId);
    if (!existing) {
      return {
        success: false,
        error: "Dipendente non trovato",
        code: ErrorCode.NOT_FOUND,
      };
    }

    if (existing.isActive) {
      return {
        success: false,
        error: "Il dipendente è già attivo",
        code: ErrorCode.VALIDATION,
      };
    }

    const employee = await reactivateEmployee(prisma, employeeId);
    revalidatePath("/dipendenti");
    revalidatePath(`/dipendenti/${employeeId}`);
    return { success: true, data: employee };
  } catch (error) {
    logger.error(
      { error, userId: ctx.userId, tenantId, employeeId },
      "Failed to reactivate employee"
    );
    return {
      success: false,
      error: "Errore nella riattivazione del dipendente",
      code: ErrorCode.INTERNAL,
    };
  }
}
