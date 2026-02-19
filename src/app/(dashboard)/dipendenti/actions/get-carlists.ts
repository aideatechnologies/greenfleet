"use server";

import type { ActionResult } from "@/types/action-result";
import { ErrorCode } from "@/types/action-result";
import { requireAuth, isTenantAdmin } from "@/lib/auth/permissions";
import { getPrismaForTenant } from "@/lib/db/client";
import { logger } from "@/lib/utils/logger";

type CarlistOption = { id: string; name: string };

export async function getCarlistsAction(): Promise<
  ActionResult<CarlistOption[]>
> {
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
    const carlists = await prisma.carlist.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });

    return {
      success: true,
      data: carlists.map((c) => ({ id: String(c.id), name: c.name })),
    };
  } catch (error) {
    logger.error(
      { error, userId: ctx.userId, tenantId },
      "Failed to fetch carlists"
    );
    return {
      success: false,
      error: "Errore nel caricamento dei parchi auto",
      code: ErrorCode.INTERNAL,
    };
  }
}
