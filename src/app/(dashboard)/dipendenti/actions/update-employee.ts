"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/types/action-result";
import { ErrorCode } from "@/types/action-result";
import { updateEmployeeSchema } from "@/lib/schemas/employee";
import { updateEmployee, getEmployeeById } from "@/lib/services/employee-service";
import { requireAuth, isTenantAdmin } from "@/lib/auth/permissions";
import { getPrismaForTenant } from "@/lib/db/client";
import { logger } from "@/lib/utils/logger";
import type { Employee } from "@/generated/prisma/client";

export async function updateEmployeeAction(
  input: unknown
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

  const parsed = updateEmployeeSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0].message,
      code: ErrorCode.VALIDATION,
    };
  }

  const { id, ...data } = parsed.data;

  try {
    const prisma = getPrismaForTenant(tenantId);

    // Verify employee exists in this tenant
    const existing = await getEmployeeById(prisma, id);
    if (!existing) {
      return {
        success: false,
        error: "Dipendente non trovato",
        code: ErrorCode.NOT_FOUND,
      };
    }

    const employee = await updateEmployee(prisma, id, data);
    revalidatePath("/dipendenti");
    revalidatePath(`/dipendenti/${id}`);
    return { success: true, data: employee };
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("Unique constraint")
    ) {
      return {
        success: false,
        error: "Esiste già un dipendente con questo codice fiscale",
        code: ErrorCode.CONFLICT,
      };
    }
    logger.error(
      { error, userId: ctx.userId, tenantId, employeeId: id },
      "Failed to update employee"
    );
    return {
      success: false,
      error: "Errore nell'aggiornamento del dipendente",
      code: ErrorCode.INTERNAL,
    };
  }
}
