import { z } from "zod";

// ---------------------------------------------------------------------------
// Factory function for i18n
// ---------------------------------------------------------------------------

type T = (key: string) => string;

const IT: Record<string, string> = {
  vehicleFuelTypeRequired: "Il tipo carburante veicolo e obbligatorio",
  vehicleFuelTypeMax: "Il tipo carburante non puo superare 100 caratteri",
  macroFuelTypeRequired: "Il macro tipo carburante e obbligatorio",
  scopeRange: "Lo scope deve essere 1 o 2",
  descriptionMax: "La descrizione non puo superare 100 caratteri",
};

const itFallback: T = (k) => IT[k] ?? k;

// ---------------------------------------------------------------------------
// Create fuel type mapping schema
// ---------------------------------------------------------------------------

export function buildCreateFuelTypeMappingSchema(t: T = itFallback) {
  return z.object({
    vehicleFuelType: z
      .string()
      .min(1, { error: t("vehicleFuelTypeRequired") })
      .max(100, { error: t("vehicleFuelTypeMax") }),
    macroFuelTypeId: z
      .coerce.number({ error: t("macroFuelTypeRequired") }),
    scope: z
      .number()
      .int()
      .min(1)
      .max(2, { error: t("scopeRange") }),
    description: z
      .string()
      .max(100, { error: t("descriptionMax") })
      .default(""),
  });
}

// ---------------------------------------------------------------------------
// Update fuel type mapping schema
// ---------------------------------------------------------------------------

export function buildUpdateFuelTypeMappingSchema(t: T = itFallback) {
  return z.object({
    macroFuelTypeId: z
      .coerce.number({ error: t("macroFuelTypeRequired") }),
    description: z
      .string()
      .max(100, { error: t("descriptionMax") })
      .optional(),
  });
}

// ---------------------------------------------------------------------------
// Default instances (Italian) — backward compatible
// ---------------------------------------------------------------------------

export const createFuelTypeMappingSchema = buildCreateFuelTypeMappingSchema();
export const updateFuelTypeMappingSchema = buildUpdateFuelTypeMappingSchema();

export type CreateFuelTypeMappingInput = z.input<typeof createFuelTypeMappingSchema>;
export type CreateFuelTypeMappingData = z.output<typeof createFuelTypeMappingSchema>;
export type UpdateFuelTypeMappingInput = z.input<typeof updateFuelTypeMappingSchema>;
export type UpdateFuelTypeMappingData = z.output<typeof updateFuelTypeMappingSchema>;
