import { z } from "zod";

// ---------------------------------------------------------------------------
// GWP gas names
// ---------------------------------------------------------------------------

const GAS_NAMES = ["CO2", "CH4", "N2O", "HFC", "PFC", "SF6", "NF3"] as const;

// ---------------------------------------------------------------------------
// Create GWP config schema
// ---------------------------------------------------------------------------

export const createGwpConfigSchema = z.object({
  gasName: z.enum(GAS_NAMES, { error: "Nome gas non valido" }),
  gwpValue: z
    .number()
    .positive({ error: "Il valore GWP deve essere positivo" }),
  source: z
    .string()
    .min(1, { error: "La fonte e obbligatoria" })
    .max(100, { error: "La fonte non puo superare 100 caratteri" }),
});

export type CreateGwpConfigInput = z.input<typeof createGwpConfigSchema>;
export type CreateGwpConfigData = z.output<typeof createGwpConfigSchema>;

// ---------------------------------------------------------------------------
// Update GWP config schema
// ---------------------------------------------------------------------------

export const updateGwpConfigSchema = z.object({
  gwpValue: z
    .number()
    .positive({ error: "Il valore GWP deve essere positivo" })
    .optional(),
  source: z.string().min(1).max(100).optional(),
  isActive: z.boolean().optional(),
});

export type UpdateGwpConfigInput = z.input<typeof updateGwpConfigSchema>;
export type UpdateGwpConfigData = z.output<typeof updateGwpConfigSchema>;
