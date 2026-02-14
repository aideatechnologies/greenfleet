import { prisma } from "@/lib/db/client";
import { logger } from "@/lib/utils/logger";
import { fetchVehicleBatch } from "@/lib/integrations/infocardata/client";
import {
  isInfocarSqlConfigured,
  fetchVehicleBatchSql,
} from "@/lib/integrations/infocar-sql/client";
import { mapVehicle, mapEngine } from "@/lib/integrations/infocardata/mapper";
import type {
  InfocarDataVehicleRaw,
  InfocarDataBatchResponse,
  ImportProgress,
} from "@/lib/integrations/infocardata/types";
import { createInitialProgress } from "@/lib/integrations/infocardata/types";

// ---------------------------------------------------------------------------
// Sorgente dati unificata: SQL diretto > HTTP API
// ---------------------------------------------------------------------------

/**
 * Recupera un batch di veicoli dalla sorgente disponibile.
 *
 * Priorita:
 * 1. Connessione SQL diretta (INFOCAR_SERVER configurato)
 * 2. API HTTP (INFOCARDATA_API_URL configurato)
 * 3. Errore se nessuna sorgente configurata
 */
async function fetchBatch(params: {
  limit: number;
  offset: number;
  marca?: string;
}): Promise<
  | { success: true; data: InfocarDataBatchResponse }
  | { success: false; error: string }
> {
  // Priorita 1: SQL diretto
  if (isInfocarSqlConfigured()) {
    try {
      const data = await fetchVehicleBatchSql(params);
      return { success: true, data };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error);
      logger.error(
        { error },
        "Errore nella connessione SQL diretta InfoCar"
      );
      return { success: false, error: `SQL diretto: ${message}` };
    }
  }

  // Priorita 2: HTTP API
  const httpResult = await fetchVehicleBatch(params);
  if (httpResult.success) {
    return httpResult;
  }

  // Nessuna sorgente disponibile
  return {
    success: false,
    error:
      "Nessuna sorgente InfoCar configurata. " +
      "Impostare INFOCAR_SERVER/DATABASE/USER/PASSWORD per connessione SQL diretta, " +
      "oppure INFOCARDATA_API_URL/API_KEY per API HTTP.",
  };
}

// ---------------------------------------------------------------------------
// Upsert singolo veicolo con motori (in transazione)
// ---------------------------------------------------------------------------

/**
 * Inserisce o aggiorna un singolo veicolo del catalogo con i relativi motori.
 *
 * L'operazione e atomica (transazione Prisma):
 * 1. Upsert del CatalogVehicle basato su `codiceInfocarData`
 * 2. Cancellazione di tutti i motori esistenti
 * 3. Creazione dei nuovi motori
 *
 * @param raw - Dati grezzi del veicolo da InfocarData
 * @returns 'created' | 'updated' | 'skipped' con il motivo
 */
export async function upsertCatalogVehicle(
  raw: InfocarDataVehicleRaw
): Promise<{ action: "created" | "updated" | "skipped"; reason?: string }> {
  if (!raw.codice) {
    return { action: "skipped", reason: "Codice InfocarData mancante" };
  }

  if (!raw.marca || !raw.modello) {
    return {
      action: "skipped",
      reason: `Dati obbligatori mancanti: marca=${raw.marca}, modello=${raw.modello}`,
    };
  }

  if (!raw.motori || raw.motori.length === 0) {
    return { action: "skipped", reason: "Nessun motore associato" };
  }

  const vehicleData = mapVehicle(raw);

  // Mappiamo i motori (escludendo quelli con tipo alimentazione non riconosciuto)
  const mappedEngines = raw.motori
    .map((engineRaw) => mapEngine(engineRaw, ""))
    .filter((e) => e !== null);

  if (mappedEngines.length === 0) {
    return {
      action: "skipped",
      reason: "Nessun motore con tipo alimentazione valido",
    };
  }

  // Verifichiamo se il veicolo esiste gia
  const existing = await prisma.catalogVehicle.findUnique({
    where: { codiceInfocarData: raw.codice },
    select: { id: true },
  });

  const isUpdate = !!existing;

  // Transazione atomica: upsert veicolo + replace motori
  await prisma.$transaction(async (tx) => {
    const vehicle = await tx.catalogVehicle.upsert({
      where: { codiceInfocarData: raw.codice },
      create: vehicleData,
      update: {
        marca: vehicleData.marca,
        modello: vehicleData.modello,
        allestimento: vehicleData.allestimento,
        carrozzeria: vehicleData.carrozzeria,
        normativa: vehicleData.normativa,
        capacitaSerbatoioL: vehicleData.capacitaSerbatoioL,
        isHybrid: vehicleData.isHybrid,
        codiceAllestimento: vehicleData.codiceAllestimento,
        annoImmatricolazione: vehicleData.annoImmatricolazione,
        lastSyncAt: vehicleData.lastSyncAt,
      },
    });

    // Rimuoviamo i motori esistenti e ricreiamo
    await tx.engine.deleteMany({
      where: { catalogVehicleId: vehicle.id },
    });

    for (const engineData of mappedEngines) {
      await tx.engine.create({
        data: {
          ...engineData,
          catalogVehicleId: vehicle.id,
        },
      });
    }
  });

  return { action: isUpdate ? "updated" : "created" };
}

// ---------------------------------------------------------------------------
// Import batch completo
// ---------------------------------------------------------------------------

/**
 * Esegue un import batch completo di tutti i veicoli da InfocarData.
 *
 * Scorre tutte le pagine disponibili e per ciascun veicolo
 * esegue un upsert nel catalogo locale.
 *
 * Sorgente: SQL diretto (prioritario) oppure HTTP API.
 *
 * @param onProgress - Callback opzionale per aggiornamenti di progresso
 * @returns Stato finale dell'import con statistiche
 */
export async function runBatchImport(
  onProgress?: (progress: ImportProgress) => void
): Promise<ImportProgress> {
  const progress: ImportProgress = {
    ...createInitialProgress(),
    status: "running",
    startedAt: new Date(),
  };

  const source = isInfocarSqlConfigured() ? "SQL diretto" : "HTTP API";
  logger.info({ source }, "Avvio import batch InfocarData");

  try {
    let offset = 0;
    let hasMore = true;
    const batchSize = parseInt(
      process.env.INFOCARDATA_BATCH_SIZE || "100",
      10
    );

    // Prima chiamata per ottenere il totale
    const firstResult = await fetchBatch({
      limit: batchSize,
      offset: 0,
    });

    if (!firstResult.success) {
      progress.status = "failed";
      progress.completedAt = new Date();
      progress.errors.push({
        codice: "",
        message: `Errore nella prima chiamata: ${firstResult.error}`,
      });
      logger.error({ error: firstResult.error }, "Import batch fallito alla prima chiamata");
      return progress;
    }

    progress.totalRecords = firstResult.data.total;
    onProgress?.(progress);

    if (progress.totalRecords === 0) {
      progress.status = "completed";
      progress.completedAt = new Date();
      logger.info("Nessun veicolo trovato nella sorgente InfoCar");
      return progress;
    }

    // Processiamo il primo batch
    await processBatch(firstResult.data.data, progress);
    offset += firstResult.data.data.length;
    hasMore = firstResult.data.hasMore;
    onProgress?.(progress);

    // Continuiamo con le pagine successive
    while (hasMore) {
      const result = await fetchBatch({
        limit: batchSize,
        offset,
      });

      if (!result.success) {
        progress.errors.push({
          codice: "",
          message: `Errore al batch offset=${offset}: ${result.error}`,
        });
        logger.warn(
          { offset, error: result.error },
          "Errore in un batch intermedio, continuo con il prossimo"
        );
        // Saltiamo questo batch e proviamo il prossimo
        offset += batchSize;
        if (offset >= progress.totalRecords) {
          hasMore = false;
        }
        continue;
      }

      await processBatch(result.data.data, progress);
      offset += result.data.data.length;
      hasMore = result.data.hasMore;
      onProgress?.(progress);
    }

    progress.status = "completed";
    progress.completedAt = new Date();

    logger.info(
      {
        source,
        total: progress.totalRecords,
        created: progress.createdRecords,
        updated: progress.updatedRecords,
        skipped: progress.skippedRecords,
        errors: progress.errors.length,
        durationMs: progress.completedAt.getTime() - progress.startedAt!.getTime(),
      },
      "Import batch InfocarData completato"
    );

    return progress;
  } catch (error) {
    progress.status = "failed";
    progress.completedAt = new Date();
    progress.errors.push({
      codice: "",
      message: `Errore fatale: ${error instanceof Error ? error.message : String(error)}`,
    });
    logger.error({ error }, "Import batch InfocarData fallito con errore fatale");
    return progress;
  }
}

// ---------------------------------------------------------------------------
// Import incrementale
// ---------------------------------------------------------------------------

/**
 * Esegue un import incrementale: recupera solo i veicoli modificati
 * dopo la data dell'ultima sincronizzazione (lastSyncAt).
 *
 * Nota: l'import incrementale con SQL diretto esegue un import completo
 * (il database InfoCar non ha un campo di data aggiornamento accessibile).
 *
 * @param onProgress - Callback opzionale per aggiornamenti di progresso
 * @returns Stato finale dell'import con statistiche
 */
export async function runIncrementalImport(
  onProgress?: (progress: ImportProgress) => void
): Promise<ImportProgress> {
  // Se usiamo SQL diretto, l'incrementale e equivalente al batch completo
  // (non c'e un campo "data modifica" nelle tabelle IDAT)
  if (isInfocarSqlConfigured()) {
    logger.info(
      "Import incrementale con SQL diretto: esecuzione batch completo"
    );
    return runBatchImport(onProgress);
  }

  // Con HTTP API, proviamo l'incrementale basato su fromDate
  const progress: ImportProgress = {
    ...createInitialProgress(),
    status: "running",
    startedAt: new Date(),
  };

  logger.info("Avvio import incrementale InfocarData (HTTP API)");

  try {
    // Troviamo la data dell'ultima sincronizzazione
    const lastSync = await prisma.catalogVehicle.findFirst({
      where: {
        source: "INFOCARDATA",
        lastSyncAt: { not: null },
      },
      orderBy: { lastSyncAt: "desc" },
      select: { lastSyncAt: true },
    });

    const fromDate = lastSync?.lastSyncAt ?? undefined;

    logger.info(
      { fromDate: fromDate?.toISOString() ?? "nessuna (primo import)" },
      "Data di partenza per import incrementale"
    );

    let offset = 0;
    let hasMore = true;
    const batchSize = parseInt(
      process.env.INFOCARDATA_BATCH_SIZE || "100",
      10
    );

    const firstResult = await fetchVehicleBatch({
      limit: batchSize,
      offset: 0,
      fromDate: fromDate ?? undefined,
    });

    if (!firstResult.success) {
      progress.status = "failed";
      progress.completedAt = new Date();
      progress.errors.push({
        codice: "",
        message: `Errore nella prima chiamata incrementale: ${firstResult.error}`,
      });
      logger.error(
        { error: firstResult.error },
        "Import incrementale fallito alla prima chiamata"
      );
      return progress;
    }

    progress.totalRecords = firstResult.data.total;
    onProgress?.(progress);

    if (progress.totalRecords === 0) {
      progress.status = "completed";
      progress.completedAt = new Date();
      logger.info("Nessun nuovo veicolo da importare (incrementale)");
      return progress;
    }

    // Processiamo il primo batch
    await processBatch(firstResult.data.data, progress);
    offset += firstResult.data.data.length;
    hasMore = firstResult.data.hasMore;
    onProgress?.(progress);

    // Pagine successive
    while (hasMore) {
      const result = await fetchVehicleBatch({
        limit: batchSize,
        offset,
        fromDate: fromDate ?? undefined,
      });

      if (!result.success) {
        progress.errors.push({
          codice: "",
          message: `Errore al batch offset=${offset}: ${result.error}`,
        });
        logger.warn(
          { offset, error: result.error },
          "Errore in un batch incrementale intermedio"
        );
        offset += batchSize;
        if (offset >= progress.totalRecords) {
          hasMore = false;
        }
        continue;
      }

      await processBatch(result.data.data, progress);
      offset += result.data.data.length;
      hasMore = result.data.hasMore;
      onProgress?.(progress);
    }

    progress.status = "completed";
    progress.completedAt = new Date();

    logger.info(
      {
        total: progress.totalRecords,
        created: progress.createdRecords,
        updated: progress.updatedRecords,
        skipped: progress.skippedRecords,
        errors: progress.errors.length,
        fromDate: fromDate?.toISOString() ?? "prima sincronizzazione",
        durationMs: progress.completedAt.getTime() - progress.startedAt!.getTime(),
      },
      "Import incrementale InfocarData completato"
    );

    return progress;
  } catch (error) {
    progress.status = "failed";
    progress.completedAt = new Date();
    progress.errors.push({
      codice: "",
      message: `Errore fatale: ${error instanceof Error ? error.message : String(error)}`,
    });
    logger.error(
      { error },
      "Import incrementale InfocarData fallito con errore fatale"
    );
    return progress;
  }
}

// ---------------------------------------------------------------------------
// Helpers interni
// ---------------------------------------------------------------------------

/**
 * Processa un array di veicoli raw, aggiornando l'oggetto progress.
 */
async function processBatch(
  vehicles: InfocarDataVehicleRaw[],
  progress: ImportProgress
): Promise<void> {
  for (const raw of vehicles) {
    try {
      const result = await upsertCatalogVehicle(raw);
      progress.processedRecords++;

      switch (result.action) {
        case "created":
          progress.createdRecords++;
          break;
        case "updated":
          progress.updatedRecords++;
          break;
        case "skipped":
          progress.skippedRecords++;
          if (result.reason) {
            logger.debug(
              { codice: raw.codice, reason: result.reason },
              "Veicolo saltato durante import"
            );
          }
          break;
      }
    } catch (error) {
      progress.processedRecords++;
      progress.skippedRecords++;
      progress.errors.push({
        codice: raw.codice || "sconosciuto",
        message:
          error instanceof Error ? error.message : String(error),
        raw: raw.codice ? { codice: raw.codice } : undefined,
      });

      logger.error(
        { error, codice: raw.codice },
        "Errore nell'upsert del veicolo durante import"
      );
    }
  }
}
