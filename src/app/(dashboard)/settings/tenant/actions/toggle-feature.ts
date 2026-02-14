"use server";

import { requireAuth, isGlobalAdmin } from "@/lib/auth/permissions";
import { toggleFeatureSchema } from "@/lib/schemas/feature";
import { prisma } from "@/lib/db/client";
import { ErrorCode, type ActionResult } from "@/types/action-result";
import { logger } from "@/lib/utils/logger";

type ToggleFeatureResult = { featureKey: string; enabled: boolean };

export async function toggleFeature(
  input: unknown
): Promise<ActionResult<ToggleFeatureResult>> {
  const authResult = await requireAuth();
  if (!authResult.success) return authResult;

  const isAdmin = await isGlobalAdmin(authResult.ctx.userId);
  if (!isAdmin) {
    return {
      success: false,
      error: "Solo l'Admin della piattaforma puo gestire le feature",
      code: ErrorCode.FORBIDDEN,
    };
  }

  const parsed = toggleFeatureSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Dati non validi",
      code: ErrorCode.VALIDATION,
    };
  }

  const { tenantId, featureKey, enabled } = parsed.data;

  try {
    const feature = await prisma.tenantFeature.upsert({
      where: { tenantId_featureKey: { tenantId, featureKey } },
      update: { enabled },
      create: { tenantId, featureKey, enabled },
    });

    logger.info(
      { tenantId, featureKey, enabled, userId: authResult.ctx.userId },
      "Feature toggle changed"
    );

    return {
      success: true,
      data: { featureKey: feature.featureKey, enabled: feature.enabled },
    };
  } catch (error) {
    logger.error(
      { error, tenantId, featureKey, userId: authResult.ctx.userId },
      "Failed to toggle feature"
    );
    return {
      success: false,
      error: "Errore nell'aggiornamento della feature",
      code: ErrorCode.INTERNAL,
    };
  }
}
