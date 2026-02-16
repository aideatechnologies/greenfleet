"use server";

import { revalidatePath } from "next/cache";
import type { SupplierType } from "@/generated/prisma/client";
import type { ActionResult } from "@/types/action-result";
import { ErrorCode } from "@/types/action-result";
import {
  createSupplierTypeSchema,
  updateSupplierTypeSchema,
} from "@/lib/schemas/supplier";
import {
  createSupplierType,
  updateSupplierType,
  getSupplierTypes,
  seedDefaultSupplierTypes,
} from "@/lib/services/supplier-type-service";
import { requireAuth, isTenantAdmin } from "@/lib/auth/permissions";
import { getPrismaForTenant } from "@/lib/db/client";
import { logger } from "@/lib/utils/logger";

export async function getSupplierTypesAction(): Promise<ActionResult<SupplierType[]>> {
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
    const types = await getSupplierTypes(prisma, false);
    return { success: true, data: types };
  } catch (error) {
    logger.error({ error, tenantId }, "Failed to get supplier types");
    return {
      success: false,
      error: "Errore nel caricamento dei tipi fornitore",
      code: ErrorCode.INTERNAL,
    };
  }
}

export async function createSupplierTypeAction(
  input: unknown
): Promise<ActionResult<SupplierType>> {
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

  const parsed = createSupplierTypeSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0].message,
      code: ErrorCode.VALIDATION,
    };
  }

  try {
    const prisma = getPrismaForTenant(tenantId);
    const supplierType = await createSupplierType(prisma, parsed.data);
    revalidatePath("/settings/suppliers");
    return { success: true, data: supplierType };
  } catch (error) {
    logger.error({ error, userId: ctx.userId, tenantId }, "Failed to create supplier type");
    return {
      success: false,
      error: "Errore nella creazione del tipo fornitore",
      code: ErrorCode.INTERNAL,
    };
  }
}

export async function updateSupplierTypeAction(
  id: string,
  input: unknown
): Promise<ActionResult<SupplierType>> {
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

  const parsed = updateSupplierTypeSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0].message,
      code: ErrorCode.VALIDATION,
    };
  }

  try {
    const prisma = getPrismaForTenant(tenantId);
    const supplierType = await updateSupplierType(prisma, id, parsed.data);
    revalidatePath("/settings/suppliers");
    return { success: true, data: supplierType };
  } catch (error) {
    logger.error({ error, userId: ctx.userId, tenantId }, "Failed to update supplier type");
    return {
      success: false,
      error: "Errore nell'aggiornamento del tipo fornitore",
      code: ErrorCode.INTERNAL,
    };
  }
}

export async function seedSupplierTypesAction(): Promise<ActionResult<SupplierType[]>> {
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
    const types = await seedDefaultSupplierTypes(prisma);
    revalidatePath("/settings/suppliers");
    return { success: true, data: types };
  } catch (error) {
    logger.error({ error, userId: ctx.userId, tenantId }, "Failed to seed supplier types");
    return {
      success: false,
      error: "Errore nel seeding dei tipi fornitore",
      code: ErrorCode.INTERNAL,
    };
  }
}
