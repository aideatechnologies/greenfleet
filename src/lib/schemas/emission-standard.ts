import { z } from "zod";

// ---------------------------------------------------------------------------
// Valori standard emissioni
// ---------------------------------------------------------------------------

export const co2StandardValues = ["WLTP", "NEDC"] as const;
export type Co2Standard = (typeof co2StandardValues)[number];

// ---------------------------------------------------------------------------
// Schema configurazione conversione emissioni
// ---------------------------------------------------------------------------

export const emissionConversionConfigSchema = z.object({
  name: z
    .string()
    .min(1, { error: "Nome obbligatorio" })
    .max(100, { error: "Nome troppo lungo (max 100 caratteri)" }),
  nedcToWltpFactor: z
    .number()
    .min(1.0, { error: "Il fattore NEDC->WLTP deve essere almeno 1,00" })
    .max(2.0, { error: "Il fattore NEDC->WLTP non puo superare 2,00" }),
  wltpToNedcFactor: z
    .number()
    .min(0.5, { error: "Il fattore WLTP->NEDC deve essere almeno 0,50" })
    .max(1.0, { error: "Il fattore WLTP->NEDC non puo superare 1,00" }),
  isDefault: z.boolean(),
});

export type EmissionConversionConfigInput = z.infer<
  typeof emissionConversionConfigSchema
>;

// ---------------------------------------------------------------------------
// Schema input emissioni motore
// ---------------------------------------------------------------------------

export const engineEmissionInputSchema = z
  .object({
    co2GKmWltp: z.number().nonnegative().optional(),
    co2GKmNedc: z.number().nonnegative().optional(),
    co2Standard: z.enum(co2StandardValues, {
      error: "Standard emissioni non valido",
    }),
  })
  .refine((data) => data.co2GKmWltp != null || data.co2GKmNedc != null, {
    message: "Almeno un valore CO2 (WLTP o NEDC) e obbligatorio",
  });

export type EngineEmissionInput = z.infer<typeof engineEmissionInputSchema>;
