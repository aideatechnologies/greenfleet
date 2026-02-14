/**
 * Tipi per l'integrazione con il servizio immagini Codall.
 *
 * Il servizio Codall fornisce immagini veicoli identificate dalla
 * combinazione ANNOXX + MESEXX + CODALL (codice allestimento).
 */

/** Parametri per una richiesta immagine Codall */
export interface CodallImageRequest {
  /** Codice allestimento del veicolo (CODALL) */
  codall: string;
  /** Data di registrazione/immatricolazione (usata per ANNOXX e MESEXX) */
  registrationDate: Date;
}

/** Risultato positivo del recupero immagine */
export interface CodallImageSuccess {
  success: true;
  /** Buffer binario dell'immagine */
  buffer: Buffer;
  /** Content-Type dell'immagine (es. image/jpeg, image/png) */
  contentType: string;
}

/** Risultato negativo del recupero immagine */
export interface CodallImageFailure {
  success: false;
  /** Messaggio di errore */
  error: string;
}

/** Risultato del recupero immagine Codall (discriminated union) */
export type CodallImageResult = CodallImageSuccess | CodallImageFailure;

/** Configurazione del client Codall */
export interface CodallConfig {
  /** URL base del servizio Codall */
  apiUrl: string;
  /** Timeout per le richieste in millisecondi */
  timeoutMs: number;
}

/** Entry della cache immagini in-memory */
export interface CodallCacheEntry {
  /** Buffer binario dell'immagine */
  buffer: Buffer;
  /** Content-Type dell'immagine */
  contentType: string;
  /** Timestamp di inserimento in cache (ms epoch) */
  cachedAt: number;
}
