/**
 * Gestione errori e fallback per il servizio immagini Codall.
 *
 * Fornisce:
 * - Classificazione degli errori (retryable vs permanenti)
 * - Risposta HTTP placeholder SVG per immagini non disponibili
 */

// ---------------------------------------------------------------------------
// Classificazione errori
// ---------------------------------------------------------------------------

/**
 * Determina se un errore e retryable (transitorio).
 *
 * Errori retryable:
 * - Timeout (AbortError)
 * - Errori di rete (TypeError con "fetch")
 * - HTTP 5xx (server errors)
 *
 * Errori NON retryable:
 * - HTTP 4xx (client errors: 400, 404, ecc.)
 * - Configurazione mancante
 */
export function isRetryableError(error: unknown): boolean {
  if (typeof error === "string") {
    // Messaggi di errore dal nostro client
    if (error.startsWith("Timeout dopo")) return true;
    if (error.startsWith("Errore di rete:")) return true;

    // Controlla status code dal messaggio "HTTP XXX: ..."
    const httpMatch = /^HTTP (\d{3}):/.exec(error);
    if (httpMatch) {
      const status = parseInt(httpMatch[1], 10);
      return status >= 500;
    }

    return false;
  }

  if (error instanceof DOMException && error.name === "AbortError") {
    return true;
  }

  if (error instanceof TypeError && error.message.includes("fetch")) {
    return true;
  }

  if (error instanceof Error) {
    // Errori di rete generici
    if (
      error.message.includes("ECONNREFUSED") ||
      error.message.includes("ECONNRESET") ||
      error.message.includes("ETIMEDOUT") ||
      error.message.includes("ENOTFOUND")
    ) {
      return true;
    }
  }

  return false;
}

// ---------------------------------------------------------------------------
// Risposta fallback
// ---------------------------------------------------------------------------

/** SVG placeholder inline per immagini veicoli non disponibili */
const PLACEHOLDER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 240" width="320" height="240" fill="none">
  <rect width="320" height="240" rx="12" fill="#f3f4f6"/>
  <g transform="translate(100, 40)">
    <!-- Corpo auto -->
    <path d="M20 80 L25 55 Q30 40 50 35 L70 30 Q90 28 100 35 L110 55 L115 80 Z"
          stroke="#9ca3af" stroke-width="2.5" fill="#e5e7eb"/>
    <!-- Tetto -->
    <path d="M40 35 Q45 15 70 12 Q95 15 100 35"
          stroke="#9ca3af" stroke-width="2" fill="none"/>
    <!-- Finestrini -->
    <path d="M48 34 Q52 20 70 18 Q75 18 78 20 L78 34 Z"
          stroke="#0d9488" stroke-width="1.5" fill="#0d948820"/>
    <path d="M82 34 L82 20 Q90 20 95 34 Z"
          stroke="#0d9488" stroke-width="1.5" fill="#0d948820"/>
    <!-- Base -->
    <rect x="15" y="78" width="105" height="12" rx="4" fill="#d1d5db"/>
    <!-- Ruote -->
    <circle cx="38" cy="90" r="14" fill="#6b7280" stroke="#4b5563" stroke-width="2"/>
    <circle cx="38" cy="90" r="6" fill="#9ca3af"/>
    <circle cx="97" cy="90" r="14" fill="#6b7280" stroke="#4b5563" stroke-width="2"/>
    <circle cx="97" cy="90" r="6" fill="#9ca3af"/>
    <!-- Fari -->
    <rect x="16" y="64" width="8" height="8" rx="2" fill="#0d9488" opacity="0.6"/>
    <rect x="112" y="64" width="8" height="8" rx="2" fill="#ef4444" opacity="0.4"/>
  </g>
  <text x="160" y="185" text-anchor="middle" fill="#9ca3af" font-family="system-ui, sans-serif" font-size="14" font-weight="500">
    Immagine non disponibile
  </text>
</svg>`;

/**
 * Ritorna una Response HTTP con il placeholder SVG per veicoli
 * senza immagine disponibile.
 *
 * Headers impostati:
 * - Content-Type: image/svg+xml
 * - Cache-Control: pubblica, 1 ora (placeholder puo cambiare con deploy)
 */
export function getCodallFallbackResponse(): Response {
  return new Response(PLACEHOLDER_SVG, {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
