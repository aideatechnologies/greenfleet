"use server";

import { revalidatePath } from "next/cache";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import type { ActionResult } from "@/types/action-result";
import { ErrorCode } from "@/types/action-result";
import { contractSchema } from "@/lib/schemas/contract";
import {
  createContractWithSuccession,
  getActiveContractForVehicle,
} from "@/lib/services/contract-service";
import type { ContractWithDetails } from "@/lib/services/contract-service";
import { CONTRACT_TYPE_LABELS, type ContractType } from "@/types/contract";
import { requireAuth, isTenantAdmin } from "@/lib/auth/permissions";
import { getPrismaForTenant } from "@/lib/db/client";
import { logger } from "@/lib/utils/logger";

export async function createContractAction(
  input: unknown,
  confirmSuccession?: boolean
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

  const parsed = contractSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0].message,
      code: ErrorCode.VALIDATION,
    };
  }

  try {
    const prisma = getPrismaForTenant(tenantId);

    // Verify the vehicle exists in the tenant
    const vehicle = await prisma.tenantVehicle.findFirst({
      where: { id: parsed.data.vehicleId },
    });
    if (!vehicle) {
      return {
        success: false,
        error: "Veicolo non trovato",
        code: ErrorCode.NOT_FOUND,
      };
    }

    // Check for existing active contract
    if (!confirmSuccession) {
      const activeContract = await getActiveContractForVehicle(
        prisma,
        parsed.data.vehicleId
      );
      if (activeContract) {
        const typeLabel =
          CONTRACT_TYPE_LABELS[activeContract.type as ContractType];
        const dateStr = activeContract.startDate
          ? format(new Date(activeContract.startDate), "dd MMM yyyy", {
              locale: it,
            })
          : activeContract.purchaseDate
            ? format(new Date(activeContract.purchaseDate), "dd MMM yyyy", {
                locale: it,
              })
            : "N/D";
        return {
          success: false,
          error: `Il veicolo ha gia un contratto attivo: ${typeLabel} dal ${dateStr}. Conferma per chiuderlo e creare il nuovo contratto.`,
          code: ErrorCode.CONFLICT,
        };
      }
    }

    const { contract } = await createContractWithSuccession(
      prisma,
      parsed.data
    );
    revalidatePath("/contracts");
    revalidatePath(`/vehicles/${parsed.data.vehicleId}`);
    return { success: true, data: contract };
  } catch (error) {
    logger.error(
      { error, userId: ctx.userId, tenantId },
      "Failed to create contract"
    );
    return {
      success: false,
      error: "Errore nella creazione del contratto",
      code: ErrorCode.INTERNAL,
    };
  }
}
