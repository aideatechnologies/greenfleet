/**
 * Client SQL diretto per il database InfocarData (Quattroruote Professional).
 *
 * Interroga le tabelle IDAT tramite connessione SQL Server diretta,
 * bypassando l'API HTTP quando non configurata.
 *
 * Tabelle principali utilizzate:
 * - IDAT0200F (Base): CODALL, ANNOXX, MESEXX
 * - IDAT0620F (Dati Tecnici): CODNOR, CODCAR, FLAIBR
 * - IDAT2420F (Cambi/Prestazioni): NUCMOT, CODCOM, POTKWX, POTCVX, CAPSER
 * - IDAT2620F (Dettaglio Motore): CILIND
 * - IDAT8400F (WLTP): CO2CCW, CONSCW
 * - IDAT3000F (Marche), IDAT3100F (Modelli), IDAT3210F (Allestimenti)
 * - IDAT3520F (Combustibili), IDAT3600F (Carrozzerie), IDAT4800F (Normative)
 * - IDAT2320F (Codici Casa)
 */
import { ConnectionPool, Int, NVarChar } from "mssql";

import { logger } from "@/lib/utils/logger";
import type {
  InfocarDataVehicleRaw,
  InfocarDataEngineRaw,
  InfocarDataBatchResponse,
} from "@/lib/integrations/infocardata/types";

// ---------------------------------------------------------------------------
// Configurazione
// ---------------------------------------------------------------------------

interface InfocarSqlConfig {
  server: string;
  database: string;
  user: string;
  password: string;
  tablePrefix: string;
}

export function getInfocarSqlConfig(): InfocarSqlConfig | null {
  const server = process.env.INFOCAR_SERVER;
  const database = process.env.INFOCAR_DATABASE;
  const user = process.env.INFOCAR_USER;
  const password = process.env.INFOCAR_PASSWORD;

  if (!server || !database || !user || !password) {
    return null;
  }

  return {
    server,
    database,
    user,
    password,
    tablePrefix: (process.env.INFOCAR_TABLE_PREFIX || "IDAT").replace(
      /"/g,
      ""
    ),
  };
}

export function isInfocarSqlConfigured(): boolean {
  return getInfocarSqlConfig() !== null;
}

// ---------------------------------------------------------------------------
// Connection Pool (singleton)
// ---------------------------------------------------------------------------

let pool: ConnectionPool | null = null;

async function getPool(): Promise<ConnectionPool> {
  if (pool?.connected) return pool;

  const config = getInfocarSqlConfig();
  if (!config) throw new Error("InfoCar SQL non configurato");

  pool = new ConnectionPool({
    server: config.server,
    database: config.database,
    user: config.user,
    password: config.password,
    options: {
      encrypt: false,
      trustServerCertificate: true,
    },
    pool: {
      max: 5,
      min: 0,
      idleTimeoutMillis: 30000,
    },
  });

  await pool.connect();
  logger.info(
    { server: config.server, database: config.database },
    "Pool connessione InfoCar SQL stabilito"
  );

  return pool;
}

/** Table name helper: builds IDAT{suffix} from prefix config */
function tbl(prefix: string, suffix: string): string {
  return `${prefix}${suffix}`;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Conta il numero totale di veicoli distinti (CODALL) nel database InfoCar.
 */
export async function countVehicles(marca?: string): Promise<number> {
  const config = getInfocarSqlConfig();
  if (!config) throw new Error("InfoCar SQL non configurato");

  const p = await getPool();
  const T = (s: string) => tbl(config.tablePrefix, s);

  let query: string;
  const request = p.request();

  if (marca) {
    request.input("marca", NVarChar, `%${marca}%`);
    query = `
      SELECT COUNT(DISTINCT b.CODALL) as total
      FROM ${T("0200F")} b
      INNER JOIN ${T("3210F")} a ON RTRIM(b.CODALL) = RTRIM(a.CODALL)
      INNER JOIN ${T("3000F")} m ON RTRIM(a.CODMAR) = RTRIM(m.CODMAR)
      WHERE RTRIM(m.DESMAR) LIKE @marca
    `;
  } else {
    query = `SELECT COUNT(DISTINCT CODALL) as total FROM ${T("0200F")}`;
  }

  const result = await request.query(query);
  return result.recordset[0]?.total ?? 0;
}

/**
 * Recupera un batch paginato di veicoli dal database InfoCar SQL.
 *
 * Per ogni CODALL prende la versione piu recente (max ANNOXX+MESEXX),
 * decodifica marca/modello/allestimento dalle anagrafiche, e raccoglie
 * i motori con i dati WLTP dalle tabelle correlate.
 */
export async function fetchVehicleBatchSql(params?: {
  limit?: number;
  offset?: number;
  marca?: string;
}): Promise<InfocarDataBatchResponse> {
  const config = getInfocarSqlConfig();
  if (!config) throw new Error("InfoCar SQL non configurato");

  const limit = params?.limit ?? 100;
  const offset = params?.offset ?? 0;
  const p = await getPool();
  const T = (s: string) => tbl(config.tablePrefix, s);

  // Step 1: Count total
  const total = await countVehicles(params?.marca);

  if (total === 0) {
    return { data: [], total: 0, hasMore: false };
  }

  // Step 2: Get paginated CODALL list (latest version per CODALL)
  const codallRequest = p.request();
  codallRequest.input("offset", Int, offset);
  codallRequest.input("limit", Int, limit);

  let codallQuery = `
    WITH LatestBase AS (
      SELECT
        RTRIM(b.CODALL) as CODALL,
        RTRIM(b.ANNOXX) as ANNOXX,
        RTRIM(b.MESEXX) as MESEXX,
        ROW_NUMBER() OVER (
          PARTITION BY RTRIM(b.CODALL)
          ORDER BY b.ANNOXX DESC, b.MESEXX DESC
        ) as rn
      FROM ${T("0200F")} b
    )
    SELECT CODALL, ANNOXX, MESEXX
    FROM LatestBase
    WHERE rn = 1
  `;

  if (params?.marca) {
    codallRequest.input("marca", NVarChar, `%${params.marca}%`);
    codallQuery = `
      WITH LatestBase AS (
        SELECT
          RTRIM(b.CODALL) as CODALL,
          RTRIM(b.ANNOXX) as ANNOXX,
          RTRIM(b.MESEXX) as MESEXX,
          ROW_NUMBER() OVER (
            PARTITION BY RTRIM(b.CODALL)
            ORDER BY b.ANNOXX DESC, b.MESEXX DESC
          ) as rn
        FROM ${T("0200F")} b
      )
      SELECT lb.CODALL, lb.ANNOXX, lb.MESEXX
      FROM LatestBase lb
      INNER JOIN ${T("3210F")} a ON lb.CODALL = RTRIM(a.CODALL)
      INNER JOIN ${T("3000F")} m ON RTRIM(a.CODMAR) = RTRIM(m.CODMAR)
      WHERE lb.rn = 1 AND RTRIM(m.DESMAR) LIKE @marca
    `;
  }

  codallQuery += ` ORDER BY CODALL OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`;

  const codallResult = await codallRequest.query(codallQuery);

  if (codallResult.recordset.length === 0) {
    return { data: [], total, hasMore: offset + limit < total };
  }

  // Step 3: Build list of vehicle keys
  const vehicleKeys = codallResult.recordset.map(
    (r: { CODALL?: string; ANNOXX?: string; MESEXX?: string }) => ({
      codall: String(r.CODALL ?? "").trim(),
      annoxx: String(r.ANNOXX ?? "").trim(),
      mesexx: String(r.MESEXX ?? "").trim(),
    })
  );

  // Validate CODALL values (alphanumeric max 10 chars) to prevent injection
  const safeCodalls = vehicleKeys
    .map((k) => k.codall)
    .filter((c) => /^[A-Za-z0-9]{1,10}$/.test(c));

  if (safeCodalls.length === 0) {
    return { data: [], total, hasMore: offset + limit < total };
  }

  // Step 4: Fetch full vehicle + engine data
  const inClause = safeCodalls.map((c) => `'${c}'`).join(",");

  const dataQuery = `
    SELECT
      RTRIM(b.CODALL) as CODALL,
      RTRIM(b.ANNOXX) as ANNOXX,
      RTRIM(b.MESEXX) as MESEXX,
      -- Anagrafica veicolo
      RTRIM(ISNULL(m.DESMAR, '')) as marca,
      RTRIM(ISNULL(md.DESMO, '')) as modello,
      RTRIM(ISNULL(a.DESALL, '')) as allestimento,
      RTRIM(ISNULL(carr.DESCAR, '')) as carrozzeria,
      RTRIM(ISNULL(norm.DESNOR, '')) as normativa,
      RTRIM(ISNULL(tech.FLAIBR, 'N')) as flaibr,
      RTRIM(ISNULL(cs.CODCAS, '')) as codiceAllestimento,
      -- Dati motore (da IDAT2420F)
      RTRIM(e.NUCMOT) as nucmot,
      RTRIM(e.CODCOM) as codcom,
      RTRIM(ISNULL(fuel.DESCOM, '')) as tipoAlimentazione,
      TRY_CAST(mot.CILIND AS INT) as cilindrata,
      TRY_CAST(e.POTKWX AS DECIMAL(10,1)) as potenzaKw,
      TRY_CAST(e.POTCVX AS INT) as potenzaCv,
      -- Emissioni: preferisci WLTP (IDAT8400F), fallback NEDC (IDAT2420F)
      TRY_CAST(ISNULL(w.CO2CCW, e.CO2CO1) AS DECIMAL(10,1)) as co2GKm,
      TRY_CAST(ISNULL(w.CONSCW, e.CONSU1) AS DECIMAL(10,1)) as consumo,
      CASE WHEN w.CO2CCW IS NOT NULL THEN 'WLTP' ELSE 'NEDC' END as standardEmissione,
      -- Capacita serbatoio (da motore)
      TRY_CAST(e.CAPSER AS INT) as capacitaSerbatoio
    FROM ${T("0200F")} b
    -- Anagrafica allestimento -> marca -> modello
    LEFT JOIN ${T("3210F")} a
      ON RTRIM(b.CODALL) = RTRIM(a.CODALL)
    LEFT JOIN ${T("3000F")} m
      ON RTRIM(a.CODMAR) = RTRIM(m.CODMAR)
    LEFT JOIN ${T("3100F")} md
      ON RTRIM(a.CODMAR) = RTRIM(md.CODMAR)
      AND RTRIM(a.CODMOD) = RTRIM(md.CODMOD)
    -- Dati tecnici base
    LEFT JOIN ${T("0620F")} tech
      ON b.CODALL = tech.CODALL
      AND b.ANNOXX = tech.ANNOXX
      AND b.MESEXX = tech.MESEXX
    -- Decodifica carrozzeria e normativa
    LEFT JOIN ${T("3600F")} carr
      ON RTRIM(ISNULL(tech.CODCAR, '')) = RTRIM(carr.CODCAR)
    LEFT JOIN ${T("4800F")} norm
      ON RTRIM(ISNULL(tech.CODNOR, '')) = RTRIM(norm.CODNOR)
    -- Codice casa (primo record per versione)
    LEFT JOIN (
      SELECT CODALL, ANNOXX, MESEXX, CODCAS,
        ROW_NUMBER() OVER (
          PARTITION BY CODALL, ANNOXX, MESEXX ORDER BY PRGINS
        ) as rn
      FROM ${T("2320F")}
    ) cs
      ON b.CODALL = cs.CODALL
      AND b.ANNOXX = cs.ANNOXX
      AND b.MESEXX = cs.MESEXX
      AND cs.rn = 1
    -- Motori (cambi e prestazioni)
    LEFT JOIN ${T("2420F")} e
      ON b.CODALL = e.CODALL
      AND b.ANNOXX = e.ANNOXX
      AND b.MESEXX = e.MESEXX
    -- Dettaglio motore (cilindrata)
    LEFT JOIN ${T("2620F")} mot
      ON RTRIM(e.NUCMOT) = RTRIM(mot.NUCMOT)
      AND RTRIM(e.CODCOM) = RTRIM(mot.CODCOM)
    -- Tipo combustibile
    LEFT JOIN ${T("3520F")} fuel
      ON RTRIM(e.CODCOM) = RTRIM(fuel.CODCOM)
    -- Emissioni/consumi WLTP
    LEFT JOIN ${T("8400F")} w
      ON e.CODALL = w.CODALL
      AND e.ANNOXX = w.ANNOXX
      AND e.MESEXX = w.MESEXX
      AND e.NUCTRA = w.NUCTRA
      AND e.NUCMOT = w.NUCMOT
      AND e.CODCOM = w.CODCOM
    WHERE RTRIM(b.CODALL) IN (${inClause})
      AND b.ANNOXX + b.MESEXX = (
        SELECT MAX(b2.ANNOXX + b2.MESEXX)
        FROM ${T("0200F")} b2
        WHERE b2.CODALL = b.CODALL
      )
    ORDER BY b.CODALL, e.NUCMOT, e.CODCOM
  `;

  const dataResult = await p.request().query(dataQuery);

  // Step 5: Group rows into InfocarDataVehicleRaw with engines
  const vehicleMap = new Map<string, InfocarDataVehicleRaw>();

  for (const row of dataResult.recordset) {
    const codall = String(row.CODALL ?? "").trim();
    if (!codall) continue;

    if (!vehicleMap.has(codall)) {
      vehicleMap.set(codall, {
        codice: codall,
        marca: String(row.marca ?? "").trim(),
        modello: String(row.modello ?? "").trim(),
        allestimento: row.allestimento || undefined,
        carrozzeria: row.carrozzeria || undefined,
        normativa: row.normativa || undefined,
        capacitaSerbatoio: undefined,
        codiceAllestimento: row.codiceAllestimento || undefined,
        annoImmatricolazione: row.ANNOXX
          ? parseInt(String(row.ANNOXX), 10)
          : undefined,
        isHybrid: String(row.flaibr ?? "").trim() === "S",
        motori: [],
      });
    }

    // Add engine if present
    const nucmot = String(row.nucmot ?? "").trim();
    const codcom = String(row.codcom ?? "").trim();
    const tipoAlimentazione = String(row.tipoAlimentazione ?? "").trim();

    if (nucmot && tipoAlimentazione) {
      const vehicle = vehicleMap.get(codall)!;

      // Deduplicate engines by nucmot+codcom
      const alreadyAdded = vehicle.motori.some(
        (m) => m.nucmot === nucmot && m.tipoAlimentazione === tipoAlimentazione
      );

      if (!alreadyAdded) {
        const engine: InfocarDataEngineRaw = {
          nucmot,
          tipoAlimentazione,
          cilindrata: row.cilindrata != null ? Number(row.cilindrata) : undefined,
          potenzaKw: row.potenzaKw != null ? Number(row.potenzaKw) : undefined,
          potenzaCv: row.potenzaCv != null ? Number(row.potenzaCv) : undefined,
          co2GKm: row.co2GKm != null ? Number(row.co2GKm) : undefined,
          consumo: row.consumo != null ? Number(row.consumo) : undefined,
          standardEmissione: row.standardEmissione || undefined,
        };
        vehicle.motori.push(engine);
      }

      // Set tank capacity from engine data if not yet set
      if (!vehicle.capacitaSerbatoio && row.capacitaSerbatoio) {
        vehicle.capacitaSerbatoio = Number(row.capacitaSerbatoio);
      }
    }
  }

  const data = Array.from(vehicleMap.values());
  const hasMore = offset + limit < total;

  logger.info(
    {
      vehicleCount: data.length,
      totalEngines: data.reduce((sum, v) => sum + v.motori.length, 0),
      offset,
      limit,
      total,
    },
    "Batch veicoli InfoCar SQL recuperato"
  );

  return { data, total, hasMore };
}

/**
 * Chiude il pool di connessioni.
 */
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.close();
    pool = null;
    logger.info("Pool connessione InfoCar SQL chiuso");
  }
}
