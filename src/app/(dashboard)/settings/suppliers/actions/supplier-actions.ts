"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/types/action-result";
import { ErrorCode } from "@/types/action-result";
import {
  createSupplierSchema,
  updateSupplierSchema,
} from "@/lib/schemas/supplier";
import {
  createSupplier,
  updateSupplier,
  toggleSupplierActive,
  type SupplierWithType,
} from "@/lib/services/supplier-service";
import { requireAuth, isTenantAdmin } from "@/lib/auth/permissions";
import { getPrismaForTenant } from "@/lib/db/client";
import { logger } from "@/lib/utils/logger";

export async function createSupplierAction(
  input: unknown
): Promise<ActionResult<SupplierWithType>> {
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
      error: "Permessi insufficienti per gestire i fornitori",
      code: ErrorCode.FORBIDDEN,
    };
  }

  const parsed = createSupplierSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0].message,
      code: ErrorCode.VALIDATION,
    };
  }

  try {
    const prisma = getPrismaForTenant(tenantId);
    const supplier = await createSupplier(prisma, parsed.data);
    revalidatePath("/settings/suppliers");
    return { success: true, data: supplier };
  } catch (error) {
    logger.error({ error, userId: ctx.userId, tenantId }, "Failed to create supplier");
    return {
      success: false,
      error: "Errore nella creazione del fornitore",
      code: ErrorCode.INTERNAL,
    };
  }
}

export async function updateSupplierAction(
  id: string,
  input: unknown
): Promise<ActionResult<SupplierWithType>> {
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
      error: "Permessi insufficienti per gestire i fornitori",
      code: ErrorCode.FORBIDDEN,
    };
  }

  const parsed = updateSupplierSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0].message,
      code: ErrorCode.VALIDATION,
    };
  }

  try {
    const prisma = getPrismaForTenant(tenantId);
    const supplier = await updateSupplier(prisma, id, parsed.data);
    revalidatePath("/settings/suppliers");
    return { success: true, data: supplier };
  } catch (error) {
    logger.error({ error, userId: ctx.userId, tenantId }, "Failed to update supplier");
    return {
      success: false,
      error: "Errore nell'aggiornamento del fornitore",
      code: ErrorCode.INTERNAL,
    };
  }
}

export async function toggleSupplierActiveAction(
  id: string,
  isActive: boolean
): Promise<ActionResult<SupplierWithType>> {
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
    const supplier = await toggleSupplierActive(prisma, id, isActive);
    revalidatePath("/settings/suppliers");
    return { success: true, data: supplier };
  } catch (error) {
    logger.error({ error, userId: ctx.userId, tenantId }, "Failed to toggle supplier active");
    return {
      success: false,
      error: "Errore nel cambio stato del fornitore",
      code: ErrorCode.INTERNAL,
    };
  }
}
