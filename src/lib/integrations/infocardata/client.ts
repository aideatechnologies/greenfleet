import { logger } from "@/lib/utils/logger";
import { infocarDataHealth } from "./health";
import type {
  InfocarDataVehicleRaw,
  InfocarDataBatchParams,
  InfocarDataBatchResponse,
} from "./types";

// ---------------------------------------------------------------------------
// Configurazione
// ---------------------------------------------------------------------------

interface InfocarDataConfig {
  apiUrl: string;
  apiKey: string;
  timeoutMs: number;
  batchSize: number;
}

function getConfig(): InfocarDataConfig | null {
  const apiUrl = process.env.INFOCARDATA_API_URL;
  const apiKey = process.env.INFOCARDATA_API_KEY;

  if (!apiUrl || !apiKey) {
    return null;
  }

  return {
    apiUrl: apiUrl.replace(/\/$/, ""), // rimuovi trailing slash
    apiKey,
    timeoutMs: parseInt(process.env.INFOCARDATA_TIMEOUT_MS || "30000", 10),
    batchSize: parseInt(process.env.INFOCARDATA_BATCH_SIZE || "100", 10),
  };
}

// ---------------------------------------------------------------------------
// Errori
// ---------------------------------------------------------------------------

export class InfocarDataClientError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly responseBody?: string
  ) {
    super(message);
    this.name = "InfocarDataClientError";
  }
}

// ---------------------------------------------------------------------------
// Funzioni helper
// ---------------------------------------------------------------------------

async function makeRequest<T>(
  config: InfocarDataConfig,
  path: string,
  params?: Record<string, string>
): Promise<T> {
  const url = new URL(`${config.apiUrl}${path}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== "") {
        url.searchParams.set(key, value);
      }
    }
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        Accept: "application/json",
        "User-Agent": "Greenfleet/1.0",
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new InfocarDataClientError(
        `HTTP ${response.status}: ${response.statusText}`,
        response.status,
        body
      );
    }

    const data = (await response.json()) as T;
    infocarDataHealth.recordSuccess();
    return data;
  } catch (error) {
    infocarDataHealth.recordFailure();

    if (error instanceof InfocarDataClientError) {
      throw error;
    }

    if (error instanceof DOMException && error.name === "AbortError") {
      throw new InfocarDataClientError(
        `Timeout dopo ${config.timeoutMs}ms`
      );
    }

    throw new InfocarDataClientError(
      `Errore di rete: ${error instanceof Error ? error.message : String(error)}`
    );
  } finally {
    clearTimeout(timeout);
  }
}

// ---------------------------------------------------------------------------
// Client API pubblico
// ---------------------------------------------------------------------------

/**
 * Recupera un batch paginato di veicoli dal servizio InfocarData.
 *
 * @param params - Parametri di paginazione e filtro
 * @returns Batch di veicoli con informazioni sulla paginazione
 */
export async function fetchVehicleBatch(
  params?: InfocarDataBatchParams
): Promise<
  | { success: true; data: InfocarDataBatchResponse }
  | { success: false; error: string }
> {
  const config = getConfig();
  if (!config) {
    return {
      success: false,
      error:
        "Configurazione InfocarData mancante: impostare INFOCARDATA_API_URL e INFOCARDATA_API_KEY",
    };
  }

  if (!infocarDataHealth.isAvailable()) {
    const status = infocarDataHealth.getStatus();
    return {
      success: false,
      error: `Servizio InfocarData non disponibile (${status.consecutiveFailures} errori consecutivi). Riprovare tra qualche minuto.`,
    };
  }

  try {
    const queryParams: Record<string, string> = {};

    if (params?.limit) {
      queryParams.limit = String(params.limit);
    } else {
      queryParams.limit = String(config.batchSize);
    }

    if (params?.offset) {
      queryParams.offset = String(params.offset);
    }

    if (params?.marca) {
      queryParams.marca = params.marca;
    }

    if (params?.fromDate) {
      queryParams.fromDate = params.fromDate.toISOString().split("T")[0];
    }

    const data = await makeRequest<InfocarDataBatchResponse>(
      config,
      "/vehicles",
      queryParams
    );

    logger.debug(
      {
        total: data.total,
        returned: data.data.length,
        hasMore: data.hasMore,
        offset: params?.offset ?? 0,
      },
      "Batch veicoli InfocarData recuperato"
    );

    return { success: true, data };
  } catch (error) {
    const message =
      error instanceof InfocarDataClientError
        ? error.message
        : `Errore imprevisto: ${error instanceof Error ? error.message : String(error)}`;

    logger.error({ error, params }, "Errore nel recupero batch InfocarData");
    return { success: false, error: message };
  }
}

/**
 * Recupera un singolo veicolo per codice InfocarData (CODALL).
 *
 * @param codice - Codice allestimento/Infocar (CODALL)
 * @returns Veicolo trovato o errore
 */
export async function fetchVehicleByCode(
  codice: string
): Promise<
  | { success: true; data: InfocarDataVehicleRaw }
  | { success: false; error: string }
> {
  const config = getConfig();
  if (!config) {
    return {
      success: false,
      error:
        "Configurazione InfocarData mancante: impostare INFOCARDATA_API_URL e INFOCARDATA_API_KEY",
    };
  }

  if (!infocarDataHealth.isAvailable()) {
    return {
      success: false,
      error: "Servizio InfocarData non disponibile. Riprovare tra qualche minuto.",
    };
  }

  try {
    const data = await makeRequest<InfocarDataVehicleRaw>(
      config,
      `/vehicles/${encodeURIComponent(codice)}`
    );

    logger.debug(
      { codice, marca: data.marca, modello: data.modello },
      "Veicolo InfocarData recuperato"
    );

    return { success: true, data };
  } catch (error) {
    const message =
      error instanceof InfocarDataClientError
        ? error.message
        : `Errore imprevisto: ${error instanceof Error ? error.message : String(error)}`;

    logger.error({ error, codice }, "Errore nel recupero veicolo InfocarData");
    return { success: false, error: message };
  }
}

/**
 * Verifica la disponibilita del servizio InfocarData.
 *
 * @returns `true` se il servizio risponde correttamente, `false` altrimenti
 */
export async function checkHealth(): Promise<{
  available: boolean;
  message: string;
  circuitBreakerStatus: ReturnType<typeof infocarDataHealth.getStatus>;
}> {
  const circuitBreakerStatus = infocarDataHealth.getStatus();
  const config = getConfig();

  if (!config) {
    return {
      available: false,
      message:
        "Configurazione InfocarData mancante: INFOCARDATA_API_URL e/o INFOCARDATA_API_KEY non impostati",
      circuitBreakerStatus,
    };
  }

  if (!infocarDataHealth.isAvailable()) {
    return {
      available: false,
      message: `Circuit breaker aperto: ${circuitBreakerStatus.consecutiveFailures} errori consecutivi`,
      circuitBreakerStatus,
    };
  }

  try {
    await makeRequest<{ status: string }>(config, "/health");
    return {
      available: true,
      message: "Servizio InfocarData raggiungibile",
      circuitBreakerStatus: infocarDataHealth.getStatus(),
    };
  } catch (error) {
    const message =
      error instanceof InfocarDataClientError
        ? error.message
        : String(error);

    return {
      available: false,
      message: `Health check fallito: ${message}`,
      circuitBreakerStatus: infocarDataHealth.getStatus(),
    };
  }
}
