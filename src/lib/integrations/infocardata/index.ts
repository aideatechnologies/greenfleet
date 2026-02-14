/**
 * InfocarData Integration Module
 *
 * Integrazione con il database InfocarData (Quattroruote Professional)
 * per l'importazione del catalogo veicoli nel sistema Greenfleet.
 *
 * Moduli:
 * - client: HTTP client per comunicazione con l'API InfocarData
 * - mapper: Trasformazione dati raw -> formato Prisma
 * - health: Circuit breaker e monitoraggio disponibilita
 * - types: Tipi TypeScript per i dati InfocarData
 */

export { fetchVehicleBatch, fetchVehicleByCode, checkHealth } from "./client";
export {
  mapFuelType,
  mapCo2Standard,
  isHybridVehicle,
  mapVehicle,
  mapEngine,
} from "./mapper";
export { infocarDataHealth } from "./health";
export type {
  InfocarDataVehicleRaw,
  InfocarDataEngineRaw,
  InfocarDataBatchParams,
  InfocarDataBatchResponse,
  ImportProgress,
  ImportError,
} from "./types";
export { createInitialProgress } from "./types";
