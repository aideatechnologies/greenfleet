import { z } from "zod";

// ---------------------------------------------------------------------------
// Create fuel type mapping schema
// ---------------------------------------------------------------------------

export const createFuelTypeMappingSchema = z.object({
  vehicleFuelType: z
    .string()
    .min(1, { error: "Il tipo carburante veicolo e obbligatorio" })
    .max(100, { error: "Il tipo carburante non puo superare 100 caratteri" }),
  macroFuelTypeId: z
    .coerce.number({ error: "Il macro tipo carburante e obbligatorio" }),
  scope: z
    .number()
    .int()
    .min(1)
    .max(2, { error: "Lo scope deve essere 1 o 2" }),
  description: z
    .string()
    .max(100, { error: "La descrizione non puo superare 100 caratteri" })
    .default(""),
});

export type CreateFuelTypeMappingInput = z.input<typeof createFuelTypeMappingSchema>;
export type CreateFuelTypeMappingData = z.output<typeof createFuelTypeMappingSchema>;

// ---------------------------------------------------------------------------
// Update fuel type mapping schema
// ---------------------------------------------------------------------------

export const updateFuelTypeMappingSchema = z.object({
  macroFuelTypeId: z
    .coerce.number({ error: "Il macro tipo carburante e obbligatorio" }),
  description: z
    .string()
    .max(100, { error: "La descrizione non puo superare 100 caratteri" })
    .optional(),
});

export type UpdateFuelTypeMappingInput = z.input<typeof updateFuelTypeMappingSchema>;
export type UpdateFuelTypeMappingData = z.output<typeof updateFuelTypeMappingSchema>;
