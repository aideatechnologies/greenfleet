import { z } from "zod";
import { DEFAULT_PAGE_SIZE } from "@/lib/utils/constants";

// ---------------------------------------------------------------------------
// Create fuel record schema
// ---------------------------------------------------------------------------

export const createFuelRecordSchema = z.object({
  vehicleId: z.string().min(1, { error: "Il veicolo e obbligatorio" }),
  date: z.coerce.date({ error: "La data e obbligatoria" }),
  fuelType: z.string().min(1, { error: "Il tipo carburante e obbligatorio" }),
  quantityLiters: z
    .number({ error: "La quantita e obbligatoria" })
    .positive({ error: "La quantita deve essere positiva" }),
  quantityKwh: z
    .number()
    .positive({ error: "La quantita kWh deve essere positiva" })
    .nullable()
    .optional()
    .transform((val) => (val === 0 ? undefined : val)),
  amountEur: z
    .number({ error: "L'importo e obbligatorio" })
    .positive({ error: "L'importo deve essere positivo" }),
  odometerKm: z
    .number({ error: "Il chilometraggio e obbligatorio" })
    .int({ error: "Il chilometraggio deve essere un numero intero" })
    .nonnegative({ error: "Il chilometraggio non puo essere negativo" }),
  notes: z
    .string()
    .max(1000, { error: "Le note non possono superare 1000 caratteri" })
    .optional()
    .transform((val) => (val === "" ? undefined : val)),
});

export type CreateFuelRecordInput = z.input<typeof createFuelRecordSchema>;
export type CreateFuelRecordData = z.output<typeof createFuelRecordSchema>;

// ---------------------------------------------------------------------------
// Update fuel record schema
// ---------------------------------------------------------------------------

export const updateFuelRecordSchema = z.object({
  date: z.coerce.date({ error: "La data e obbligatoria" }),
  fuelType: z.string().min(1, { error: "Il tipo carburante e obbligatorio" }),
  quantityLiters: z
    .number({ error: "La quantita e obbligatoria" })
    .positive({ error: "La quantita deve essere positiva" }),
  quantityKwh: z
    .number()
    .positive({ error: "La quantita kWh deve essere positiva" })
    .nullable()
    .optional()
    .transform((val) => (val === 0 ? undefined : val)),
  amountEur: z
    .number({ error: "L'importo e obbligatorio" })
    .positive({ error: "L'importo deve essere positivo" }),
  odometerKm: z
    .number({ error: "Il chilometraggio e obbligatorio" })
    .int({ error: "Il chilometraggio deve essere un numero intero" })
    .nonnegative({ error: "Il chilometraggio non puo essere negativo" }),
  notes: z
    .string()
    .max(1000, { error: "Le note non possono superare 1000 caratteri" })
    .optional()
    .transform((val) => (val === "" ? undefined : val)),
});

export type UpdateFuelRecordInput = z.input<typeof updateFuelRecordSchema>;
export type UpdateFuelRecordData = z.output<typeof updateFuelRecordSchema>;

// ---------------------------------------------------------------------------
// Filter schema for list view
// ---------------------------------------------------------------------------

export const fuelRecordFilterSchema = z.object({
  vehicleId: z.string().optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  fuelType: z
    .string()
    .min(1)
    .optional(),
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(DEFAULT_PAGE_SIZE),
});

export type FuelRecordFilterInput = z.infer<typeof fuelRecordFilterSchema>;
