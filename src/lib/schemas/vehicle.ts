import { z } from "zod";
import { CO2_STANDARD_VALUES } from "@/types/vehicle";

// ---------------------------------------------------------------------------
// Valori enum come tuple const (compatibili con Zod v4 z.enum)
// ---------------------------------------------------------------------------

const co2StandardValues = CO2_STANDARD_VALUES as unknown as readonly [
  string,
  ...string[],
];

// ---------------------------------------------------------------------------
// Schema Motore (inserimento manuale)
// ---------------------------------------------------------------------------

export const manualEngineSchema = z.object({
  fuelType: z.string().min(1, { error: "Il tipo carburante e obbligatorio" }),
  cilindrata: z
    .number()
    .int({ error: "La cilindrata deve essere un numero intero" })
    .positive({ error: "La cilindrata deve essere maggiore di zero" })
    .optional(),
  potenzaKw: z
    .number()
    .positive({ error: "La potenza (kW) deve essere maggiore di zero" })
    .optional(),
  potenzaCv: z
    .number()
    .positive({ error: "La potenza (CV) deve essere maggiore di zero" })
    .optional(),
  co2GKm: z
    .number()
    .nonnegative({ error: "Le emissioni CO2 non possono essere negative" })
    .optional(),
  co2Standard: z.enum(co2StandardValues).default("WLTP"),
  consumptionL100Km: z
    .number()
    .positive({ error: "Il consumo deve essere maggiore di zero" })
    .optional(),
  consumptionUnit: z.string().default("L/100KM"),
});

// ---------------------------------------------------------------------------
// Schema Veicolo (inserimento manuale)
// ---------------------------------------------------------------------------

export const manualVehicleSchema = z.object({
  marca: z.string().min(1, { error: "Marca obbligatoria" }),
  modello: z.string().min(1, { error: "Modello obbligatorio" }),
  allestimento: z.string().optional(),
  carrozzeria: z.string().optional(),
  normativa: z.string().optional(),
  capacitaSerbatoioL: z
    .number()
    .positive({
      error: "La capacita del serbatoio deve essere maggiore di zero",
    })
    .optional(),
  isHybrid: z.boolean().default(false),
});

// ---------------------------------------------------------------------------
// Schema Veicolo con Motori (inserimento manuale)
// ---------------------------------------------------------------------------

export const manualVehicleWithEnginesSchema = manualVehicleSchema.extend({
  engines: z
    .array(manualEngineSchema)
    .min(1, { error: "Almeno un motore richiesto" }),
});

// ---------------------------------------------------------------------------
// Tipi derivati
// ---------------------------------------------------------------------------

/** Tipo output (dopo applicazione defaults) — usato dal server action */
export type ManualVehicleInput = z.infer<typeof manualVehicleSchema>;
export type ManualEngineInput = z.infer<typeof manualEngineSchema>;
export type ManualVehicleWithEnginesInput = z.infer<
  typeof manualVehicleWithEnginesSchema
>;

/** Tipo input (prima dei defaults) — usato dal form React Hook Form */
export type ManualVehicleWithEnginesFormValues = z.input<
  typeof manualVehicleWithEnginesSchema
>;
