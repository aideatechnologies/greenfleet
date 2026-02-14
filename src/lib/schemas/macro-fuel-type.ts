import { z } from "zod";

// ---------------------------------------------------------------------------
// Create macro fuel type schema
// ---------------------------------------------------------------------------

export const createMacroFuelTypeSchema = z.object({
  name: z
    .string()
    .min(1, { error: "Il nome e obbligatorio" })
    .max(100, { error: "Il nome non puo superare 100 caratteri" }),
  scope: z
    .number()
    .int()
    .min(1)
    .max(2, { error: "Lo scope deve essere 1 (termico) o 2 (elettrico)" }),
  unit: z.enum(["L", "kg", "kWh", "Nm3", "UA"], {
    error: "L'unita di misura e obbligatoria",
  }),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, { error: "Il colore deve essere in formato hex (#RRGGBB)" })
    .default("#6366f1"),
  sortOrder: z.number().int().default(0),
});

export type CreateMacroFuelTypeInput = z.input<typeof createMacroFuelTypeSchema>;
export type CreateMacroFuelTypeData = z.output<typeof createMacroFuelTypeSchema>;

// ---------------------------------------------------------------------------
// Update macro fuel type schema
// ---------------------------------------------------------------------------

export const updateMacroFuelTypeSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  scope: z.number().int().min(1).max(2).optional(),
  unit: z.enum(["L", "kg", "kWh", "Nm3", "UA"]).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

export type UpdateMacroFuelTypeInput = z.input<typeof updateMacroFuelTypeSchema>;
export type UpdateMacroFuelTypeData = z.output<typeof updateMacroFuelTypeSchema>;
