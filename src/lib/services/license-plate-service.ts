import type { LicensePlateHistory } from "@/generated/prisma/client";
import type { PrismaClientWithTenant } from "@/lib/db/client";

// ---------------------------------------------------------------------------
// Tipi pubblici
// ---------------------------------------------------------------------------

export type LicensePlateHistoryRecord = LicensePlateHistory;

// ---------------------------------------------------------------------------
// Ritargatura veicolo
// ---------------------------------------------------------------------------

/**
 * Esegue la ritargatura di un veicolo:
 * 1. Verifica che la nuova targa non sia gia in uso da un altro veicolo attivo
 * 2. Chiude il record targa corrente (endDate = effectiveDate)
 * 3. Crea un nuovo record targa (startDate = effectiveDate, endDate = null)
 * 4. Aggiorna TenantVehicle.licensePlate
 */
export async function replatVehicle(
  db: PrismaClientWithTenant,
  data: {
    vehicleId: number;
    newPlateNumber: string;
    effectiveDate: Date;
    notes?: string;
  }
): Promise<LicensePlateHistoryRecord> {
  // 1. Verifica che la nuova targa non sia gia in uso
  const existingVehicle = await db.tenantVehicle.findFirst({
    where: {
      licensePlate: data.newPlateNumber,
      id: { not: data.vehicleId },
      status: { not: "DISPOSED" },
    },
  });

  if (existingVehicle) {
    throw new Error(
      `La targa ${data.newPlateNumber} e' gia in uso da un altro veicolo attivo`
    );
  }

  // 2. Trova il record targa corrente (endDate is null)
  const currentPlate = await db.licensePlateHistory.findFirst({
    where: {
      vehicleId: data.vehicleId,
      endDate: null,
    },
  });

  // 3. Se esiste un record corrente, valida la data e chiudilo
  if (currentPlate) {
    if (data.effectiveDate < currentPlate.startDate) {
      throw new Error(
        "La data effetto non puo essere precedente alla data di inizio della targa corrente"
      );
    }

    await db.licensePlateHistory.update({
      where: { id: currentPlate.id },
      data: { endDate: data.effectiveDate },
    });
  }

  // 4. Crea nuovo record targa
  const newPlateRecord = await db.licensePlateHistory.create({
    data: {
      tenantId: "", // Overwritten by tenant extension
      vehicleId: data.vehicleId,
      plateNumber: data.newPlateNumber,
      startDate: data.effectiveDate,
      endDate: null,
      notes: data.notes ?? null,
    },
  });

  // 5. Aggiorna la targa sul veicolo
  await db.tenantVehicle.update({
    where: { id: data.vehicleId },
    data: { licensePlate: data.newPlateNumber },
  });

  return newPlateRecord as unknown as LicensePlateHistoryRecord;
}

// ---------------------------------------------------------------------------
// Storico targhe per veicolo
// ---------------------------------------------------------------------------

/**
 * Recupera lo storico di tutte le targhe per un veicolo,
 * ordinato per startDate DESC (piu recente prima).
 */
export async function getPlateHistory(
  db: PrismaClientWithTenant,
  vehicleId: number
): Promise<LicensePlateHistoryRecord[]> {
  const records = await db.licensePlateHistory.findMany({
    where: { vehicleId },
    orderBy: { startDate: "desc" },
  });
  return records as unknown as LicensePlateHistoryRecord[];
}

// ---------------------------------------------------------------------------
// Targa attiva per veicolo
// ---------------------------------------------------------------------------

/**
 * Recupera il record targa attivo (endDate is null) per un veicolo.
 */
export async function getCurrentPlate(
  db: PrismaClientWithTenant,
  vehicleId: number
): Promise<LicensePlateHistoryRecord | null> {
  const record = await db.licensePlateHistory.findFirst({
    where: {
      vehicleId,
      endDate: null,
    },
  });
  return record as unknown as LicensePlateHistoryRecord | null;
}

// ---------------------------------------------------------------------------
// Inizializzazione storico targhe
// ---------------------------------------------------------------------------

/**
 * Crea il primo record storico targa per un nuovo veicolo.
 * Idempotente: se esiste gia un record per il veicolo, non ne crea un altro.
 */
export async function initializePlateHistory(
  db: PrismaClientWithTenant,
  vehicleId: number,
  plateNumber: string,
  startDate: Date
): Promise<LicensePlateHistoryRecord> {
  // Verifica se esiste gia un record
  const existing = await db.licensePlateHistory.findFirst({
    where: { vehicleId },
  });

  if (existing) {
    return existing as unknown as LicensePlateHistoryRecord;
  }

  const record = await db.licensePlateHistory.create({
    data: {
      tenantId: "", // Overwritten by tenant extension
      vehicleId,
      plateNumber,
      startDate,
      endDate: null,
    },
  });

  return record as unknown as LicensePlateHistoryRecord;
}
