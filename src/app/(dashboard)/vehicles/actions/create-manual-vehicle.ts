"use server";

import { requireAuth, isGlobalAdmin } from "@/lib/auth/permissions";
import { ErrorCode, type ActionResult } from "@/types/action-result";
import { prisma } from "@/lib/db/client";
import {
  manualVehicleWithEnginesSchema,
  type ManualVehicleWithEnginesInput,
} from "@/lib/schemas/vehicle";
import { logger } from "@/lib/utils/logger";
import { revalidatePath } from "next/cache";

/**
 * Server Action: crea un veicolo manuale nel catalogo globale.
 * Richiede autenticazione e ruolo Global Admin (owner).
 */
export async function createManualVehicle(
  input: ManualVehicleWithEnginesInput
): Promise<ActionResult<{ id: number }>> {
  // 1. Verifica autenticazione
  const authResult = await requireAuth();
  if (!authResult.success) return authResult;

  // 2. Verifica ruolo Global Admin
  const isAdmin = await isGlobalAdmin(authResult.ctx.userId);
  if (!isAdmin) {
    return {
      success: false,
      error:
        "Solo l'Admin di piattaforma puo aggiungere veicoli al catalogo globale",
      code: ErrorCode.FORBIDDEN,
    };
  }

  // 3. Validazione dati
  const parsed = manualVehicleWithEnginesSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0].message,
      code: ErrorCode.VALIDATION,
    };
  }

  const { engines, ...vehicleData } = parsed.data;

  try {
    // 4. Creazione veicolo + motori in un'unica transazione Prisma
    const vehicle = await prisma.catalogVehicle.create({
      data: {
        marca: vehicleData.marca,
        modello: vehicleData.modello,
        allestimento: vehicleData.allestimento ?? null,
        carrozzeria: vehicleData.carrozzeria ?? null,
        normativa: vehicleData.normativa ?? null,
        capacitaSerbatoioL: vehicleData.capacitaSerbatoioL ?? null,
        isHybrid: vehicleData.isHybrid,
        source: "MANUAL",
        engines: {
          create: engines.map((engine) => ({
            fuelType: engine.fuelType,
            cilindrata: engine.cilindrata ?? null,
            potenzaKw: engine.potenzaKw ?? null,
            potenzaCv: engine.potenzaCv ?? null,
            co2GKm: engine.co2GKm ?? null,
            co2Standard: engine.co2Standard,
            consumptionL100Km: engine.consumptionL100Km ?? null,
            consumptionUnit: engine.consumptionUnit,
          })),
        },
      },
      select: { id: true },
    });

    // 5. Revalida la cache della pagina catalogo
    revalidatePath("/vehicles/catalog");

    return {
      success: true,
      data: { id: Number(vehicle.id) },
    };
  } catch (error) {
    logger.error(
      { error, userId: authResult.ctx.userId },
      "Creazione veicolo manuale fallita"
    );
    return {
      success: false,
      error: "Errore imprevisto durante la creazione del veicolo",
      code: ErrorCode.INTERNAL,
    };
  }
}
