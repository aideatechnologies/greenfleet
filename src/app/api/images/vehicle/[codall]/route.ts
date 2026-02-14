import { NextRequest } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth/auth";
import { logger } from "@/lib/utils/logger";
import { CODALL_CACHE_TTL_MS } from "@/lib/utils/constants";
import {
  fetchCodallImage,
  isRetryableError,
  getCodallFallbackResponse,
} from "@/lib/integrations/codall";
import type { CodallCacheEntry } from "@/lib/integrations/codall";

// ---------------------------------------------------------------------------
// Validazione parametri
// ---------------------------------------------------------------------------

const paramsSchema = z.object({
  codall: z.string().min(1, "Il codice allestimento e obbligatorio"),
});

const searchParamsSchema = z.object({
  date: z
    .string()
    .regex(
      /^\d{4}-(0[1-9]|1[0-2])$/,
      "Formato data non valido. Atteso: YYYY-MM"
    ),
});

// ---------------------------------------------------------------------------
// Cache in-memory
// ---------------------------------------------------------------------------

const imageCache = new Map<string, CodallCacheEntry>();

function buildCacheKey(codall: string, date: string): string {
  return `${codall}:${date}`;
}

function getFromCache(key: string): CodallCacheEntry | null {
  const entry = imageCache.get(key);
  if (!entry) return null;

  const age = Date.now() - entry.cachedAt;
  if (age > CODALL_CACHE_TTL_MS) {
    // Lazy eviction: rimuovi entry scaduta
    imageCache.delete(key);
    return null;
  }

  return entry;
}

function setInCache(key: string, buffer: Buffer, contentType: string): void {
  imageCache.set(key, {
    buffer,
    contentType,
    cachedAt: Date.now(),
  });
}

// ---------------------------------------------------------------------------
// Helper: parseDateParam -> Date
// ---------------------------------------------------------------------------

function parseDateParam(dateStr: string): Date {
  const [yearStr, monthStr] = dateStr.split("-");
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10) - 1; // mesi 0-based in JS
  return new Date(year, month, 1);
}

// ---------------------------------------------------------------------------
// Costanti
// ---------------------------------------------------------------------------

const RETRY_DELAY_MS = 500;

const CACHE_CONTROL_HEADER =
  "public, max-age=86400, stale-while-revalidate=604800";

// ---------------------------------------------------------------------------
// Route Handler GET
// ---------------------------------------------------------------------------

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ codall: string }> }
): Promise<Response> {
  // 1. Autenticazione
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session) {
    return new Response(
      JSON.stringify({ error: "Non autenticato" }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // 2. Estrai parametri
  const resolvedParams = await params;
  const paramsResult = paramsSchema.safeParse(resolvedParams);

  if (!paramsResult.success) {
    return new Response(
      JSON.stringify({
        error: "Parametri non validi",
        details: paramsResult.error.issues,
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const { codall } = paramsResult.data;

  const dateParam = request.nextUrl.searchParams.get("date");
  const searchResult = searchParamsSchema.safeParse({ date: dateParam });

  if (!searchResult.success) {
    return new Response(
      JSON.stringify({
        error: "Parametro date non valido",
        details: searchResult.error.issues,
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const { date } = searchResult.data;

  // 3. Check cache
  const cacheKey = buildCacheKey(codall, date);
  const cached = getFromCache(cacheKey);

  if (cached) {
    logger.debug({ codall, date }, "Codall: immagine servita da cache");
    return new Response(new Uint8Array(cached.buffer), {
      status: 200,
      headers: {
        "Content-Type": cached.contentType,
        "Cache-Control": CACHE_CONTROL_HEADER,
        "X-Cache": "HIT",
      },
    });
  }

  // 4. Fetch dall'API Codall
  const registrationDate = parseDateParam(date);
  let result = await fetchCodallImage(codall, registrationDate);

  // 5. Retry (max 1) per errori transitori
  if (!result.success && isRetryableError(result.error)) {
    logger.debug(
      { codall, date, error: result.error },
      "Codall: retry dopo errore transitorio"
    );
    await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
    result = await fetchCodallImage(codall, registrationDate);
  }

  // 6. Gestisci risultato
  if (result.success) {
    // Cache dell'immagine valida
    setInCache(cacheKey, result.buffer, result.contentType);

    return new Response(new Uint8Array(result.buffer), {
      status: 200,
      headers: {
        "Content-Type": result.contentType,
        "Cache-Control": CACHE_CONTROL_HEADER,
        "X-Cache": "MISS",
      },
    });
  }

  // 7. Fallback: placeholder SVG
  logger.warn(
    { codall, date, error: result.error },
    "Codall: fallback a placeholder per immagine non disponibile"
  );

  return getCodallFallbackResponse();
}
