import { z } from "zod";

// ---------------------------------------------------------------------------
// Valori enum come tuple const (compatibili con Zod v4 z.enum)
// ---------------------------------------------------------------------------

const fuelTypeValues = [
  "BENZINA",
  "DIESEL",
  "GPL",
  "METANO",
  "ELETTRICO",
  "IBRIDO_BENZINA",
  "IBRIDO_DIESEL",
  "IDROGENO",
  "BIFUEL_BENZINA_GPL",
  "BIFUEL_BENZINA_METANO",
] as const;

const co2StandardValues = ["WLTP", "NEDC"] as const;

const consumptionUnitValues = ["L/100KM", "KWH/100KM"] as const;

const sourceValues = ["INFOCARDATA", "MANUAL"] as const;

// ---------------------------------------------------------------------------
// Schema Motore
// ---------------------------------------------------------------------------

export const engineSchema = z.object({
  fuelType: z.enum(fuelTypeValues, {
    error: "Tipo alimentazione non valido",
  }),
  cilindrata: z.number().int().positive().nullable().optional(),
  potenzaKw: z.number().positive().nullable().optional(),
  potenzaCv: z.number().positive().nullable().optional(),
  co2GKm: z.number().nonnegative().nullable().optional(),
  co2Standard: z.enum(co2StandardValues).default("WLTP"),
  consumptionL100Km: z.number().positive().nullable().optional(),
  consumptionUnit: z.enum(consumptionUnitValues).default("L/100KM"),
  nucmot: z.string().nullable().optional(),
});

// ---------------------------------------------------------------------------
// Schema Veicolo Catalogo
// ---------------------------------------------------------------------------

export const catalogVehicleSchema = z.object({
  marca: z.string().min(1, "Marca obbligatoria").max(100),
  modello: z.string().min(1, "Modello obbligatorio").max(100),
  allestimento: z.string().max(200).nullable().optional(),
  carrozzeria: z.string().max(100).nullable().optional(),
  normativa: z.string().max(50).nullable().optional(),
  capacitaSerbatoioL: z.number().positive().nullable().optional(),
  isHybrid: z.boolean().default(false),
  source: z.enum(sourceValues).default("INFOCARDATA"),
});

// ---------------------------------------------------------------------------
// Schema Veicolo Catalogo con Motori
// ---------------------------------------------------------------------------

export const catalogVehicleWithEnginesSchema = catalogVehicleSchema.extend({
  engines: z.array(engineSchema).min(1, "Almeno un motore obbligatorio"),
});

// ---------------------------------------------------------------------------
// Schema per filtro ricerca catalogo
// ---------------------------------------------------------------------------

export const catalogSearchSchema = z.object({
  marca: z.string().optional(),
  modello: z.string().optional(),
  fuelType: z.enum(fuelTypeValues).optional(),
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().max(100).default(20),
});

// ---------------------------------------------------------------------------
// Tipi derivati
// ---------------------------------------------------------------------------

export type CatalogVehicleInput = z.infer<typeof catalogVehicleSchema>;
export type EngineInput = z.infer<typeof engineSchema>;
export type CatalogVehicleWithEnginesInput = z.infer<
  typeof catalogVehicleWithEnginesSchema
>;
export type CatalogSearchInput = z.infer<typeof catalogSearchSchema>;
