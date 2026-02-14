"use server";

import { requireAuth, isGlobalAdmin } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db/client";
import { ErrorCode, type ActionResult } from "@/types/action-result";
import {
  ALL_FEATURE_KEYS,
  DEFAULT_FEATURES,
  type FeatureKey,
} from "@/lib/services/feature-keys";

type FeatureStatus = { featureKey: string; enabled: boolean };

export async function getTenantFeatures(
  tenantId: string
): Promise<ActionResult<FeatureStatus[]>> {
  const authResult = await requireAuth();
  if (!authResult.success) return authResult;

  const isAdmin = await isGlobalAdmin(authResult.ctx.userId);
  if (!isAdmin) {
    return {
      success: false,
      error: "Solo l'Admin della piattaforma puo visualizzare le feature",
      code: ErrorCode.FORBIDDEN,
    };
  }

  try {
    const features = await prisma.tenantFeature.findMany({
      where: { tenantId },
      select: { featureKey: true, enabled: true },
    });

    const featureMap = new Map(
      features.map((f) => [f.featureKey, f.enabled])
    );

    // Return all features, defaulting to DEFAULT_FEATURES for unconfigured ones
    const allFeatures = ALL_FEATURE_KEYS.map((key) => ({
      featureKey: key,
      enabled: featureMap.has(key)
        ? featureMap.get(key)!
        : DEFAULT_FEATURES.includes(key as FeatureKey),
    }));

    return { success: true, data: allFeatures };
  } catch (error) {
    return {
      success: false,
      error: "Errore nel recupero delle feature",
      code: ErrorCode.INTERNAL,
    };
  }
}
