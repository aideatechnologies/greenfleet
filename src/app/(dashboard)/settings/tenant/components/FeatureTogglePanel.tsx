"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  FEATURE_CATEGORIES,
  FEATURE_KEY_LABELS,
  FEATURE_KEY_DESCRIPTIONS,
  type FeatureKey,
} from "@/lib/services/feature-keys";
import { toggleFeature } from "../actions/toggle-feature";
import { resetTenantFeatures } from "../actions/reset-tenant-features";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type FeatureStatus = { featureKey: string; enabled: boolean };

export function FeatureTogglePanel({
  tenantId,
  features: initialFeatures,
}: {
  tenantId: string;
  features: FeatureStatus[];
}) {
  const [features, setFeatures] = useState(initialFeatures);
  const [loading, setLoading] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);

  const isEnabled = (key: string) =>
    features.find((f) => f.featureKey === key)?.enabled ?? false;

  async function handleToggle(featureKey: string, enabled: boolean) {
    // Optimistic update
    setFeatures((prev) =>
      prev.map((f) =>
        f.featureKey === featureKey ? { ...f, enabled } : f
      )
    );
    setLoading(featureKey);

    const result = await toggleFeature({ tenantId, featureKey, enabled });

    if (!result.success) {
      // Rollback on error
      setFeatures((prev) =>
        prev.map((f) =>
          f.featureKey === featureKey ? { ...f, enabled: !enabled } : f
        )
      );
      toast.error(result.error);
    } else {
      toast.success(
        `${FEATURE_KEY_LABELS[featureKey as FeatureKey]} ${enabled ? "abilitata" : "disabilitata"}`
      );
    }

    setLoading(null);
  }

  async function handleReset() {
    setResetting(true);
    const result = await resetTenantFeatures(tenantId);

    if (result.success) {
      setFeatures(result.data);
      toast.success("Feature ripristinate ai valori predefiniti");
    } else {
      toast.error(result.error);
    }

    setResetting(false);
  }

  return (
    <div className="space-y-6">
      {FEATURE_CATEGORIES.map((category) => (
        <Card key={category.label}>
          <CardHeader>
            <CardTitle className="text-lg">{category.label}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {category.features.map((key) => (
              <div
                key={key}
                className="flex items-center justify-between rounded-lg border p-4"
              >
                <div className="space-y-0.5 pr-4">
                  <div className="text-sm font-medium">
                    {FEATURE_KEY_LABELS[key]}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {FEATURE_KEY_DESCRIPTIONS[key]}
                  </div>
                </div>
                <Switch
                  checked={isEnabled(key)}
                  disabled={loading === key}
                  onCheckedChange={(checked) => handleToggle(key, checked)}
                  aria-label={`Toggle ${FEATURE_KEY_LABELS[key]}`}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      ))}

      <div className="flex justify-end">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" disabled={resetting}>
              {resetting ? "Ripristino in corso..." : "Ripristina predefiniti"}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                Ripristinare le feature predefinite?
              </AlertDialogTitle>
              <AlertDialogDescription>
                Tutte le feature verranno ripristinate ai valori predefiniti.
                Questa azione non puo essere annullata.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annulla</AlertDialogCancel>
              <AlertDialogAction onClick={handleReset}>
                Ripristina
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
