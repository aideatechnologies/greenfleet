"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/types/action-result";
import { ErrorCode } from "@/types/action-result";
import {
  createFuelCardSchema,
  updateFuelCardSchema,
} from "@/lib/schemas/fuel-card";
import {
  createFuelCard,
  updateFuelCard,
  toggleFuelCardStatus,
  type FuelCardWithDetails,
} from "@/lib/services/fuel-card-service";
import { requireAuth, isTenantAdmin } from "@/lib/auth/permissions";
import { getPrismaForTenant } from "@/lib/db/client";
import { logger } from "@/lib/utils/logger";

export async function createFuelCardAction(
  input: unknown
): Promise<ActionResult<FuelCardWithDetails>> {
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
      error: "Permessi insufficienti per gestire le carte carburante",
      code: ErrorCode.FORBIDDEN,
    };
  }

  const parsed = createFuelCardSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0].message,
      code: ErrorCode.VALIDATION,
    };
  }

  try {
    const prisma = getPrismaForTenant(tenantId);
    const fuelCard = await createFuelCard(prisma, parsed.data);
    revalidatePath("/fuel-cards");
    return { success: true, data: fuelCard };
  } catch (error) {
    logger.error({ error, userId: ctx.userId, tenantId }, "Failed to create fuel card");
    return {
      success: false,
      error: "Errore nella creazione della carta carburante",
      code: ErrorCode.INTERNAL,
    };
  }
}

export async function updateFuelCardAction(
  id: string,
  input: unknown
): Promise<ActionResult<FuelCardWithDetails>> {
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
      error: "Permessi insufficienti per gestire le carte carburante",
      code: ErrorCode.FORBIDDEN,
    };
  }

  const parsed = updateFuelCardSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0].message,
      code: ErrorCode.VALIDATION,
    };
  }

  try {
    const prisma = getPrismaForTenant(tenantId);
    const fuelCard = await updateFuelCard(prisma, id, parsed.data);
    revalidatePath("/fuel-cards");
    return { success: true, data: fuelCard };
  } catch (error) {
    logger.error({ error, userId: ctx.userId, tenantId }, "Failed to update fuel card");
    return {
      success: false,
      error: "Errore nell'aggiornamento della carta carburante",
      code: ErrorCode.INTERNAL,
    };
  }
}

export async function toggleFuelCardStatusAction(
  id: string,
  status: string
): Promise<ActionResult<FuelCardWithDetails>> {
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
      error: "Permessi insufficienti",
      code: ErrorCode.FORBIDDEN,
    };
  }

  try {
    const prisma = getPrismaForTenant(tenantId);
    const fuelCard = await toggleFuelCardStatus(prisma, id, status);
    revalidatePath("/fuel-cards");
    return { success: true, data: fuelCard };
  } catch (error) {
    logger.error({ error, userId: ctx.userId, tenantId }, "Failed to toggle fuel card status");
    return {
      success: false,
      error: "Errore nel cambio stato della carta carburante",
      code: ErrorCode.INTERNAL,
    };
  }
}
