import { Co2Standard } from "@/types/vehicle";
import type { InfocarDataVehicleRaw, InfocarDataEngineRaw } from "./types";
import { logger } from "@/lib/utils/logger";

// ---------------------------------------------------------------------------
// Mappatura tipo alimentazione InfocarData -> FuelType
// ---------------------------------------------------------------------------

/**
 * Mappa i nomi italiani del tipo alimentazione (campo CODCOM decodificato)
 * ai valori stringa del tipo carburante.
 *
 * I valori InfocarData provengono dalla tabella IDAT4200F (anagrafica combustibili)
 * e possono variare per maiuscole/minuscole e abbreviazioni.
 */
const FUEL_TYPE_MAP: Record<string, string> = {
  // Benzina (incluse varianti InfoCar IDAT3520F)
  benzina: "BENZINA",
  "benzina super": "BENZINA",
  "benzina senza piombo": "BENZINA",
  "super benzina": "BENZINA",
  "benzina con piombo": "BENZINA",
  "benzina con o senza piombo": "BENZINA",
  "benzina senza piombo ed etanolo e85": "BENZINA",
  "benzina manuale": "BENZINA",
  "benz. s/pb.,etanolo o gpl": "BENZINA",
  "benzina super (con o senza piombo), miscelatore separato":
    "BENZINA",

  // Diesel / Gasolio
  diesel: "DIESEL",
  gasolio: "DIESEL",
  "gasolio manuale": "DIESEL",

  // GPL
  gpl: "GPL",
  "gas di petrolio liquefatto": "GPL",

  // Metano
  metano: "METANO",
  "gas metano": "METANO",
  "gas naturale": "METANO",
  cng: "METANO",
  gnc: "METANO",

  // Elettrico (incluse varianti InfoCar)
  elettrico: "ELETTRICO",
  elettrica: "ELETTRICO",
  "elettrico a batteria": "ELETTRICO",
  "elettrica extended range": "ELETTRICO",
  "elettrica manuale": "ELETTRICO",
  bev: "ELETTRICO",

  // Etanolo
  etanolo: "BENZINA",

  // Ibrido benzina
  "ibrido benzina": "IBRIDO_BENZINA",
  "ibrida benzina": "IBRIDO_BENZINA",
  "ibrido benzina/elettrico": "IBRIDO_BENZINA",
  "ibrido plug-in benzina": "IBRIDO_BENZINA",
  "ibrida plug-in benzina": "IBRIDO_BENZINA",
  "plug-in benzina": "IBRIDO_BENZINA",
  "benzina/elettrico": "IBRIDO_BENZINA",
  phev: "IBRIDO_BENZINA",
  hev: "IBRIDO_BENZINA",

  // Ibrido diesel
  "ibrido diesel": "IBRIDO_DIESEL",
  "ibrida diesel": "IBRIDO_DIESEL",
  "ibrido gasolio": "IBRIDO_DIESEL",
  "ibrido diesel/elettrico": "IBRIDO_DIESEL",
  "ibrido plug-in diesel": "IBRIDO_DIESEL",
  "ibrida plug-in diesel": "IBRIDO_DIESEL",
  "plug-in diesel": "IBRIDO_DIESEL",
  "gasolio/elettrico": "IBRIDO_DIESEL",

  // Idrogeno
  idrogeno: "IDROGENO",
  "fuel cell": "IDROGENO",
  "cella a combustibile": "IDROGENO",
  fcev: "IDROGENO",
  hydrogen: "IDROGENO",

  // Bifuel benzina/GPL (incluse varianti InfoCar)
  "benzina/gpl": "BIFUEL_BENZINA_GPL",
  "bifuel benzina/gpl": "BIFUEL_BENZINA_GPL",
  "bifuel gpl": "BIFUEL_BENZINA_GPL",
  "bi-fuel benzina/gpl": "BIFUEL_BENZINA_GPL",
  "benzina con piombo o gpl": "BIFUEL_BENZINA_GPL",
  "benzina senza piombo o gpl": "BIFUEL_BENZINA_GPL",
  "benzina senza piombo (gpl a richiesta)": "BIFUEL_BENZINA_GPL",
  "benz. s/pb. o gpl, metano a richiesta": "BIFUEL_BENZINA_GPL",
  "benz. s/pb., gpl o met. a rich.": "BIFUEL_BENZINA_GPL",
  "gpl (metano a ric. in alt.)": "BIFUEL_BENZINA_GPL",

  // Bifuel benzina/metano
  "benzina/metano": "BIFUEL_BENZINA_METANO",
  "bifuel benzina/metano": "BIFUEL_BENZINA_METANO",
  "bifuel metano": "BIFUEL_BENZINA_METANO",
  "bi-fuel benzina/metano": "BIFUEL_BENZINA_METANO",
  "benzina senza piombo o metano": "BIFUEL_BENZINA_METANO",
};

/**
 * Converte la stringa `tipoAlimentazione` dal database InfocarData
 * al valore FuelType corrispondente.
 *
 * @returns Il FuelType mappato oppure `null` se non riconosciuto
 */
export function mapFuelType(tipoAlimentazione: string): string | null {
  const normalized = tipoAlimentazione.trim().toLowerCase();
  const mapped = FUEL_TYPE_MAP[normalized];

  if (!mapped) {
    logger.warn(
      { tipoAlimentazione, normalized },
      "Tipo alimentazione InfocarData non riconosciuto"
    );
    return null;
  }

  return mapped;
}

// ---------------------------------------------------------------------------
// Mappatura standard emissioni CO2
// ---------------------------------------------------------------------------

const CO2_STANDARD_MAP: Record<string, Co2Standard> = {
  wltp: Co2Standard.WLTP,
  nedc: Co2Standard.NEDC,
  "new european driving cycle": Co2Standard.NEDC,
  "worldwide harmonised light vehicles test procedure": Co2Standard.WLTP,
};

/**
 * Converte la stringa dello standard emissioni al valore Co2Standard.
 * Default: WLTP (il file IDAT8400F e il protocollo attualmente in vigore).
 */
export function mapCo2Standard(standard?: string): Co2Standard {
  if (!standard) return Co2Standard.WLTP;

  const normalized = standard.trim().toLowerCase();
  return CO2_STANDARD_MAP[normalized] ?? Co2Standard.WLTP;
}

// ---------------------------------------------------------------------------
// Rilevamento veicoli ibridi
// ---------------------------------------------------------------------------

/**
 * Determina se un veicolo e ibrido sulla base dei motori associati.
 *
 * Un veicolo e considerato ibrido se ha 2+ tipi di alimentazione diversi
 * di cui almeno uno e elettrico. Corrisponde al flag FLAIBR = 'S'
 * nel file IDAT0620F (Dati Tecnici Base).
 */
export function isHybridVehicle(engines: InfocarDataEngineRaw[]): boolean {
  if (engines.length < 2) return false;

  const fuelTypes = new Set(
    engines
      .map((e) => mapFuelType(e.tipoAlimentazione))
      .filter((ft): ft is string => ft !== null)
  );

  if (fuelTypes.size < 2) return false;

  return fuelTypes.has("ELETTRICO");
}

// ---------------------------------------------------------------------------
// Mappatura unita di consumo
// ---------------------------------------------------------------------------

/**
 * Determina l'unita di consumo in base al tipo alimentazione.
 * I veicoli elettrici usano kWh/100km, gli altri L/100km.
 */
function mapConsumptionUnit(
  unitaConsumo?: string,
  fuelType?: string | null
): "L/100KM" | "KWH/100KM" {
  if (unitaConsumo) {
    const normalized = unitaConsumo.trim().toUpperCase();
    if (normalized.includes("KWH")) return "KWH/100KM";
    if (normalized.includes("L/")) return "L/100KM";
  }

  // Fallback basato sul tipo di alimentazione
  if (fuelType === "ELETTRICO") return "KWH/100KM";
  return "L/100KM";
}

// ---------------------------------------------------------------------------
// Mappatura veicolo completo
// ---------------------------------------------------------------------------

/**
 * Converte un veicolo raw InfocarData nel formato per il create di Prisma CatalogVehicle.
 * Non include le relazioni (engines) -- queste vengono mappate separatamente.
 */
export function mapVehicle(raw: InfocarDataVehicleRaw): {
  codiceInfocarData: string;
  marca: string;
  modello: string;
  allestimento: string | null;
  carrozzeria: string | null;
  normativa: string | null;
  capacitaSerbatoioL: number | null;
  isHybrid: boolean;
  source: string;
  codiceAllestimento: string | null;
  annoImmatricolazione: number | null;
  lastSyncAt: Date;
} {
  return {
    codiceInfocarData: raw.codice,
    marca: raw.marca.trim(),
    modello: raw.modello.trim(),
    allestimento: raw.allestimento?.trim() || null,
    carrozzeria: raw.carrozzeria?.trim() || null,
    normativa: raw.normativa?.trim() || null,
    capacitaSerbatoioL: raw.capacitaSerbatoio ?? null,
    isHybrid: raw.isHybrid ?? isHybridVehicle(raw.motori),
    source: "INFOCARDATA",
    codiceAllestimento: raw.codiceAllestimento?.trim() || null,
    annoImmatricolazione: raw.annoImmatricolazione ?? null,
    lastSyncAt: new Date(),
  };
}

// ---------------------------------------------------------------------------
// Mappatura motore singolo
// ---------------------------------------------------------------------------

/**
 * Converte un motore raw InfocarData nel formato per il create di Prisma Engine.
 *
 * @param raw - Dati grezzi del motore da InfocarData
 * @param catalogVehicleId - ID del CatalogVehicle a cui associare il motore
 * @returns Dati per Prisma Engine.create oppure `null` se il tipo alimentazione non e mappabile
 */
export function mapEngine(
  raw: InfocarDataEngineRaw,
  catalogVehicleId: string
): {
  catalogVehicleId: string;
  nucmot: string | null;
  fuelType: string;
  cilindrata: number | null;
  potenzaKw: number | null;
  potenzaCv: number | null;
  co2GKm: number | null;
  co2Standard: string;
  consumptionL100Km: number | null;
  consumptionUnit: string;
} | null {
  const fuelType = mapFuelType(raw.tipoAlimentazione);
  if (!fuelType) {
    return null;
  }

  const co2Standard = mapCo2Standard(raw.standardEmissione);
  const consumptionUnit = mapConsumptionUnit(raw.unitaConsumo, fuelType);

  return {
    catalogVehicleId,
    nucmot: raw.nucmot?.trim() || null,
    fuelType,
    cilindrata: raw.cilindrata ?? null,
    potenzaKw: raw.potenzaKw ?? null,
    potenzaCv: raw.potenzaCv ?? null,
    co2GKm: raw.co2GKm ?? null,
    co2Standard,
    consumptionL100Km: raw.consumo != null ? raw.consumo / 10 : null,
    consumptionUnit,
  };
}
