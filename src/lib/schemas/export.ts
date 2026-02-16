import { z } from "zod";

// ---------------------------------------------------------------------------
// Export params schema (Story 6.6)
// ---------------------------------------------------------------------------

export const exportParamsSchema = z.object({
  format: z.enum(["pdf", "csv"]),
  startDate: z.string({ error: "La data di inizio e obbligatoria" }),
  endDate: z.string({ error: "La data di fine e obbligatoria" }),
  aggregationLevel: z
    .enum(["VEHICLE", "CARLIST", "FUEL_TYPE", "PERIOD"])
    .default("VEHICLE"),
  includeVehicleDetail: z
    .string()
    .default("true")
    .transform((v) => v === "true"),
  includeMethodology: z
    .string()
    .default("true")
    .transform((v) => v === "true"),
  csvSeparator: z.string().default(";"),
  carlistId: z.coerce.number().optional(),
});

export type ExportParamsInput = z.input<typeof exportParamsSchema>;
export type ExportParamsData = z.output<typeof exportParamsSchema>;
