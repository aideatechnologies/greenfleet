import { prisma } from "@/lib/db/client";
import { FeatureKey } from "./feature-keys";
import { ErrorCode } from "@/types/action-result";

/**
 * Check if a specific feature is enabled for a tenant.
 * Returns false if the feature record does not exist.
 */
export async function isFeatureEnabled(
  tenantId: string,
  featureKey: FeatureKey
): Promise<boolean> {
  const feature = await prisma.tenantFeature.findUnique({
    where: { tenantId_featureKey: { tenantId, featureKey } },
    select: { enabled: true },
  });
  return feature?.enabled ?? false;
}

/**
 * Require a feature to be enabled for a tenant.
 * Throws an ActionResult-shaped error if the feature is not enabled.
 */
export async function requireFeature(
  tenantId: string,
  featureKey: FeatureKey
): Promise<void> {
  const enabled = await isFeatureEnabled(tenantId, featureKey);
  if (!enabled) {
    throw {
      success: false,
      error: `Feature "${featureKey}" non abilitata per questo tenant`,
      code: ErrorCode.FORBIDDEN,
    };
  }
}

/**
 * Get all enabled feature keys for a tenant.
 */
export async function getEnabledFeatures(
  tenantId: string
): Promise<FeatureKey[]> {
  const features = await prisma.tenantFeature.findMany({
    where: { tenantId, enabled: true },
    select: { featureKey: true },
  });
  return features.map((f) => f.featureKey as FeatureKey);
}
