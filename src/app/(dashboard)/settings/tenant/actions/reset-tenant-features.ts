"use server";

import { requireAuth, isGlobalAdmin } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db/client";
import { ErrorCode, type ActionResult } from "@/types/action-result";
import { ALL_FEATURE_KEYS, DEFAULT_FEATURES } from "@/lib/services/feature-keys";
import { logger } from "@/lib/utils/logger";

type FeatureStatus = { featureKey: string; enabled: boolean };

export async function resetTenantFeatures(
  tenantId: string
): Promise<ActionResult<FeatureStatus[]>> {
  const authResult = await requireAuth();
  if (!authResult.success) return authResult;

  const isAdmin = await isGlobalAdmin(authResult.ctx.userId);
  if (!isAdmin) {
    return {
      success: false,
      error: "Solo l'Admin della piattaforma puo resettare le feature",
      code: ErrorCode.FORBIDDEN,
    };
  }

  try {
    // Upsert all features to default values
    for (const featureKey of ALL_FEATURE_KEYS) {
      await prisma.tenantFeature.upsert({
        where: { tenantId_featureKey: { tenantId, featureKey } },
        update: { enabled: DEFAULT_FEATURES.includes(featureKey) },
        create: {
          tenantId,
          featureKey,
          enabled: DEFAULT_FEATURES.includes(featureKey),
        },
      });
    }

    logger.info(
      { tenantId, userId: authResult.ctx.userId },
      "Tenant features reset to defaults"
    );

    const result = ALL_FEATURE_KEYS.map((key) => ({
      featureKey: key,
      enabled: DEFAULT_FEATURES.includes(key),
    }));

    return { success: true, data: result };
  } catch (error) {
    logger.error(
      { error, tenantId, userId: authResult.ctx.userId },
      "Failed to reset tenant features"
    );
    return {
      success: false,
      error: "Errore nel ripristino delle feature",
      code: ErrorCode.INTERNAL,
    };
  }
}
