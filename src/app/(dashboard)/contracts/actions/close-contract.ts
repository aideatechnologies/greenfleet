"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/types/action-result";
import { ErrorCode } from "@/types/action-result";
import {
  closeContract,
  getContractById,
} from "@/lib/services/contract-service";
import type { ContractWithDetails } from "@/lib/services/contract-service";
import { requireAuth, isTenantAdmin } from "@/lib/auth/permissions";
import { getPrismaForTenant } from "@/lib/db/client";
import { logger } from "@/lib/utils/logger";

export async function closeContractAction(
  contractId: string
): Promise<ActionResult<ContractWithDetails>> {
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
      error: "Permessi insufficienti per gestire i contratti",
      code: ErrorCode.FORBIDDEN,
    };
  }

  const prisma = getPrismaForTenant(tenantId);

  // Verify the contract exists
  const existing = await getContractById(prisma, contractId);
  if (!existing) {
    return {
      success: false,
      error: "Contratto non trovato",
      code: ErrorCode.NOT_FOUND,
    };
  }

  if (existing.status === "CLOSED") {
    return {
      success: false,
      error: "Il contratto e gia chiuso",
      code: ErrorCode.VALIDATION,
    };
  }

  try {
    const contract = await closeContract(prisma, contractId);
    revalidatePath("/contracts");
    revalidatePath(`/contracts/${contractId}`);
    return { success: true, data: contract };
  } catch (error) {
    logger.error(
      { error, userId: ctx.userId, tenantId, contractId },
      "Failed to close contract"
    );
    return {
      success: false,
      error: "Errore nella chiusura del contratto",
      code: ErrorCode.INTERNAL,
    };
  }
}
