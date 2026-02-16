import { z } from "zod";

// ---------------------------------------------------------------------------
// Aggregation level & period granularity
// ---------------------------------------------------------------------------

const aggregationLevelSchema = z.union([
  z.literal("FLEET"),
  z.literal("VEHICLE"),
  z.literal("CARLIST"),
  z.literal("FUEL_TYPE"),
  z.literal("PERIOD"),
]);

const periodGranularitySchema = z.union([
  z.literal("MONTHLY"),
  z.literal("QUARTERLY"),
  z.literal("YEARLY"),
]);

// ---------------------------------------------------------------------------
// Vehicle filters schema
// ---------------------------------------------------------------------------

export const vehicleFiltersSchema = z.object({
  licensePlates: z.array(z.string()).optional(),
  marca: z.array(z.string()).optional(),
  modello: z.string().optional(),
  fuelType: z.array(z.string()).optional(),
  carrozzeria: z.array(z.string()).optional(),
  isHybrid: z.boolean().optional(),
  cilindrataMin: z.number().optional(),
  cilindrataMax: z.number().optional(),
  potenzaKwMin: z.number().optional(),
  potenzaKwMax: z.number().optional(),
  potenzaCvMin: z.number().optional(),
  potenzaCvMax: z.number().optional(),
  co2GKmMin: z.number().optional(),
  co2GKmMax: z.number().optional(),
  prezzoListinoMin: z.number().optional(),
  prezzoListinoMax: z.number().optional(),
});

// ---------------------------------------------------------------------------
// Report params schema (Zod v4 API — using .refine for cross-field validation)
// ---------------------------------------------------------------------------

const FIVE_YEARS_MS = 5 * 365.25 * 24 * 60 * 60 * 1000;

export const reportParamsSchema = z
  .object({
    dateRange: z.object({
      startDate: z.coerce.date({ error: "La data di inizio e obbligatoria" }),
      endDate: z.coerce.date({ error: "La data di fine e obbligatoria" }),
    }),
    aggregationLevel: aggregationLevelSchema,
    periodGranularity: periodGranularitySchema.optional(),
    carlistId: z.coerce.number().optional(),
    vehicleFilters: vehicleFiltersSchema.optional(),
  })
  .refine(
    (data) => data.dateRange.startDate < data.dateRange.endDate,
    {
      message: "La data di inizio deve essere precedente alla data di fine",
      path: ["dateRange", "startDate"],
    }
  )
  .refine(
    (data) => {
      const diff =
        data.dateRange.endDate.getTime() - data.dateRange.startDate.getTime();
      return diff <= FIVE_YEARS_MS;
    },
    {
      message: "L'intervallo massimo consentito e di 5 anni",
      path: ["dateRange", "endDate"],
    }
  );

export type ReportParamsInput = z.input<typeof reportParamsSchema>;
export type ReportParamsData = z.output<typeof reportParamsSchema>;
