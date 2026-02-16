import type { PrismaClientWithTenant } from "@/lib/db/client";
import type { ExtractedLine, MatchingTolerances } from "@/types/xml-template";

// ---------------------------------------------------------------------------
// Tipi pubblici
// ---------------------------------------------------------------------------

export type FuelRecordCandidate = {
  id: number;
  date: Date;
  quantity: number | null;
  totalCost: number | null;
  fuelType: string | null;
};

export type MatchScoreBreakdown = {
  licensePlate: { score: number; weight: number; detail: string };
  date: { score: number; weight: number; detail: string };
  quantity: { score: number; weight: number; detail: string };
  amount: { score: number; weight: number; detail: string };
  fuelType: { score: number; weight: number; detail: string };
  totalScore: number;
};

export type MatchResult = {
  lineNumber: number;
  extractedLine: ExtractedLine;
  matchStatus: "AUTO_MATCHED" | "SUGGESTED" | "UNMATCHED" | "ERROR";
  matchedFuelRecordId: number | null;
  matchScore: number | null;
  matchDetails: MatchScoreBreakdown | null;
  resolvedVehicleId: number | null;
  candidateCount: number;
  error?: string;
};

export type MatchingResult = {
  results: MatchResult[];
  summary: {
    total: number;
    autoMatched: number;
    suggested: number;
    unmatched: number;
    errors: number;
  };
};

// ---------------------------------------------------------------------------
// Normalizzazione targa
// ---------------------------------------------------------------------------

function normalizePlate(plate: string): string {
  return plate.trim().toUpperCase().replace(/[\s\-]/g, "");
}

// ---------------------------------------------------------------------------
// Normalizzazione tipo carburante per confronto
// ---------------------------------------------------------------------------

/**
 * Mappa le varianti comuni di tipo carburante verso un valore canonico
 * per consentire il confronto tra fonti diverse (fattura vs database).
 */
const FUEL_TYPE_CANONICAL: Record<string, string> = {
  // Diesel / Gasolio
  diesel: "DIESEL",
  gasolio: "DIESEL",
  "gasolio autotrazion": "DIESEL",
  "gasolio autotrazione": "DIESEL",
  "gasolio auto": "DIESEL",
  nafta: "DIESEL",
  "gas oil": "DIESEL",
  // Benzina
  benzina: "BENZINA",
  petrol: "BENZINA",
  gasoline: "BENZINA",
  unleaded: "BENZINA",
  "senza piombo": "BENZINA",
  "super benzina": "BENZINA",
  "super senza pb": "BENZINA",
  "super 95": "BENZINA",
  "super 98": "BENZINA",
  "senza pb": "BENZINA",
  "benzina super": "BENZINA",
  "benzina verde": "BENZINA",
  // GPL
  gpl: "GPL",
  lpg: "GPL",
  "gas liquido": "GPL",
  // Metano / CNG
  metano: "METANO",
  cng: "METANO",
  "gas naturale": "METANO",
  "natural gas": "METANO",
  "gas metano": "METANO",
  // Elettrico
  elettrico: "ELETTRICO",
  elettrica: "ELETTRICO",
  electric: "ELETTRICO",
  elettr: "ELETTRICO",
  // Ibrido benzina
  ibrido_benzina: "IBRIDO_BENZINA",
  "ibrido benzina": "IBRIDO_BENZINA",
  "ibrida benzina": "IBRIDO_BENZINA",
  "hybrid petrol": "IBRIDO_BENZINA",
  // Ibrido diesel
  ibrido_diesel: "IBRIDO_DIESEL",
  "ibrido diesel": "IBRIDO_DIESEL",
  "ibrida diesel": "IBRIDO_DIESEL",
  "hybrid diesel": "IBRIDO_DIESEL",
  // Bifuel
  bifuel_benzina_gpl: "BIFUEL_BENZINA_GPL",
  "benzina/gpl": "BIFUEL_BENZINA_GPL",
  "benzina gpl": "BIFUEL_BENZINA_GPL",
  bifuel_benzina_metano: "BIFUEL_BENZINA_METANO",
  "benzina/metano": "BIFUEL_BENZINA_METANO",
  "benzina metano": "BIFUEL_BENZINA_METANO",
  // Idrogeno
  idrogeno: "IDROGENO",
  hydrogen: "IDROGENO",
  // Additivi (non carburante - per classificazione)
  adblue: "ADBLUE",
  "ad blue": "ADBLUE",
};

/**
 * Gruppi di compatibilita: tipi carburante considerati "compatibili"
 * ai fini del matching (score 0.5 invece di 0.0).
 */
const FUEL_COMPATIBILITY_GROUPS: string[][] = [
  ["DIESEL", "IBRIDO_DIESEL"],
  ["BENZINA", "IBRIDO_BENZINA", "BIFUEL_BENZINA_GPL", "BIFUEL_BENZINA_METANO"],
  ["GPL", "BIFUEL_BENZINA_GPL"],
  ["METANO", "BIFUEL_BENZINA_METANO"],
];

function canonicalizeFuelType(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const normalized = raw.trim().toLowerCase().replace(/[\s_-]+/g, " ");

  // Lookup diretto
  if (normalized in FUEL_TYPE_CANONICAL) {
    return FUEL_TYPE_CANONICAL[normalized];
  }

  // Prova con underscore al posto degli spazi (per valori gia normalizzati)
  const withUnderscores = normalized.replace(/\s/g, "_").toUpperCase();
  const knownCanonical = new Set(Object.values(FUEL_TYPE_CANONICAL));
  if (knownCanonical.has(withUnderscores)) {
    return withUnderscores;
  }

  // Contenimento parziale come fallback
  for (const [key, canonical] of Object.entries(FUEL_TYPE_CANONICAL)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return canonical;
    }
  }

  return raw.trim().toUpperCase();
}

function areFuelTypesCompatible(a: string, b: string): boolean {
  for (const group of FUEL_COMPATIBILITY_GROUPS) {
    if (group.includes(a) && group.includes(b)) {
      return true;
    }
  }
  return false;
}

// ---------------------------------------------------------------------------
// Parsing date da stringhe in formati comuni
// ---------------------------------------------------------------------------

/**
 * Tenta di parsare una stringa data in diversi formati comuni italiani e ISO.
 * Restituisce un oggetto Date valido oppure null.
 */
function parseFlexibleDate(raw: string | null | undefined): Date | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // Formato ISO: yyyy-MM-dd o yyyy-MM-ddTHH:mm:ss
  const isoMatch = trimmed.match(
    /^(\d{4})-(\d{1,2})-(\d{1,2})(?:T[\d:.]+)?$/
  );
  if (isoMatch) {
    const d = new Date(
      parseInt(isoMatch[1]),
      parseInt(isoMatch[2]) - 1,
      parseInt(isoMatch[3])
    );
    if (!isNaN(d.getTime())) return d;
  }

  // Formato italiano: dd/MM/yyyy o dd-MM-yyyy o dd.MM.yyyy
  const italianMatch = trimmed.match(
    /^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/
  );
  if (italianMatch) {
    const d = new Date(
      parseInt(italianMatch[3]),
      parseInt(italianMatch[2]) - 1,
      parseInt(italianMatch[1])
    );
    if (!isNaN(d.getTime())) return d;
  }

  // Formato italiano corto: dd/MM/yy
  const italianShortMatch = trimmed.match(
    /^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2})$/
  );
  if (italianShortMatch) {
    const yearShort = parseInt(italianShortMatch[3]);
    const fullYear = yearShort >= 50 ? 1900 + yearShort : 2000 + yearShort;
    const d = new Date(
      fullYear,
      parseInt(italianShortMatch[2]) - 1,
      parseInt(italianShortMatch[1])
    );
    if (!isNaN(d.getTime())) return d;
  }

  // Formato yyyyMMdd (senza separatori)
  const compactMatch = trimmed.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (compactMatch) {
    const d = new Date(
      parseInt(compactMatch[1]),
      parseInt(compactMatch[2]) - 1,
      parseInt(compactMatch[3])
    );
    if (!isNaN(d.getTime())) return d;
  }

  // Fallback: Date.parse nativo
  const fallback = new Date(trimmed);
  if (!isNaN(fallback.getTime())) return fallback;

  return null;
}

// ---------------------------------------------------------------------------
// Utilita date
// ---------------------------------------------------------------------------

function daysBetween(a: Date, b: Date): number {
  const msPerDay = 86_400_000;
  const utcA = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const utcB = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.abs(utcA - utcB) / msPerDay;
}

// ---------------------------------------------------------------------------
// 1. Risoluzione targa -> vehicleId
// ---------------------------------------------------------------------------

/**
 * Cerca un TenantVehicle per targa (case-insensitive, senza spazi/trattini).
 * Restituisce il vehicleId oppure null se non trovato.
 */
export async function resolveLicensePlate(
  prisma: PrismaClientWithTenant,
  licensePlate: string
): Promise<number | null> {
  const normalized = normalizePlate(licensePlate);
  if (!normalized) return null;

  // Ricerca diretta sulla targa normalizzata
  const vehicle = await prisma.tenantVehicle.findFirst({
    where: {
      licensePlate: normalized,
      status: { not: "DISPOSED" },
    },
    select: { id: true },
  });

  if (vehicle) return vehicle.id;

  // Fallback: ricerca case-insensitive con contains (per targhe con formattazione diversa)
  const vehicles = await prisma.tenantVehicle.findMany({
    where: {
      status: { not: "DISPOSED" },
    },
    select: { id: true, licensePlate: true },
  });

  for (const v of vehicles) {
    if (normalizePlate(v.licensePlate) === normalized) {
      return v.id;
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// 2. Ricerca candidati FuelRecord
// ---------------------------------------------------------------------------

/**
 * Trova i FuelRecord per un veicolo entro un intervallo di date
 * definito dalla tolleranza in giorni.
 */
export async function findCandidateFuelRecords(
  prisma: PrismaClientWithTenant,
  vehicleId: number,
  date: Date | null,
  toleranceDays: number
): Promise<FuelRecordCandidate[]> {
  // Se non abbiamo una data, prendiamo tutti i record del veicolo (ultimi 90 giorni)
  const dateFilter = date
    ? {
        date: {
          gte: new Date(
            date.getFullYear(),
            date.getMonth(),
            date.getDate() - toleranceDays
          ),
          lte: new Date(
            date.getFullYear(),
            date.getMonth(),
            date.getDate() + toleranceDays,
            23,
            59,
            59
          ),
        },
      }
    : {
        date: {
          gte: new Date(Date.now() - 90 * 86_400_000),
        },
      };

  const records = await prisma.fuelRecord.findMany({
    where: {
      vehicleId,
      ...dateFilter,
    },
    select: {
      id: true,
      date: true,
      quantityLiters: true,
      amountEur: true,
      fuelType: true,
    },
    orderBy: { date: "desc" },
  });

  return records.map((r) => ({
    id: r.id,
    date: r.date,
    quantity: r.quantityLiters,
    totalCost: r.amountEur,
    fuelType: r.fuelType,
  }));
}

// ---------------------------------------------------------------------------
// 3. Calcolo punteggio di corrispondenza
// ---------------------------------------------------------------------------

/**
 * Calcola un punteggio ponderato di corrispondenza tra una riga estratta
 * dalla fattura e un record carburante candidato.
 *
 * Ogni componente produce un punteggio 0-1, pesato secondo la configurazione.
 */
export function calculateMatchScore(
  extractedLine: ExtractedLine,
  candidate: FuelRecordCandidate,
  tolerances: MatchingTolerances
): MatchScoreBreakdown {
  const weights = tolerances.weights;

  // --- Targa ---
  // Se siamo arrivati qui, la targa e' stata risolta con successo
  // (il candidato proviene da una query filtrata per vehicleId)
  const licensePlateScore = 1.0;
  const licensePlateDetail = extractedLine.licensePlate
    ? `Targa risolta: ${extractedLine.licensePlate}`
    : "Targa non presente nella riga";

  // --- Data ---
  let dateScore = 0;
  let dateDetail = "";

  const extractedDate = parseFlexibleDate(extractedLine.date);
  if (extractedDate && candidate.date) {
    const diff = daysBetween(extractedDate, candidate.date);
    if (diff === 0) {
      dateScore = 1.0;
      dateDetail = "Data: corrispondenza esatta";
    } else if (diff <= tolerances.dateToleranceDays) {
      // Decadimento lineare: 1.0 a 0 giorni, 0.0 al limite della tolleranza
      dateScore = 1.0 - diff / tolerances.dateToleranceDays;
      dateDetail = `Data: differenza di ${diff} giorn${diff === 1 ? "o" : "i"} (tolleranza: ${tolerances.dateToleranceDays}gg)`;
    } else {
      dateScore = 0;
      dateDetail = `Data: differenza di ${diff} giorni, fuori tolleranza (max ${tolerances.dateToleranceDays}gg)`;
    }
  } else if (!extractedDate) {
    dateScore = 0;
    dateDetail = "Data: non disponibile nella riga estratta";
  } else {
    dateScore = 0;
    dateDetail = "Data: non disponibile nel record candidato";
  }

  // --- Quantita ---
  let quantityScore = 0;
  let quantityDetail = "";

  const extractedQty = extractedLine.quantity;
  const candidateQty = candidate.quantity;

  if (
    extractedQty != null &&
    candidateQty != null &&
    candidateQty > 0
  ) {
    const pctDiff =
      (Math.abs(extractedQty - candidateQty) / candidateQty) * 100;
    if (pctDiff === 0) {
      quantityScore = 1.0;
      quantityDetail = `Quantita: corrispondenza esatta (${extractedQty})`;
    } else if (pctDiff <= tolerances.quantityTolerancePercent) {
      quantityScore = 1.0 - pctDiff / tolerances.quantityTolerancePercent;
      quantityDetail = `Quantita: differenza ${pctDiff.toFixed(1)}% (fattura: ${extractedQty}, record: ${candidateQty})`;
    } else {
      quantityScore = 0;
      quantityDetail = `Quantita: differenza ${pctDiff.toFixed(1)}%, fuori tolleranza (max ${tolerances.quantityTolerancePercent}%)`;
    }
  } else if (extractedQty == null) {
    quantityScore = 0;
    quantityDetail = "Quantita: non disponibile nella riga estratta";
  } else {
    quantityScore = 0;
    quantityDetail = "Quantita: non disponibile nel record candidato";
  }

  // --- Importo ---
  let amountScore = 0;
  let amountDetail = "";

  const extractedAmount = extractedLine.amount;
  const candidateAmount = candidate.totalCost;

  if (
    extractedAmount != null &&
    candidateAmount != null &&
    candidateAmount > 0
  ) {
    const pctDiff =
      (Math.abs(extractedAmount - candidateAmount) / candidateAmount) * 100;
    if (pctDiff === 0) {
      amountScore = 1.0;
      amountDetail = `Importo: corrispondenza esatta (${extractedAmount.toFixed(2)} EUR)`;
    } else if (pctDiff <= tolerances.amountTolerancePercent) {
      amountScore = 1.0 - pctDiff / tolerances.amountTolerancePercent;
      amountDetail = `Importo: differenza ${pctDiff.toFixed(1)}% (fattura: ${extractedAmount.toFixed(2)}, record: ${candidateAmount.toFixed(2)})`;
    } else {
      amountScore = 0;
      amountDetail = `Importo: differenza ${pctDiff.toFixed(1)}%, fuori tolleranza (max ${tolerances.amountTolerancePercent}%)`;
    }
  } else if (extractedAmount == null) {
    amountScore = 0;
    amountDetail = "Importo: non disponibile nella riga estratta";
  } else {
    amountScore = 0;
    amountDetail = "Importo: non disponibile nel record candidato";
  }

  // --- Tipo carburante ---
  let fuelTypeScore = 0;
  let fuelTypeDetail = "";

  const canonExtracted = canonicalizeFuelType(extractedLine.fuelType);
  const canonCandidate = canonicalizeFuelType(candidate.fuelType);

  if (canonExtracted && canonCandidate) {
    if (canonExtracted === canonCandidate) {
      fuelTypeScore = 1.0;
      fuelTypeDetail = `Tipo carburante: corrispondenza esatta (${canonExtracted})`;
    } else if (areFuelTypesCompatible(canonExtracted, canonCandidate)) {
      fuelTypeScore = 0.5;
      fuelTypeDetail = `Tipo carburante: compatibile (fattura: ${extractedLine.fuelType} -> ${canonExtracted}, record: ${candidate.fuelType} -> ${canonCandidate})`;
    } else {
      fuelTypeScore = 0;
      fuelTypeDetail = `Tipo carburante: non corrispondente (fattura: ${extractedLine.fuelType} -> ${canonExtracted}, record: ${candidate.fuelType} -> ${canonCandidate})`;
    }
  } else if (!canonExtracted) {
    fuelTypeScore = 0;
    fuelTypeDetail = "Tipo carburante: non disponibile nella riga estratta";
  } else {
    fuelTypeScore = 0;
    fuelTypeDetail = "Tipo carburante: non disponibile nel record candidato";
  }

  // --- Punteggio totale ponderato ---
  const totalScore =
    licensePlateScore * weights.licensePlate +
    dateScore * weights.date +
    quantityScore * weights.quantity +
    amountScore * weights.amount +
    fuelTypeScore * weights.fuelType;

  return {
    licensePlate: {
      score: licensePlateScore,
      weight: weights.licensePlate,
      detail: licensePlateDetail,
    },
    date: {
      score: dateScore,
      weight: weights.date,
      detail: dateDetail,
    },
    quantity: {
      score: quantityScore,
      weight: weights.quantity,
      detail: quantityDetail,
    },
    amount: {
      score: amountScore,
      weight: weights.amount,
      detail: amountDetail,
    },
    fuelType: {
      score: fuelTypeScore,
      weight: weights.fuelType,
      detail: fuelTypeDetail,
    },
    totalScore: Math.round(totalScore * 10000) / 10000,
  };
}

// ---------------------------------------------------------------------------
// 4. Matching principale: righe fattura vs FuelRecord
// ---------------------------------------------------------------------------

/**
 * Esegue il matching di un array di righe estratte da una fattura XML
 * contro i FuelRecord esistenti nel database.
 *
 * Per ogni riga:
 * 1. Risolve la targa a un vehicleId
 * 2. Cerca i FuelRecord candidati entro la tolleranza temporale
 * 3. Calcola il punteggio per ogni candidato
 * 4. Seleziona il miglior candidato e determina lo stato del match
 */
export async function matchInvoiceLines(
  prisma: PrismaClientWithTenant,
  lines: ExtractedLine[],
  tolerances: MatchingTolerances,
  requireManualConfirm: boolean
): Promise<MatchingResult> {
  const results: MatchResult[] = [];

  // Cache delle risoluzioni targa per evitare query duplicate
  const plateCache = new Map<string, number | null>();

  for (const line of lines) {
    try {
      // 1. Risolvi la targa
      const rawPlate = line.licensePlate?.trim() ?? "";
      if (!rawPlate) {
        results.push({
          lineNumber: line.lineNumber,
          extractedLine: line,
          matchStatus: "ERROR",
          matchedFuelRecordId: null,
          matchScore: null,
          matchDetails: null,
          resolvedVehicleId: null,
          candidateCount: 0,
          error: "Targa mancante nella riga estratta",
        });
        continue;
      }

      const normalizedPlate = normalizePlate(rawPlate);
      let vehicleId: number | null;

      if (plateCache.has(normalizedPlate)) {
        vehicleId = plateCache.get(normalizedPlate)!;
      } else {
        vehicleId = await resolveLicensePlate(prisma, rawPlate);
        plateCache.set(normalizedPlate, vehicleId);
      }

      if (!vehicleId) {
        results.push({
          lineNumber: line.lineNumber,
          extractedLine: line,
          matchStatus: "ERROR",
          matchedFuelRecordId: null,
          matchScore: null,
          matchDetails: null,
          resolvedVehicleId: null,
          candidateCount: 0,
          error: `Targa non trovata nel parco veicoli: ${rawPlate}`,
        });
        continue;
      }

      // 2. Cerca candidati
      const extractedDate = parseFlexibleDate(line.date);
      const candidates = await findCandidateFuelRecords(
        prisma,
        vehicleId,
        extractedDate,
        tolerances.dateToleranceDays
      );

      if (candidates.length === 0) {
        results.push({
          lineNumber: line.lineNumber,
          extractedLine: line,
          matchStatus: "UNMATCHED",
          matchedFuelRecordId: null,
          matchScore: 0,
          matchDetails: null,
          resolvedVehicleId: vehicleId,
          candidateCount: 0,
        });
        continue;
      }

      // 3. Calcola punteggio per ogni candidato
      let bestScore = -1;
      let bestCandidate: FuelRecordCandidate | null = null;
      let bestBreakdown: MatchScoreBreakdown | null = null;

      for (const candidate of candidates) {
        const breakdown = calculateMatchScore(line, candidate, tolerances);
        if (breakdown.totalScore > bestScore) {
          bestScore = breakdown.totalScore;
          bestCandidate = candidate;
          bestBreakdown = breakdown;
        }
      }

      // 4. Determina lo stato del match
      let matchStatus: MatchResult["matchStatus"];

      if (bestScore >= tolerances.autoMatchThreshold && !requireManualConfirm) {
        matchStatus = "AUTO_MATCHED";
      } else if (bestScore >= 0.5) {
        matchStatus = "SUGGESTED";
      } else {
        matchStatus = "UNMATCHED";
      }

      // Aggiorna il dettaglio della targa con il vehicleId risolto
      if (bestBreakdown) {
        bestBreakdown.licensePlate.detail = `Targa risolta: ${rawPlate} -> veicolo ${vehicleId}`;
      }

      results.push({
        lineNumber: line.lineNumber,
        extractedLine: line,
        matchStatus,
        matchedFuelRecordId: bestCandidate?.id ?? null,
        matchScore: bestScore,
        matchDetails: bestBreakdown,
        resolvedVehicleId: vehicleId,
        candidateCount: candidates.length,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Errore sconosciuto";
      results.push({
        lineNumber: line.lineNumber,
        extractedLine: line,
        matchStatus: "ERROR",
        matchedFuelRecordId: null,
        matchScore: null,
        matchDetails: null,
        resolvedVehicleId: null,
        candidateCount: 0,
        error: `Errore durante il matching della riga ${line.lineNumber}: ${message}`,
      });
    }
  }

  // Costruisci il riepilogo
  const summary = {
    total: results.length,
    autoMatched: results.filter((r) => r.matchStatus === "AUTO_MATCHED").length,
    suggested: results.filter((r) => r.matchStatus === "SUGGESTED").length,
    unmatched: results.filter((r) => r.matchStatus === "UNMATCHED").length,
    errors: results.filter((r) => r.matchStatus === "ERROR").length,
  };

  return { results, summary };
}

// ---------------------------------------------------------------------------
// Export utilita per testing
// ---------------------------------------------------------------------------

export {
  parseFlexibleDate,
  canonicalizeFuelType,
  areFuelTypesCompatible,
  normalizePlate,
  daysBetween,
};
