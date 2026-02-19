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
// Factory function for i18n
// ---------------------------------------------------------------------------

type T = (key: string) => string;

const IT: Record<string, string> = {
  fuelTypeRequired: "Il tipo carburante e obbligatorio",
  displacementInt: "La cilindrata deve essere un numero intero",
  displacementPositive: "La cilindrata deve essere maggiore di zero",
  powerKwPositive: "La potenza (kW) deve essere maggiore di zero",
  powerCvPositive: "La potenza (CV) deve essere maggiore di zero",
  co2Nonnegative: "Le emissioni CO2 non possono essere negative",
  consumptionPositive: "Il consumo deve essere maggiore di zero",
  makeRequired: "Marca obbligatoria",
  modelRequired: "Modello obbligatorio",
  tankCapacityPositive: "La capacita del serbatoio deve essere maggiore di zero",
  minOneEngine: "Almeno un motore richiesto",
};

const itFallback: T = (k) => IT[k] ?? k;

// ---------------------------------------------------------------------------
// Schema Motore (inserimento manuale)
// ---------------------------------------------------------------------------

export function buildManualEngineSchema(t: T = itFallback) {
  return z.object({
    fuelType: z.string().min(1, { error: t("fuelTypeRequired") }),
    cilindrata: z
      .number()
      .int({ error: t("displacementInt") })
      .positive({ error: t("displacementPositive") })
      .optional(),
    potenzaKw: z
      .number()
      .positive({ error: t("powerKwPositive") })
      .optional(),
    potenzaCv: z
      .number()
      .positive({ error: t("powerCvPositive") })
      .optional(),
    co2GKm: z
      .number()
      .nonnegative({ error: t("co2Nonnegative") })
      .optional(),
    co2Standard: z.enum(co2StandardValues).default("WLTP"),
    consumptionL100Km: z
      .number()
      .positive({ error: t("consumptionPositive") })
      .optional(),
    consumptionUnit: z.string().default("L/100KM"),
  });
}

// ---------------------------------------------------------------------------
// Schema Veicolo (inserimento manuale)
// ---------------------------------------------------------------------------

export function buildManualVehicleSchema(t: T = itFallback) {
  return z.object({
    marca: z.string().min(1, { error: t("makeRequired") }),
    modello: z.string().min(1, { error: t("modelRequired") }),
    allestimento: z.string().optional(),
    carrozzeria: z.string().optional(),
    normativa: z.string().optional(),
    capacitaSerbatoioL: z
      .number()
      .positive({
        error: t("tankCapacityPositive"),
      })
      .optional(),
    isHybrid: z.boolean().default(false),
  });
}

// ---------------------------------------------------------------------------
// Schema Veicolo con Motori (inserimento manuale)
// ---------------------------------------------------------------------------

export function buildManualVehicleWithEnginesSchema(t: T = itFallback) {
  return buildManualVehicleSchema(t).extend({
    engines: z
      .array(buildManualEngineSchema(t))
      .min(1, { error: t("minOneEngine") }),
  });
}

// ---------------------------------------------------------------------------
// Default instances (Italian) — backward compatible
// ---------------------------------------------------------------------------

export const manualEngineSchema = buildManualEngineSchema();
export const manualVehicleSchema = buildManualVehicleSchema();
export const manualVehicleWithEnginesSchema = buildManualVehicleWithEnginesSchema();

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
