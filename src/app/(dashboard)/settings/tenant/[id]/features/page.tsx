import { prisma } from "@/lib/db/client";
import { notFound, redirect } from "next/navigation";
import { getSessionContext, isGlobalAdmin } from "@/lib/auth/permissions";
import { FeatureTogglePanel } from "../../components/FeatureTogglePanel";
import {
  ALL_FEATURE_KEYS,
  DEFAULT_FEATURES,
  type FeatureKey,
} from "@/lib/services/feature-keys";

export default async function TenantFeaturesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const ctx = await getSessionContext();
  if (!ctx) redirect("/login");

  const isAdmin = await isGlobalAdmin(ctx.userId);
  if (!isAdmin) redirect("/");

  const tenant = await prisma.organization.findUnique({
    where: { id },
    select: { id: true, name: true, slug: true },
  });

  if (!tenant) notFound();

  const features = await prisma.tenantFeature.findMany({
    where: { tenantId: id },
    select: { featureKey: true, enabled: true },
  });

  const featureMap = new Map(
    features.map((f) => [f.featureKey, f.enabled])
  );

  const allFeatures = ALL_FEATURE_KEYS.map((key) => ({
    featureKey: key,
    enabled: featureMap.has(key)
      ? featureMap.get(key)!
      : DEFAULT_FEATURES.includes(key as FeatureKey),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          Feature &mdash; {tenant.name}
        </h2>
        <p className="text-muted-foreground">
          Configura le funzionalita abilitate per questo tenant.
        </p>
      </div>
      <FeatureTogglePanel tenantId={tenant.id} features={allFeatures} />
    </div>
  );
}
