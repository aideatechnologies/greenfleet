"use server";

import type { ActionResult } from "@/types/action-result";
import { ErrorCode } from "@/types/action-result";
import type { FilterOptions } from "@/types/report";
import { requireAuth } from "@/lib/auth/permissions";
import { prisma, getPrismaForTenant } from "@/lib/db/client";

export async function getFilterOptionsAction(): Promise<
  ActionResult<FilterOptions>
> {
  const authResult = await requireAuth();
  if (!authResult.success) return authResult;

  const { ctx } = authResult;
  const tenantId = ctx.organizationId;

  try {
    const tenantPrisma = tenantId ? getPrismaForTenant(tenantId) : null;

    const [marche, carrozzerie, carburanti, targheRaw] = await Promise.all([
      prisma.catalogVehicle.findMany({
        select: { marca: true },
        distinct: ["marca"],
        orderBy: { marca: "asc" },
      }),
      prisma.catalogVehicle.findMany({
        where: { carrozzeria: { not: null } },
        select: { carrozzeria: true },
        distinct: ["carrozzeria"],
        orderBy: { carrozzeria: "asc" },
      }),
      prisma.engine.findMany({
        select: { fuelType: true },
        distinct: ["fuelType"],
        orderBy: { fuelType: "asc" },
      }),
      tenantPrisma
        ? tenantPrisma.tenantVehicle.findMany({
            where: { status: "ACTIVE" },
            select: { licensePlate: true },
            orderBy: { licensePlate: "asc" },
          })
        : Promise.resolve([]),
    ]);

    return {
      success: true,
      data: {
        targhe: targheRaw.map((v) => v.licensePlate),
        marche: marche.map((m) => m.marca),
        carrozzerie: carrozzerie
          .map((c) => c.carrozzeria)
          .filter((c): c is string => c !== null),
        carburanti: carburanti.map((c) => c.fuelType),
      },
    };
  } catch {
    return {
      success: false,
      error: "Errore nel caricamento delle opzioni filtro",
      code: ErrorCode.INTERNAL,
    };
  }
}
