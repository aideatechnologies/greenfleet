"use server";

import { ActionResult, ErrorCode } from "@/types/action-result";
import { emissionConversionConfigSchema } from "@/lib/schemas/emission-standard";
import { requireAuth } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db/client";
import { logger } from "@/lib/utils/logger";
import type { EmissionConversionConfig } from "@/generated/prisma/client";

// ---------------------------------------------------------------------------
// Helper: verifica ruolo owner o admin
// ---------------------------------------------------------------------------

function isOwnerOrAdmin(role: string | null): boolean {
  return role === "owner" || role === "admin";
}

// ---------------------------------------------------------------------------
// Crea configurazione conversione
// ---------------------------------------------------------------------------

export async function createConversionConfig(
  formData: FormData
): Promise<ActionResult<EmissionConversionConfig>> {
  const authResult = await requireAuth();
  if (!authResult.success) return authResult;
  const { ctx } = authResult;

  if (!isOwnerOrAdmin(ctx.role)) {
    return {
      success: false,
      error: "Permessi insufficienti. Solo owner e admin possono gestire le configurazioni.",
      code: ErrorCode.FORBIDDEN,
    };
  }

  const parsed = emissionConversionConfigSchema.safeParse({
    name: formData.get("name"),
    nedcToWltpFactor: Number(formData.get("nedcToWltpFactor")),
    wltpToNedcFactor: Number(formData.get("wltpToNedcFactor")),
    isDefault: formData.get("isDefault") === "true",
  });

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0].message,
      code: ErrorCode.VALIDATION,
    };
  }

  try {
    const { isDefault, ...rest } = parsed.data;

    // Se la nuova configurazione e predefinita, rimuovi il flag dalle altre
    if (isDefault) {
      await prisma.emissionConversionConfig.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    const config = await prisma.emissionConversionConfig.create({
      data: {
        ...rest,
        isDefault,
        createdById: ctx.userId,
      },
    });

    return { success: true, data: config };
  } catch (error) {
    logger.error({ error, userId: ctx.userId }, "Failed to create conversion config");
    return {
      success: false,
      error: "Errore nella creazione della configurazione",
      code: ErrorCode.INTERNAL,
    };
  }
}

// ---------------------------------------------------------------------------
// Aggiorna configurazione conversione
// ---------------------------------------------------------------------------

export async function updateConversionConfig(
  id: string,
  formData: FormData
): Promise<ActionResult<EmissionConversionConfig>> {
  const authResult = await requireAuth();
  if (!authResult.success) return authResult;
  const { ctx } = authResult;

  if (!isOwnerOrAdmin(ctx.role)) {
    return {
      success: false,
      error: "Permessi insufficienti. Solo owner e admin possono gestire le configurazioni.",
      code: ErrorCode.FORBIDDEN,
    };
  }

  const existing = await prisma.emissionConversionConfig.findUnique({
    where: { id },
  });

  if (!existing) {
    return {
      success: false,
      error: "Configurazione non trovata",
      code: ErrorCode.NOT_FOUND,
    };
  }

  const parsed = emissionConversionConfigSchema.safeParse({
    name: formData.get("name"),
    nedcToWltpFactor: Number(formData.get("nedcToWltpFactor")),
    wltpToNedcFactor: Number(formData.get("wltpToNedcFactor")),
    isDefault: formData.get("isDefault") === "true",
  });

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0].message,
      code: ErrorCode.VALIDATION,
    };
  }

  try {
    const { isDefault, ...rest } = parsed.data;

    // Se diventa predefinita, rimuovi il flag dalle altre
    if (isDefault && !existing.isDefault) {
      await prisma.emissionConversionConfig.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    const config = await prisma.emissionConversionConfig.update({
      where: { id },
      data: {
        ...rest,
        isDefault,
      },
    });

    return { success: true, data: config };
  } catch (error) {
    logger.error({ error, userId: ctx.userId }, "Failed to update conversion config");
    return {
      success: false,
      error: "Errore nell'aggiornamento della configurazione",
      code: ErrorCode.INTERNAL,
    };
  }
}

// ---------------------------------------------------------------------------
// Elimina configurazione conversione
// ---------------------------------------------------------------------------

export async function deleteConversionConfig(
  id: string
): Promise<ActionResult<{ id: string }>> {
  const authResult = await requireAuth();
  if (!authResult.success) return authResult;
  const { ctx } = authResult;

  if (!isOwnerOrAdmin(ctx.role)) {
    return {
      success: false,
      error: "Permessi insufficienti. Solo owner e admin possono gestire le configurazioni.",
      code: ErrorCode.FORBIDDEN,
    };
  }

  const existing = await prisma.emissionConversionConfig.findUnique({
    where: { id },
  });

  if (!existing) {
    return {
      success: false,
      error: "Configurazione non trovata",
      code: ErrorCode.NOT_FOUND,
    };
  }

  if (existing.isDefault) {
    return {
      success: false,
      error: "Non e possibile eliminare la configurazione predefinita",
      code: ErrorCode.CONFLICT,
    };
  }

  // Verifica che non ci siano motori collegati
  const enginesCount = await prisma.engine.count({
    where: { conversionConfigId: id },
  });

  if (enginesCount > 0) {
    return {
      success: false,
      error: `Non e possibile eliminare: ${enginesCount} motori usano questa configurazione`,
      code: ErrorCode.CONFLICT,
    };
  }

  try {
    await prisma.emissionConversionConfig.delete({
      where: { id },
    });

    return { success: true, data: { id } };
  } catch (error) {
    logger.error({ error, userId: ctx.userId }, "Failed to delete conversion config");
    return {
      success: false,
      error: "Errore nell'eliminazione della configurazione",
      code: ErrorCode.INTERNAL,
    };
  }
}

// ---------------------------------------------------------------------------
// Imposta configurazione predefinita
// ---------------------------------------------------------------------------

export async function setDefaultConversionConfig(
  id: string
): Promise<ActionResult<EmissionConversionConfig>> {
  const authResult = await requireAuth();
  if (!authResult.success) return authResult;
  const { ctx } = authResult;

  if (!isOwnerOrAdmin(ctx.role)) {
    return {
      success: false,
      error: "Permessi insufficienti. Solo owner e admin possono gestire le configurazioni.",
      code: ErrorCode.FORBIDDEN,
    };
  }

  const existing = await prisma.emissionConversionConfig.findUnique({
    where: { id },
  });

  if (!existing) {
    return {
      success: false,
      error: "Configurazione non trovata",
      code: ErrorCode.NOT_FOUND,
    };
  }

  if (existing.isDefault) {
    return { success: true, data: existing };
  }

  try {
    // Rimuovi il flag predefinito da tutte le altre
    await prisma.emissionConversionConfig.updateMany({
      where: { isDefault: true },
      data: { isDefault: false },
    });

    // Imposta la nuova come predefinita
    const config = await prisma.emissionConversionConfig.update({
      where: { id },
      data: { isDefault: true },
    });

    return { success: true, data: config };
  } catch (error) {
    logger.error({ error, userId: ctx.userId }, "Failed to set default conversion config");
    return {
      success: false,
      error: "Errore nell'impostazione della configurazione predefinita",
      code: ErrorCode.INTERNAL,
    };
  }
}
