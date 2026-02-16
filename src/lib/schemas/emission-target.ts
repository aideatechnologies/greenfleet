import { z } from "zod";

// ---------------------------------------------------------------------------
// Scope and Period constants
// ---------------------------------------------------------------------------

export const TARGET_SCOPE_VALUES = ["Fleet", "Carlist"] as const;
export const TARGET_PERIOD_VALUES = ["Annual", "Monthly"] as const;

// ---------------------------------------------------------------------------
// Create emission target schema
// ---------------------------------------------------------------------------

export const createEmissionTargetSchema = z
  .object({
    scope: z.enum(TARGET_SCOPE_VALUES, {
      error: "L'ambito del target e obbligatorio",
    }),
    carlistId: z
      .coerce.number({ error: "La carlist e obbligatoria quando l'ambito e Carlist" })
      .optional(),
    targetValue: z
      .number({ error: "Il valore obiettivo e obbligatorio" })
      .positive({ error: "Il valore obiettivo deve essere positivo" }),
    period: z.enum(TARGET_PERIOD_VALUES, {
      error: "Il periodo e obbligatorio",
    }),
    startDate: z.coerce.date({ error: "La data di inizio e obbligatoria" }),
    endDate: z.coerce.date({ error: "La data di fine e obbligatoria" }),
    description: z
      .string()
      .max(500, { error: "La descrizione non puo superare 500 caratteri" })
      .optional()
      .transform((val) => (val === "" ? undefined : val)),
  })
  .refine(
    (data) => {
      if (data.scope === "Carlist") {
        return !!data.carlistId;
      }
      return true;
    },
    {
      message: "La carlist e obbligatoria quando l'ambito e Carlist",
      path: ["carlistId"],
    }
  )
  .refine((data) => data.endDate > data.startDate, {
    message: "La data di fine deve essere successiva alla data di inizio",
    path: ["endDate"],
  });

export type CreateEmissionTargetInput = z.input<
  typeof createEmissionTargetSchema
>;
export type CreateEmissionTargetData = z.output<
  typeof createEmissionTargetSchema
>;

// ---------------------------------------------------------------------------
// Update emission target schema
// ---------------------------------------------------------------------------

export const updateEmissionTargetSchema = z
  .object({
    id: z.coerce.number({ error: "L'ID del target e obbligatorio" }),
    scope: z.enum(TARGET_SCOPE_VALUES, {
      error: "L'ambito del target e obbligatorio",
    }),
    carlistId: z
      .coerce.number({ error: "La carlist e obbligatoria quando l'ambito e Carlist" })
      .optional(),
    targetValue: z
      .number({ error: "Il valore obiettivo e obbligatorio" })
      .positive({ error: "Il valore obiettivo deve essere positivo" }),
    period: z.enum(TARGET_PERIOD_VALUES, {
      error: "Il periodo e obbligatorio",
    }),
    startDate: z.coerce.date({ error: "La data di inizio e obbligatoria" }),
    endDate: z.coerce.date({ error: "La data di fine e obbligatoria" }),
    description: z
      .string()
      .max(500, { error: "La descrizione non puo superare 500 caratteri" })
      .optional()
      .transform((val) => (val === "" ? undefined : val)),
  })
  .refine(
    (data) => {
      if (data.scope === "Carlist") {
        return !!data.carlistId;
      }
      return true;
    },
    {
      message: "La carlist e obbligatoria quando l'ambito e Carlist",
      path: ["carlistId"],
    }
  )
  .refine((data) => data.endDate > data.startDate, {
    message: "La data di fine deve essere successiva alla data di inizio",
    path: ["endDate"],
  });

export type UpdateEmissionTargetInput = z.input<
  typeof updateEmissionTargetSchema
>;
export type UpdateEmissionTargetData = z.output<
  typeof updateEmissionTargetSchema
>;
