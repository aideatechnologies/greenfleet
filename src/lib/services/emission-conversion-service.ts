import { prisma } from "@/lib/db/client";
import type { EmissionConversionConfig } from "@/generated/prisma/client";

// ---------------------------------------------------------------------------
// Tipi
// ---------------------------------------------------------------------------

export type EngineEmissionInput = {
  co2GKmWltp?: number | null;
  co2GKmNedc?: number | null;
  co2Standard: "WLTP" | "NEDC";
  conversionConfigId?: string | null;
};

export type EngineEmissionResult = {
  co2GKmWltp: number;
  co2GKmNedc: number;
  co2GKmWltpIsCalculated: boolean;
  co2GKmNedcIsCalculated: boolean;
  co2GKm: number;
  conversionFactorUsed: number | null;
};

// ---------------------------------------------------------------------------
// Funzioni di conversione pure
// ---------------------------------------------------------------------------

/** Converte un valore NEDC in WLTP usando il fattore di conversione */
export function convertNedcToWltp(nedcValue: number, factor: number): number {
  return Math.round(nedcValue * factor * 10) / 10;
}

/** Converte un valore WLTP in NEDC usando il fattore di conversione */
export function convertWltpToNedc(wltpValue: number, factor: number): number {
  return Math.round(wltpValue * factor * 10) / 10;
}

// ---------------------------------------------------------------------------
// Recupero configurazione
// ---------------------------------------------------------------------------

/** Restituisce la configurazione di conversione predefinita */
export async function getDefaultConversionConfig(): Promise<EmissionConversionConfig> {
  const config = await prisma.emissionConversionConfig.findFirst({
    where: { isDefault: true },
  });

  if (!config) {
    throw new Error(
      "Nessuna configurazione di conversione predefinita trovata. Eseguire il seed del database."
    );
  }

  return config;
}

/** Restituisce la configurazione specificata o quella predefinita */
export async function getConversionConfig(
  configId?: string | null
): Promise<EmissionConversionConfig> {
  if (configId) {
    const config = await prisma.emissionConversionConfig.findUnique({
      where: { id: configId },
    });

    if (config) return config;
  }

  return getDefaultConversionConfig();
}

// ---------------------------------------------------------------------------
// Calcolo standard mancante
// ---------------------------------------------------------------------------

/**
 * Calcola il valore mancante (WLTP o NEDC) a partire dall'input fornito.
 * Se entrambi i valori sono presenti, li usa direttamente senza conversione.
 * Se ne manca uno, lo calcola tramite la configurazione di conversione.
 */
export async function calculateMissingStandard(
  input: EngineEmissionInput
): Promise<EngineEmissionResult> {
  const { co2GKmWltp, co2GKmNedc, co2Standard, conversionConfigId } = input;

  const hasWltp = co2GKmWltp != null && co2GKmWltp > 0;
  const hasNedc = co2GKmNedc != null && co2GKmNedc > 0;

  // Caso: entrambi i valori forniti
  if (hasWltp && hasNedc) {
    const wltp = co2GKmWltp!;
    const nedc = co2GKmNedc!;
    return {
      co2GKmWltp: wltp,
      co2GKmNedc: nedc,
      co2GKmWltpIsCalculated: false,
      co2GKmNedcIsCalculated: false,
      co2GKm: co2Standard === "WLTP" ? wltp : nedc,
      conversionFactorUsed: null,
    };
  }

  // Recupera configurazione di conversione
  const config = await getConversionConfig(conversionConfigId);

  // Caso: solo WLTP fornito -> calcola NEDC
  if (hasWltp && !hasNedc) {
    const wltp = co2GKmWltp!;
    const calculatedNedc = convertWltpToNedc(wltp, config.wltpToNedcFactor);
    return {
      co2GKmWltp: wltp,
      co2GKmNedc: calculatedNedc,
      co2GKmWltpIsCalculated: false,
      co2GKmNedcIsCalculated: true,
      co2GKm: co2Standard === "WLTP" ? wltp : calculatedNedc,
      conversionFactorUsed: config.wltpToNedcFactor,
    };
  }

  // Caso: solo NEDC fornito -> calcola WLTP
  if (!hasWltp && hasNedc) {
    const nedc = co2GKmNedc!;
    const calculatedWltp = convertNedcToWltp(nedc, config.nedcToWltpFactor);
    return {
      co2GKmWltp: calculatedWltp,
      co2GKmNedc: nedc,
      co2GKmWltpIsCalculated: true,
      co2GKmNedcIsCalculated: false,
      co2GKm: co2Standard === "WLTP" ? calculatedWltp : nedc,
      conversionFactorUsed: config.nedcToWltpFactor,
    };
  }

  // Nessun valore fornito — non dovrebbe accadere con validazione Zod
  throw new Error("Almeno un valore CO2 (WLTP o NEDC) deve essere fornito");
}

// ---------------------------------------------------------------------------
// Utility per calcolo emissioni
// ---------------------------------------------------------------------------

/**
 * Restituisce il valore WLTP per i calcoli emissioni.
 * Se il valore WLTP e disponibile lo usa direttamente,
 * altrimenti restituisce null (il chiamante dovra fare la conversione).
 */
export function getWltpValueForCalculation(engine: {
  co2GKmWltp?: number | null;
  co2GKmNedc?: number | null;
  co2Standard: string;
}): number | null {
  if (engine.co2GKmWltp != null && engine.co2GKmWltp > 0) {
    return engine.co2GKmWltp;
  }

  // Fallback: se non c'e WLTP ma c'e il valore generico co2GKm
  // e lo standard e WLTP, potrebbe essere stato salvato solo li
  return null;
}

// ---------------------------------------------------------------------------
// Gestione CRUD configurazioni
// ---------------------------------------------------------------------------

/** Elenca tutte le configurazioni di conversione */
export async function listConversionConfigs(): Promise<
  EmissionConversionConfig[]
> {
  return prisma.emissionConversionConfig.findMany({
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
  });
}

/** Recupera una singola configurazione per ID */
export async function getConversionConfigById(
  id: string
): Promise<EmissionConversionConfig | null> {
  return prisma.emissionConversionConfig.findUnique({
    where: { id },
  });
}
