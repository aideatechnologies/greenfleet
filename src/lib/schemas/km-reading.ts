import { z } from "zod";
import { DEFAULT_PAGE_SIZE } from "@/lib/utils/constants";

// ---------------------------------------------------------------------------
// Create km reading schema
// ---------------------------------------------------------------------------

export const createKmReadingSchema = z.object({
  vehicleId: z.coerce.number({ error: "Il veicolo e obbligatorio" }),
  date: z.coerce.date({ error: "La data e obbligatoria" }),
  odometerKm: z
    .number({ error: "Il chilometraggio e obbligatorio" })
    .int({ error: "Il chilometraggio deve essere un numero intero" })
    .nonnegative({ error: "Il chilometraggio non puo essere negativo" }),
  notes: z
    .string()
    .max(500, { error: "Le note non possono superare 500 caratteri" })
    .optional()
    .transform((val) => (val === "" ? undefined : val)),
});

export type CreateKmReadingInput = z.input<typeof createKmReadingSchema>;
export type CreateKmReadingData = z.output<typeof createKmReadingSchema>;

// ---------------------------------------------------------------------------
// Update km reading schema
// ---------------------------------------------------------------------------

export const updateKmReadingSchema = z.object({
  date: z.coerce.date({ error: "La data e obbligatoria" }),
  odometerKm: z
    .number({ error: "Il chilometraggio e obbligatorio" })
    .int({ error: "Il chilometraggio deve essere un numero intero" })
    .nonnegative({ error: "Il chilometraggio non puo essere negativo" }),
  notes: z
    .string()
    .max(500, { error: "Le note non possono superare 500 caratteri" })
    .optional()
    .transform((val) => (val === "" ? undefined : val)),
});

export type UpdateKmReadingInput = z.input<typeof updateKmReadingSchema>;
export type UpdateKmReadingData = z.output<typeof updateKmReadingSchema>;

// ---------------------------------------------------------------------------
// Filter schema for list view
// ---------------------------------------------------------------------------

export const kmReadingFilterSchema = z.object({
  vehicleId: z.coerce.number().optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  search: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(DEFAULT_PAGE_SIZE),
});

export type KmReadingFilterInput = z.infer<typeof kmReadingFilterSchema>;
