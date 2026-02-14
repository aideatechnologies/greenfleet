"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/types/action-result";
import { ErrorCode } from "@/types/action-result";
import { createCarlistSchema } from "@/lib/schemas/carlist";
import { createCarlist } from "@/lib/services/carlist-service";
import type { Carlist } from "@/generated/prisma/client";
import { requireAuth, isTenantAdmin } from "@/lib/auth/permissions";
import { getPrismaForTenant } from "@/lib/db/client";
import { logger } from "@/lib/utils/logger";

export async function createCarlistAction(
  input: unknown
): Promise<ActionResult<Carlist>> {
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

  const parsed = createCarlistSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0].message,
      code: ErrorCode.VALIDATION,
    };
  }

  try {
    const prisma = getPrismaForTenant(tenantId);
    const result = await createCarlist(prisma, parsed.data, ctx.userId);

    if (result.success) {
      revalidatePath("/carlist");
    }

    return result;
  } catch (error) {
    logger.error(
      { error, userId: ctx.userId, tenantId },
      "Failed to create carlist"
    );
    return {
      success: false,
      error: "Errore nella creazione della carlist",
      code: ErrorCode.INTERNAL,
    };
  }
}
