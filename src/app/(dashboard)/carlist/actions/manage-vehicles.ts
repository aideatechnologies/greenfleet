"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/types/action-result";
import { ErrorCode } from "@/types/action-result";
import {
  addCatalogVehiclesToCarlistSchema,
  removeCatalogVehiclesFromCarlistSchema,
} from "@/lib/schemas/carlist";
import {
  addCatalogVehicles,
  removeCatalogVehicles,
} from "@/lib/services/carlist-service";
import { requireAuth, isTenantAdmin } from "@/lib/auth/permissions";
import { getPrismaForTenant } from "@/lib/db/client";
import { logger } from "@/lib/utils/logger";

export async function addCatalogVehiclesToCarlistAction(
  input: unknown
): Promise<ActionResult<{ added: number }>> {
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
      error: "Permessi insufficienti per gestire le carlist",
      code: ErrorCode.FORBIDDEN,
    };
  }

  const parsed = addCatalogVehiclesToCarlistSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0].message,
      code: ErrorCode.VALIDATION,
    };
  }

  try {
    const prisma = getPrismaForTenant(tenantId);
    const result = await addCatalogVehicles(
      prisma,
      parsed.data.carlistId,
      parsed.data.catalogVehicleIds,
      ctx.userId
    );

    if (result.success) {
      revalidatePath(`/carlist/${parsed.data.carlistId}`);
      revalidatePath("/carlist");
    }

    return result;
  } catch (error) {
    logger.error(
      { error, userId: ctx.userId, tenantId },
      "Failed to add catalog vehicles to carlist"
    );
    return {
      success: false,
      error: "Errore nell'aggiunta dei veicoli alla carlist",
      code: ErrorCode.INTERNAL,
    };
  }
}

export async function removeCatalogVehiclesFromCarlistAction(
  input: unknown
): Promise<ActionResult<{ removed: number }>> {
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
      error: "Permessi insufficienti per gestire le carlist",
      code: ErrorCode.FORBIDDEN,
    };
  }

  const parsed = removeCatalogVehiclesFromCarlistSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0].message,
      code: ErrorCode.VALIDATION,
    };
  }

  try {
    const prisma = getPrismaForTenant(tenantId);
    const result = await removeCatalogVehicles(
      prisma,
      parsed.data.carlistId,
      parsed.data.catalogVehicleIds
    );

    if (result.success) {
      revalidatePath(`/carlist/${parsed.data.carlistId}`);
      revalidatePath("/carlist");
    }

    return result;
  } catch (error) {
    logger.error(
      { error, userId: ctx.userId, tenantId },
      "Failed to remove catalog vehicles from carlist"
    );
    return {
      success: false,
      error: "Errore nella rimozione dei veicoli dalla carlist",
      code: ErrorCode.INTERNAL,
    };
  }
}
