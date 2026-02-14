import { z } from "zod";
import { DEFAULT_PAGE_SIZE } from "@/lib/utils/constants";

// ---------------------------------------------------------------------------
// Create emission factor schema (V2: per-gas)
// ---------------------------------------------------------------------------

export const createEmissionFactorSchema = z.object({
  macroFuelTypeId: z
    .string()
    .min(1, { error: "Il macro tipo carburante e obbligatorio" }),
  fuelType: z
    .string()
    .max(100, { error: "Il tipo carburante non puo superare 100 caratteri" })
    .optional()
    .transform((v) => (v && v.trim() !== "" ? v.trim() : undefined)),
  co2: z
    .number()
    .nonnegative({ error: "Il valore CO2 non puo essere negativo" })
    .default(0),
  ch4: z
    .number()
    .nonnegative({ error: "Il valore CH4 non puo essere negativo" })
    .default(0),
  n2o: z
    .number()
    .nonnegative({ error: "Il valore N2O non puo essere negativo" })
    .default(0),
  hfc: z
    .number()
    .nonnegative({ error: "Il valore HFC non puo essere negativo" })
    .default(0),
  pfc: z
    .number()
    .nonnegative({ error: "Il valore PFC non puo essere negativo" })
    .default(0),
  sf6: z
    .number()
    .nonnegative({ error: "Il valore SF6 non puo essere negativo" })
    .default(0),
  nf3: z
    .number()
    .nonnegative({ error: "Il valore NF3 non puo essere negativo" })
    .default(0),
  source: z
    .string()
    .min(1, { error: "La fonte e obbligatoria" })
    .max(100, { error: "La fonte non puo superare 100 caratteri" }),
  effectiveDate: z.coerce.date({ error: "La data di efficacia e obbligatoria" }),
});

export type CreateEmissionFactorInput = z.input<typeof createEmissionFactorSchema>;
export type CreateEmissionFactorData = z.output<typeof createEmissionFactorSchema>;

// ---------------------------------------------------------------------------
// Update emission factor schema
// ---------------------------------------------------------------------------

export const updateEmissionFactorSchema = z.object({
  macroFuelTypeId: z.string().min(1).optional(),
  fuelType: z
    .string()
    .max(100)
    .optional()
    .transform((v) => (v && v.trim() !== "" ? v.trim() : null)),
  co2: z.number().nonnegative().optional(),
  ch4: z.number().nonnegative().optional(),
  n2o: z.number().nonnegative().optional(),
  hfc: z.number().nonnegative().optional(),
  pfc: z.number().nonnegative().optional(),
  sf6: z.number().nonnegative().optional(),
  nf3: z.number().nonnegative().optional(),
  source: z.string().min(1).max(100).optional(),
  effectiveDate: z.coerce.date().optional(),
});

export type UpdateEmissionFactorInput = z.input<typeof updateEmissionFactorSchema>;
export type UpdateEmissionFactorData = z.output<typeof updateEmissionFactorSchema>;

// ---------------------------------------------------------------------------
// Filter schema for list view
// ---------------------------------------------------------------------------

export const emissionFactorFilterSchema = z.object({
  macroFuelTypeId: z.string().optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(DEFAULT_PAGE_SIZE),
});

export type EmissionFactorFilterInput = z.infer<typeof emissionFactorFilterSchema>;
