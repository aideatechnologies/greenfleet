import { z } from "zod";
import { DEFAULT_PAGE_SIZE } from "@/lib/utils/constants";

// ---------------------------------------------------------------------------
// Factory function for i18n
// ---------------------------------------------------------------------------

type T = (key: string) => string;

const IT: Record<string, string> = {
  vehicleRequired: "Il veicolo e obbligatorio",
  dateRequired: "La data e obbligatoria",
  fuelTypeRequired: "Il tipo carburante e obbligatorio",
  quantityRequired: "La quantita e obbligatoria",
  quantityPositive: "La quantita deve essere positiva",
  quantityKwhPositive: "La quantita kWh deve essere positiva",
  amountRequired: "L'importo e obbligatorio",
  amountPositive: "L'importo deve essere positivo",
  odometerRequired: "Il chilometraggio e obbligatorio",
  odometerInt: "Il chilometraggio deve essere un numero intero",
  odometerNonnegative: "Il chilometraggio non puo essere negativo",
  fuelCardRequired: "La carta carburante e obbligatoria",
  notesMax: "Le note non possono superare 1000 caratteri",
};

const itFallback: T = (k) => IT[k] ?? k;

export function buildCreateFuelRecordSchema(t: T = itFallback) {
  return z.object({
    vehicleId: z.coerce.number({ error: t("vehicleRequired") }),
    date: z.coerce.date({ error: t("dateRequired") }),
    fuelType: z.string().min(1, { error: t("fuelTypeRequired") }),
    quantityLiters: z
      .number({ error: t("quantityRequired") })
      .positive({ error: t("quantityPositive") }),
    quantityKwh: z
      .number()
      .positive({ error: t("quantityKwhPositive") })
      .nullable()
      .optional()
      .transform((val) => (val === 0 ? undefined : val)),
    amountEur: z
      .number({ error: t("amountRequired") })
      .positive({ error: t("amountPositive") }),
    odometerKm: z
      .number({ error: t("odometerRequired") })
      .int({ error: t("odometerInt") })
      .nonnegative({ error: t("odometerNonnegative") }),
    fuelCardId: z.coerce.number({ error: t("fuelCardRequired") }),
    notes: z
      .string()
      .max(1000, { error: t("notesMax") })
      .optional()
      .transform((val) => (val === "" ? undefined : val)),
  });
}

export function buildUpdateFuelRecordSchema(t: T = itFallback) {
  return z.object({
    date: z.coerce.date({ error: t("dateRequired") }),
    fuelType: z.string().min(1, { error: t("fuelTypeRequired") }),
    quantityLiters: z
      .number({ error: t("quantityRequired") })
      .positive({ error: t("quantityPositive") }),
    quantityKwh: z
      .number()
      .positive({ error: t("quantityKwhPositive") })
      .nullable()
      .optional()
      .transform((val) => (val === 0 ? undefined : val)),
    amountEur: z
      .number({ error: t("amountRequired") })
      .positive({ error: t("amountPositive") }),
    odometerKm: z
      .number({ error: t("odometerRequired") })
      .int({ error: t("odometerInt") })
      .nonnegative({ error: t("odometerNonnegative") }),
    fuelCardId: z.coerce.number({ error: t("fuelCardRequired") }),
    notes: z
      .string()
      .max(1000, { error: t("notesMax") })
      .optional()
      .transform((val) => (val === "" ? undefined : val)),
  });
}

// ---------------------------------------------------------------------------
// Default instances (Italian) — backward compatible
// ---------------------------------------------------------------------------

export const createFuelRecordSchema = buildCreateFuelRecordSchema();
export const updateFuelRecordSchema = buildUpdateFuelRecordSchema();

export type CreateFuelRecordInput = z.input<typeof createFuelRecordSchema>;
export type CreateFuelRecordData = z.output<typeof createFuelRecordSchema>;
export type UpdateFuelRecordInput = z.input<typeof updateFuelRecordSchema>;
export type UpdateFuelRecordData = z.output<typeof updateFuelRecordSchema>;

// ---------------------------------------------------------------------------
// Filter schema for list view
// ---------------------------------------------------------------------------

export const fuelRecordFilterSchema = z.object({
  vehicleId: z.coerce.number().optional(),
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
