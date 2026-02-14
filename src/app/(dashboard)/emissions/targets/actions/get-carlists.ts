"use server";

import type { ActionResult } from "@/types/action-result";
import { ErrorCode } from "@/types/action-result";
import { requireAuth } from "@/lib/auth/permissions";
import { getPrismaForTenant } from "@/lib/db/client";

export type CarlistOption = {
  id: string;
  name: string;
};

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

  const prisma = getPrismaForTenant(tenantId);
  const carlists = await prisma.carlist.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return { success: true, data: carlists };
}
