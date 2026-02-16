import { z } from "zod";

export const replatVehicleSchema = z.object({
  vehicleId: z.coerce.number({ error: "Veicolo obbligatorio" }),
  newPlateNumber: z
    .string()
    .min(2, { error: "Targa obbligatoria" })
    .max(10, { error: "Targa non valida" })
    .transform((val) => val.trim().toUpperCase().replace(/\s/g, "")),
  effectiveDate: z.coerce.date({ error: "Data effetto obbligatoria" }),
  notes: z
    .string()
    .max(500, { error: "Le note non possono superare 500 caratteri" })
    .optional()
    .transform((val) => (val === "" ? undefined : val)),
});

export type ReplatVehicleInput = z.input<typeof replatVehicleSchema>;

export const addInitialPlateSchema = z.object({
  vehicleId: z.coerce.number({ error: "Veicolo obbligatorio" }),
  plateNumber: z
    .string()
    .min(2, { error: "Targa obbligatoria" })
    .max(10, { error: "Targa non valida" })
    .transform((val) => val.trim().toUpperCase().replace(/\s/g, "")),
  startDate: z.coerce.date({ error: "Data inizio obbligatoria" }),
});

export type AddInitialPlateInput = z.input<typeof addInitialPlateSchema>;
