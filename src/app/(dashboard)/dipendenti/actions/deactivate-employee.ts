"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/types/action-result";
import { ErrorCode } from "@/types/action-result";
import { deactivateEmployee, getEmployeeById } from "@/lib/services/employee-service";
import { requireAuth, isTenantAdmin } from "@/lib/auth/permissions";
import { getPrismaForTenant } from "@/lib/db/client";
import { logger } from "@/lib/utils/logger";
import type { Employee } from "@/generated/prisma/client";

export async function deactivateEmployeeAction(
  employeeId: number
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

    if (!existing.isActive) {
      return {
        success: false,
        error: "Il dipendente è già disattivato",
        code: ErrorCode.VALIDATION,
      };
    }

    const employee = await deactivateEmployee(prisma, employeeId);
    revalidatePath("/dipendenti");
    revalidatePath(`/dipendenti/${employeeId}`);
    return { success: true, data: employee };
  } catch (error) {
    logger.error(
      { error, userId: ctx.userId, tenantId, employeeId },
      "Failed to deactivate employee"
    );
    return {
      success: false,
      error: "Errore nella disattivazione del dipendente",
      code: ErrorCode.INTERNAL,
    };
  }
}
