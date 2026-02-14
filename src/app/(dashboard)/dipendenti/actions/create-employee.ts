"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/types/action-result";
import { ErrorCode } from "@/types/action-result";
import { createEmployeeSchema } from "@/lib/schemas/employee";
import { createEmployee } from "@/lib/services/employee-service";
import { requireAuth, isTenantAdmin } from "@/lib/auth/permissions";
import { getPrismaForTenant } from "@/lib/db/client";
import { logger } from "@/lib/utils/logger";
import type { Employee } from "@/generated/prisma/client";

export async function createEmployeeAction(
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

  const parsed = createEmployeeSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0].message,
      code: ErrorCode.VALIDATION,
    };
  }

  try {
    const prisma = getPrismaForTenant(tenantId);
    const employee = await createEmployee(prisma, parsed.data);
    revalidatePath("/dipendenti");
    return { success: true, data: employee };
  } catch (error) {
    // Check for unique constraint violation (duplicate fiscal code)
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
      { error, userId: ctx.userId, tenantId },
      "Failed to create employee"
    );
    return {
      success: false,
      error: "Errore nella creazione del dipendente",
      code: ErrorCode.INTERNAL,
    };
  }
}
