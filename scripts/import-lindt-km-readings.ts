/**
 * GREENFLEET — Import Lindt Km Readings
 *
 * Imports real km readings from the CSV export
 * "data/rilevamento km_1770853301.csv" into the KmReading model.
 *
 * Filters out sentinel/invalid values (0, 1, 999, 9999, etc.)
 * and matches vehicles by license plate (Targa).
 *
 * Usage:
 *   npx tsx scripts/import-lindt-km-readings.ts
 *   npx tsx scripts/import-lindt-km-readings.ts --dry-run
 *   npx tsx scripts/import-lindt-km-readings.ts --clean
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaMssql } from "@prisma/adapter-mssql";
import * as fs from "fs";
import * as path from "path";

// ---------------------------------------------------------------------------
// CLI flags
// ---------------------------------------------------------------------------
const DRY_RUN = process.argv.includes("--dry-run");
const CLEAN_FIRST = process.argv.includes("--clean");

// ---------------------------------------------------------------------------
// Prisma client setup (same pattern as import-lindt-data.ts)
// ---------------------------------------------------------------------------
function parseDatabaseUrl(url: string) {
  const afterProtocol = url.replace(/^sqlserver:\/\//, "");
  const parts = afterProtocol.split(";");
  const hostPort = parts[0];
  const [host, portStr] = hostPort.split(":");

  const params: Record<string, string> = {};
  for (let i = 1; i < parts.length; i++) {
    const [key, ...valueParts] = parts[i].split("=");
    if (key) {
      params[key.toLowerCase()] = valueParts.join("=");
    }
  }

  return {
    server: host,
    port: portStr ? parseInt(portStr, 10) : 1433,
    database: params.database || "",
    user: params.user || "",
    password: params.password || "",
    options: {
      encrypt: params.encrypt === "true",
      trustServerCertificate: params.trustservercertificate === "true",
    },
  };
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set. Check your .env.local file.");
}

const config = parseDatabaseUrl(connectionString);
const adapter = new PrismaMssql(config);
const prisma = new PrismaClient({ adapter });

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const LINDT_ORG_SLUG = "lindt-sprungli";
const LINDT_ADMIN_EMAIL = "admin@lindt.greenfleet.local";
const SOURCE_TAG = "CSV_IMPORT";

// Sentinel km values to skip (placeholder/error data)
const SENTINEL_VALUES = new Set([0, 1, 2, 5, 7, 9, 999, 9999, 99999, 999999, 100000]);
const MIN_VALID_KM = 100;

// ---------------------------------------------------------------------------
// CSV parsing (simple semicolon-delimited with quoted fields)
// ---------------------------------------------------------------------------
function parseCSV(filePath: string): Array<Record<string, string>> {
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);

  if (lines.length < 2) return [];

  const headers = lines[0].split(";").map((h) => h.replace(/^"|"$/g, "").trim());
  const rows: Array<Record<string, string>> = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(";").map((v) => v.replace(/^"|"$/g, "").trim());
    const row: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = values[j] ?? "";
    }
    rows.push(row);
  }

  return rows;
}

/**
 * Parse Italian date format "dd/mm/yyyy HH:mm" to Date object
 */
function parseItalianDate(dateStr: string): Date | null {
  const match = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})$/);
  if (!match) return null;
  const [, day, month, year] = match;
  return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log("============================================================");
  console.log("  GREENFLEET — Import Lindt Km Readings");
  if (DRY_RUN) console.log("  [DRY-RUN MODE — nessuna scrittura DB]");
  if (CLEAN_FIRST) console.log("  [CLEAN — cancella km readings importati]");
  console.log("============================================================\n");

  // 1. Load Lindt organization
  const org = await prisma.organization.findUnique({
    where: { slug: LINDT_ORG_SLUG },
  });
  if (!org) {
    throw new Error(
      `Organization "${LINDT_ORG_SLUG}" not found. Run import-lindt-data.ts first.`
    );
  }
  console.log(`Organizzazione: ${org.name} (${org.id})`);

  // 2. Load admin user
  const adminUser = await prisma.user.findFirst({
    where: { email: LINDT_ADMIN_EMAIL },
  });
  if (!adminUser) {
    throw new Error(
      `Admin user "${LINDT_ADMIN_EMAIL}" not found. Run import-lindt-data.ts first.`
    );
  }
  console.log(`Admin user: ${adminUser.email} (${adminUser.id})`);

  // 3. Optionally clean existing imported km readings
  if (CLEAN_FIRST && !DRY_RUN) {
    const deleted = await prisma.kmReading.deleteMany({
      where: { tenantId: org.id, source: SOURCE_TAG },
    });
    console.log(`Cancellati ${deleted.count} km readings importati\n`);
  }

  // 4. Check if already imported
  if (!CLEAN_FIRST) {
    const existingCount = await prisma.kmReading.count({
      where: { tenantId: org.id, source: SOURCE_TAG },
    });
    if (existingCount > 0) {
      console.log(
        `[WARN] ${existingCount} km readings già importati. Usa --clean per reimportare.`
      );
      console.log("Uscita senza modifiche.");
      return;
    }
  }

  // 5. Load all Lindt vehicles (build plate → vehicleId map)
  const vehicles = await prisma.tenantVehicle.findMany({
    where: { tenantId: org.id },
  });
  const plateToVehicle = new Map<string, { id: number; licensePlate: string }>();
  for (const v of vehicles) {
    if (v.licensePlate) {
      plateToVehicle.set(v.licensePlate.toUpperCase(), {
        id: v.id,
        licensePlate: v.licensePlate,
      });
    }
  }
  console.log(`Veicoli caricati: ${vehicles.length} (${plateToVehicle.size} con targa)\n`);

  // 6. Read and parse CSV
  const csvPath = path.resolve(__dirname, "..", "data", "rilevamento km_1770853301.csv");
  if (!fs.existsSync(csvPath)) {
    throw new Error(`CSV file not found: ${csvPath}`);
  }
  const csvRows = parseCSV(csvPath);
  console.log(`Righe CSV lette: ${csvRows.length}`);

  // 7. Process rows
  type KmReadingInput = {
    tenantId: string;
    vehicleId: number;
    userId: string;
    date: Date;
    odometerKm: number;
    notes: string;
    source: string;
  };

  const readings: KmReadingInput[] = [];
  let skippedSentinel = 0;
  let skippedNoPlate = 0;
  let skippedNoDate = 0;
  let skippedDuplicate = 0;

  // Dedup: same vehicle + same date + same km → skip
  const seen = new Set<string>();

  for (const row of csvRows) {
    const targa = (row["Targa"] ?? "").toUpperCase();
    const kmStr = row["Km rilevati"] ?? "";
    const dateStr = row["Data rilevamento"] ?? "";

    const km = parseInt(kmStr, 10);

    // Filter sentinel/invalid values
    if (isNaN(km) || km < MIN_VALID_KM || SENTINEL_VALUES.has(km)) {
      skippedSentinel++;
      continue;
    }

    // Match vehicle by plate
    const vehicle = plateToVehicle.get(targa);
    if (!vehicle) {
      skippedNoPlate++;
      continue;
    }

    // Parse date
    const date = parseItalianDate(dateStr);
    if (!date) {
      skippedNoDate++;
      continue;
    }

    // Dedup
    const key = `${vehicle.id}|${date.toISOString()}|${km}`;
    if (seen.has(key)) {
      skippedDuplicate++;
      continue;
    }
    seen.add(key);

    readings.push({
      tenantId: org.id,
      vehicleId: vehicle.id,
      userId: adminUser.id,
      date,
      odometerKm: km,
      notes: `Fonte: ${row["Fonte"] ?? ""}. Stato: ${row["Stato"] ?? ""}`,
      source: SOURCE_TAG,
    });
  }

  console.log(`\nRiepilogo parsing:`);
  console.log(`  Validi: ${readings.length}`);
  console.log(`  Scartati (sentinel/invalidi): ${skippedSentinel}`);
  console.log(`  Scartati (targa non trovata): ${skippedNoPlate}`);
  console.log(`  Scartati (data non valida): ${skippedNoDate}`);
  console.log(`  Scartati (duplicati): ${skippedDuplicate}`);

  // 8. Show date range
  if (readings.length > 0) {
    const sortedDates = readings.map((r) => r.date.getTime()).sort((a, b) => a - b);
    const minDate = new Date(sortedDates[0]);
    const maxDate = new Date(sortedDates[sortedDates.length - 1]);
    console.log(
      `\n  Range date: ${minDate.toLocaleDateString("it")} — ${maxDate.toLocaleDateString("it")}`
    );
  }

  // 9. Insert readings
  if (DRY_RUN) {
    console.log("\n[DRY-RUN] Nessun record inserito.");
  } else {
    console.log("\nInserimento in corso...");
    let inserted = 0;

    for (const reading of readings) {
      await prisma.kmReading.create({ data: reading });
      inserted++;

      if (inserted % 500 === 0 || inserted === readings.length) {
        console.log(`  ${inserted}/${readings.length} inseriti...`);
      }
    }

    console.log(`\nInserimento completato: ${inserted} km readings creati.`);
  }

  // 10. Summary stats per month
  const monthCounts: Record<string, number> = {};
  for (const r of readings) {
    const key = `${r.date.getFullYear()}-${String(r.date.getMonth() + 1).padStart(2, "0")}`;
    monthCounts[key] = (monthCounts[key] ?? 0) + 1;
  }

  console.log("\n============================================================");
  console.log("  RIEPILOGO PER MESE");
  console.log("============================================================");
  for (const [month, count] of Object.entries(monthCounts).sort()) {
    console.log(`  ${month}: ${count} rilevazioni`);
  }
  console.log("============================================================");
}

main()
  .catch((e) => {
    console.error("Errore:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
