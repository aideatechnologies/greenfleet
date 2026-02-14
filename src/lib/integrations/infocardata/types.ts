/**
 * Tipi raw provenienti dal database InfocarData (SQL Server read-only).
 *
 * I campi corrispondono ai file del Modulo Identificazione:
 * - IDAT0200F (Base): CODALL, ANNOXX, MESEXX
 * - IDAT0620F (Dati Tecnici): CODCAR, CODNOR, FLAIBR
 * - IDAT2420F (Cambi e Prestazioni): NUCMOT, CODCOM, cilindrata, potenza
 * - IDAT8400F (WLTP Consumi/Emissioni CO2): CO2CCW, CONSCW, CODCOW
 * - Anagrafiche: marca, modello, allestimento
 */

export interface InfocarDataVehicleRaw {
  /** CODALL - Codice allestimento/Infocar progressivo */
  codice: string;
  /** Marca del veicolo (da anagrafica) */
  marca: string;
  /** Modello del veicolo (da anagrafica) */
  modello: string;
  /** Descrizione allestimento */
  allestimento?: string;
  /** Tipo carrozzeria (CODCAR decodificato) */
  carrozzeria?: string;
  /** Normativa anti-inquinamento (CODNOR decodificato) */
  normativa?: string;
  /** Capacita serbatoio in litri */
  capacitaSerbatoio?: number;
  /** Codice allestimento casa costruttrice (CODCAS) */
  codiceAllestimento?: string;
  /** Anno di registrazione (ANNOXX) */
  annoImmatricolazione?: number;
  /** Flag veicolo ibrido (FLAIBR = 'S') */
  isHybrid?: boolean;
  /** Motori associati al veicolo */
  motori: InfocarDataEngineRaw[];
}

export interface InfocarDataEngineRaw {
  /** NUCMOT - Codice nucleo motore */
  nucmot: string;
  /** CODCOM - Tipo alimentazione (es. "Benzina", "Gasolio", "Elettrico") */
  tipoAlimentazione: string;
  /** Cilindrata in cc */
  cilindrata?: number;
  /** Potenza in kW */
  potenzaKw?: number;
  /** Potenza in CV (POTFIS) */
  potenzaCv?: number;
  /** Emissioni CO2 combinate WLTP in g/km (CO2CCW) */
  co2GKm?: number;
  /** Standard emissione (CODCOW: "WLTP" o "NEDC") */
  standardEmissione?: string;
  /** Consumo combinato WLTP (CONSCW) in L/100km o kWh/100km */
  consumo?: number;
  /** Unita di misura del consumo ("L/100KM" o "KWH/100KM") */
  unitaConsumo?: string;
}

export interface InfocarDataBatchParams {
  /** Data di partenza per import incrementale */
  fromDate?: Date;
  /** Filtro per marca */
  marca?: string;
  /** Numero massimo di record da restituire */
  limit?: number;
  /** Offset per paginazione */
  offset?: number;
}

export interface InfocarDataBatchResponse {
  /** Record veicoli restituiti */
  data: InfocarDataVehicleRaw[];
  /** Numero totale di record disponibili */
  total: number;
  /** Indica se ci sono altri record da recuperare */
  hasMore: boolean;
}

export interface ImportProgress {
  status: "idle" | "running" | "completed" | "failed";
  totalRecords: number;
  processedRecords: number;
  createdRecords: number;
  updatedRecords: number;
  skippedRecords: number;
  errors: ImportError[];
  startedAt?: Date;
  completedAt?: Date;
}

export interface ImportError {
  /** CODALL del veicolo che ha generato l'errore */
  codice: string;
  /** Descrizione dell'errore */
  message: string;
  /** Dati grezzi per debug (opzionale) */
  raw?: unknown;
}

/**
 * Crea un oggetto ImportProgress con valori iniziali.
 */
export function createInitialProgress(): ImportProgress {
  return {
    status: "idle",
    totalRecords: 0,
    processedRecords: 0,
    createdRecords: 0,
    updatedRecords: 0,
    skippedRecords: 0,
    errors: [],
  };
}
