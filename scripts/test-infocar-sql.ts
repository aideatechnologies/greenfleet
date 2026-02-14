/**
 * Script di test per verificare la connessione SQL diretta a InfoCar
 * e la corretta estrazione dei dati.
 *
 * Uso: npx tsx scripts/test-infocar-sql.ts
 */
import "dotenv/config";
import { ConnectionPool, Int, NVarChar } from "mssql";

async function main() {
  const server = process.env.INFOCAR_SERVER;
  const database = process.env.INFOCAR_DATABASE;
  const user = process.env.INFOCAR_USER;
  const password = process.env.INFOCAR_PASSWORD;
  const prefix = (process.env.INFOCAR_TABLE_PREFIX || "IDAT").replace(
    /"/g,
    ""
  );

  if (!server || !database || !user || !password) {
    console.error("Variabili INFOCAR_* non configurate");
    process.exit(1);
  }

  console.log(`Connessione a ${server}/${database}...`);

  const pool = new ConnectionPool({
    server,
    database,
    user,
    password,
    options: { encrypt: false, trustServerCertificate: true },
  });

  await pool.connect();
  console.log("Connesso!");

  // 1. Count total vehicles
  const countResult = await pool
    .request()
    .query(`SELECT COUNT(DISTINCT CODALL) as total FROM ${prefix}0200F`);
  console.log(`\nTotale CODALL distinti: ${countResult.recordset[0].total}`);

  // 2. Get some sample brands
  const brandsResult = await pool.request().query(`
    SELECT TOP 20 RTRIM(CODMAR) as CODMAR, RTRIM(DESMAR) as DESMAR
    FROM ${prefix}3000F
    ORDER BY DESMAR
  `);
  console.log("\nPrime 20 marche:");
  for (const row of brandsResult.recordset) {
    console.log(`  ${row.CODMAR} = ${row.DESMAR}`);
  }

  // 3. Get sample fuel types
  const fuelResult = await pool.request().query(`
    SELECT RTRIM(CODCOM) as CODCOM, RTRIM(DESCOM) as DESCOM
    FROM ${prefix}3520F
    ORDER BY CODCOM
  `);
  console.log("\nTipi combustibile:");
  for (const row of fuelResult.recordset) {
    console.log(`  ${row.CODCOM} = ${row.DESCOM}`);
  }

  // 4. Test the full vehicle query (first 3 vehicles)
  console.log("\n--- Test query veicoli completa (primi 3) ---");

  const vehicleQuery = `
    WITH LatestBase AS (
      SELECT
        RTRIM(b.CODALL) as CODALL,
        RTRIM(b.ANNOXX) as ANNOXX,
        RTRIM(b.MESEXX) as MESEXX,
        ROW_NUMBER() OVER (
          PARTITION BY RTRIM(b.CODALL)
          ORDER BY b.ANNOXX DESC, b.MESEXX DESC
        ) as rn
      FROM ${prefix}0200F b
    )
    SELECT TOP 3
      lb.CODALL, lb.ANNOXX, lb.MESEXX
    FROM LatestBase lb
    WHERE lb.rn = 1
    ORDER BY lb.CODALL
  `;

  const sampleCodalls = await pool.request().query(vehicleQuery);

  for (const row of sampleCodalls.recordset) {
    const codall = String(row.CODALL).trim();
    console.log(`\nCODALL: ${codall} (${row.ANNOXX}/${row.MESEXX})`);

    // Get full vehicle data
    const detailResult = await pool.request()
      .input("codall", NVarChar, codall)
      .query(`
        SELECT
          RTRIM(b.CODALL) as CODALL,
          RTRIM(ISNULL(m.DESMAR, '?')) as marca,
          RTRIM(ISNULL(md.DESMOM, '?')) as modello,
          RTRIM(ISNULL(a.DESALL, '')) as allestimento,
          RTRIM(ISNULL(tech.CODNOR, '')) as codnor,
          RTRIM(ISNULL(tech.FLAIBR, 'N')) as flaibr
        FROM ${prefix}0200F b
        LEFT JOIN ${prefix}3210F a ON RTRIM(b.CODALL) = RTRIM(a.CODALL)
        LEFT JOIN ${prefix}3000F m ON RTRIM(a.CODMAR) = RTRIM(m.CODMAR)
        LEFT JOIN ${prefix}3100F md ON RTRIM(a.CODMAR) = RTRIM(md.CODMAR) AND RTRIM(a.CODMOD) = RTRIM(md.CODMOD)
        LEFT JOIN ${prefix}0620F tech ON b.CODALL = tech.CODALL AND b.ANNOXX = tech.ANNOXX AND b.MESEXX = tech.MESEXX
        WHERE RTRIM(b.CODALL) = @codall
          AND b.ANNOXX = '${row.ANNOXX}' AND b.MESEXX = '${row.MESEXX}'
      `);

    if (detailResult.recordset.length > 0) {
      const v = detailResult.recordset[0];
      console.log(`  Marca: ${v.marca}`);
      console.log(`  Modello: ${v.modello}`);
      console.log(`  Allestimento: ${v.allestimento}`);
      console.log(`  Ibrido: ${v.flaibr}`);
    }

    // Get engines
    const engineResult = await pool.request()
      .input("codall2", NVarChar, codall)
      .query(`
        SELECT
          RTRIM(e.NUCMOT) as nucmot,
          RTRIM(ISNULL(fuel.DESCOM, '?')) as tipoAlimentazione,
          TRY_CAST(mot.CILIND AS INT) as cilindrata,
          TRY_CAST(e.POTKWX AS DECIMAL(10,1)) as potenzaKw,
          TRY_CAST(ISNULL(w.CO2CCW, e.CO2CO1) AS DECIMAL(10,1)) as co2
        FROM ${prefix}2420F e
        LEFT JOIN ${prefix}2620F mot ON RTRIM(e.NUCMOT) = RTRIM(mot.NUCMOT) AND RTRIM(e.CODCOM) = RTRIM(mot.CODCOM)
        LEFT JOIN ${prefix}3520F fuel ON RTRIM(e.CODCOM) = RTRIM(fuel.CODCOM)
        LEFT JOIN ${prefix}8400F w ON e.CODALL = w.CODALL AND e.ANNOXX = w.ANNOXX AND e.MESEXX = w.MESEXX
          AND e.NUCTRA = w.NUCTRA AND e.NUCMOT = w.NUCMOT AND e.CODCOM = w.CODCOM
        WHERE RTRIM(e.CODALL) = @codall2
          AND e.ANNOXX = '${row.ANNOXX}' AND e.MESEXX = '${row.MESEXX}'
      `);

    console.log(`  Motori: ${engineResult.recordset.length}`);
    for (const eng of engineResult.recordset) {
      console.log(
        `    - ${eng.tipoAlimentazione} | ${eng.cilindrata}cc | ${eng.potenzaKw}kW | CO2: ${eng.co2}g/km`
      );
    }
  }

  await pool.close();
  console.log("\nTest completato!");
}

main().catch((e) => {
  console.error("Errore:", e);
  process.exit(1);
});
