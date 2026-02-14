import { z } from "zod";

export const assignVehicleSchema = z.object({
  vehicleId: z
    .string()
    .min(1, { error: "Il veicolo e obbligatorio" }),
  employeeId: z
    .string()
    .min(1, { error: "Il dipendente e obbligatorio" }),
  startDate: z.coerce.date({
    error: "Data di inizio assegnazione non valida",
  }),
  notes: z
    .string()
    .max(500, { error: "Le note non possono superare 500 caratteri" })
    .optional()
    .transform((val) => (val === "" ? undefined : val)),
});

export const unassignVehicleSchema = z.object({
  vehicleId: z
    .string()
    .min(1, { error: "Il veicolo e obbligatorio" }),
  endDate: z.coerce.date({
    error: "Data di fine assegnazione non valida",
  }),
  notes: z
    .string()
    .max(500, { error: "Le note non possono superare 500 caratteri" })
    .optional()
    .transform((val) => (val === "" ? undefined : val)),
});

export type AssignVehicleInput = z.infer<typeof assignVehicleSchema>;
export type UnassignVehicleInput = z.infer<typeof unassignVehicleSchema>;
