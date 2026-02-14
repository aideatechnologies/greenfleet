/**
 * Codall Image Integration Module
 *
 * Integrazione con il servizio Codall per il recupero delle immagini
 * veicoli a partire dal codice allestimento (CODALL) e data di
 * registrazione (ANNOXX + MESEXX).
 *
 * Moduli:
 * - client: Costruzione URL e fetch immagini
 * - fallback: Gestione errori e placeholder SVG
 * - types: Tipi TypeScript per l'integrazione
 */

export {
  getConfig,
  buildCodallImageUrl,
  fetchCodallImage,
} from "./client";
export { isRetryableError, getCodallFallbackResponse } from "./fallback";
export type {
  CodallImageRequest,
  CodallImageSuccess,
  CodallImageFailure,
  CodallImageResult,
  CodallConfig,
  CodallCacheEntry,
} from "./types";
