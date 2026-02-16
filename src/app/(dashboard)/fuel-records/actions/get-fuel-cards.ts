"use server";

import type { ActionResult } from "@/types/action-result";
import { ErrorCode } from "@/types/action-result";
import { requireAuth } from "@/lib/auth/permissions";
import { getPrismaForTenant } from "@/lib/db/client";

export type FuelCardOptionItem = {
  id: string;
  cardNumber: string;
  issuer: string;
};

/**
 * Get active fuel cards for the fuel record form (optional association).
 */
export async function getFuelCardsForFuelRecordAction(): Promise<
  ActionResult<FuelCardOptionItem[]>
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

  try {
    const prisma = getPrismaForTenant(tenantId);
    const fuelCards = await prisma.fuelCard.findMany({
      where: { status: "ACTIVE" },
      orderBy: { cardNumber: "asc" },
      select: {
        id: true,
        cardNumber: true,
        issuer: true,
      },
    });

    return {
      success: true,
      data: fuelCards.map((fc) => ({
        id: String(fc.id),
        cardNumber: fc.cardNumber,
        issuer: fc.issuer,
      })),
    };
  } catch {
    return {
      success: false,
      error: "Errore nel caricamento delle carte carburante",
      code: ErrorCode.INTERNAL,
    };
  }
}
