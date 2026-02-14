import { z } from "zod";
import { FeatureKey } from "@/lib/services/feature-keys";

export const toggleFeatureSchema = z.object({
  tenantId: z.string().min(1, "ID tenant richiesto"),
  featureKey: z.nativeEnum(FeatureKey, {
    error: "Feature key non valida",
  }),
  enabled: z.boolean({
    error: "Il campo enabled è obbligatorio",
  }),
});

export type ToggleFeatureInput = z.infer<typeof toggleFeatureSchema>;
