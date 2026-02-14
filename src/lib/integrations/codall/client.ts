import { logger } from "@/lib/utils/logger";
import { CODALL_TIMEOUT_MS } from "@/lib/utils/constants";
import type { CodallConfig, CodallImageResult } from "./types";

// ---------------------------------------------------------------------------
// Configurazione
// ---------------------------------------------------------------------------

/**
 * Legge la configurazione Codall dalle variabili d'ambiente.
 * Ritorna `null` se CODALL_API_URL non e configurata.
 */
export function getConfig(): CodallConfig | null {
  const apiUrl = process.env.CODALL_API_URL;

  if (!apiUrl) {
    return null;
  }

  return {
    apiUrl: apiUrl.replace(/\/$/, ""),
    timeoutMs: CODALL_TIMEOUT_MS,
  };
}

// ---------------------------------------------------------------------------
// Costruzione URL
// ---------------------------------------------------------------------------

/**
 * Costruisce l'URL dell'immagine Codall a partire dal codice allestimento
 * e dalla data di registrazione.
 *
 * Pattern: `{baseUrl}/{ANNOXX}{MESEXX}{CODALL}`
 *
 * Dove:
 * - ANNOXX = anno a 2 cifre (es. "24" per 2024)
 * - MESEXX = mese a 2 cifre (es. "03" per marzo)
 * - CODALL = codice allestimento veicolo
 */
export function buildCodallImageUrl(
  codall: string,
  registrationDate: Date
): string {
  const config = getConfig();
  if (!config) {
    throw new Error(
      "Configurazione Codall mancante: impostare CODALL_API_URL"
    );
  }

  const anno = String(registrationDate.getFullYear()).slice(-2);
  const mese = String(registrationDate.getMonth() + 1).padStart(2, "0");

  return `${config.apiUrl}/${anno}${mese}${codall}`;
}

// ---------------------------------------------------------------------------
// Fetch immagine
// ---------------------------------------------------------------------------

/**
 * Recupera l'immagine del veicolo dal servizio Codall.
 *
 * Utilizza AbortController per implementare il timeout.
 * Non richiede autenticazione Bearer (servizio pubblico di immagini).
 *
 * @param codall - Codice allestimento del veicolo
 * @param registrationDate - Data di registrazione (per ANNOXX e MESEXX)
 * @returns Risultato con buffer e content-type oppure errore
 */
export async function fetchCodallImage(
  codall: string,
  registrationDate: Date
): Promise<CodallImageResult> {
  const config = getConfig();
  if (!config) {
    return {
      success: false,
      error:
        "Configurazione Codall mancante: impostare CODALL_API_URL",
    };
  }

  const url = buildCodallImageUrl(codall, registrationDate);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "image/*",
        "User-Agent": "Greenfleet/1.0",
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      const statusText = response.statusText || "Errore sconosciuto";
      logger.warn(
        { codall, status: response.status, statusText, url },
        "Codall: risposta non OK"
      );
      return {
        success: false,
        error: `HTTP ${response.status}: ${statusText}`,
      };
    }

    const contentType =
      response.headers.get("content-type") ?? "image/jpeg";
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    logger.debug(
      { codall, contentType, size: buffer.length },
      "Codall: immagine recuperata"
    );

    return {
      success: true,
      buffer,
      contentType,
    };
  } catch (error: unknown) {
    if (
      error instanceof DOMException &&
      error.name === "AbortError"
    ) {
      logger.warn(
        { codall, timeoutMs: config.timeoutMs },
        "Codall: timeout nella richiesta immagine"
      );
      return {
        success: false,
        error: `Timeout dopo ${config.timeoutMs}ms`,
      };
    }

    const message =
      error instanceof Error ? error.message : String(error);
    logger.error(
      { codall, error: message },
      "Codall: errore imprevisto nel recupero immagine"
    );
    return {
      success: false,
      error: `Errore di rete: ${message}`,
    };
  } finally {
    clearTimeout(timeout);
  }
}
