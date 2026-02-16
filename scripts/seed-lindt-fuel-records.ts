/**
 * GREENFLEET — Seed Lindt Fuel Records
 *
 * Generates realistic fuel records for all Lindt fleet vehicles
 * (6 months: July-December 2025) so dashboards and reports show real data.
 *
 * Usage:
 *   npx tsx scripts/seed-lindt-fuel-records.ts
 *   npx tsx scripts/seed-lindt-fuel-records.ts --dry-run
 *   npx tsx scripts/seed-lindt-fuel-records.ts --clean
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaMssql } from "@prisma/adapter-mssql";

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
const SOURCE_TAG = "SEED_SCRIPT";

// Date range: July 2025 - February 2026
const MONTHS = [
  { year: 2025, month: 6 }, // July (0-indexed)
  { year: 2025, month: 7 }, // August
  { year: 2025, month: 8 }, // September
  { year: 2025, month: 9 }, // October
  { year: 2025, month: 10 }, // November
  { year: 2025, month: 11 }, // December
  { year: 2026, month: 0 }, // January
  { year: 2026, month: 1 }, // February
];

// ---------------------------------------------------------------------------
// Consumption profiles per fuel type
// ---------------------------------------------------------------------------
type ConsumptionProfile = {
  consumptionL100km: number; // Litres per 100km (scope 1)
  consumptionKwh100km: number; // kWh per 100km (scope 2)
  monthlyKm: number;
  pricePerLitre: number; // EUR per litre
  pricePerKwh: number; // EUR per kWh (for hybrids/EV)
  refuelsPerMonth: [number, number]; // min, max
};

const PROFILES: Record<string, ConsumptionProfile> = {
  DIESEL: {
    consumptionL100km: 6.5,
    consumptionKwh100km: 0,
    monthlyKm: 1800,
    pricePerLitre: 1.65,
    pricePerKwh: 0,
    refuelsPerMonth: [2, 3],
  },
  BENZINA: {
    consumptionL100km: 7.5,
    consumptionKwh100km: 0,
    monthlyKm: 1500,
    pricePerLitre: 1.8,
    pricePerKwh: 0,
    refuelsPerMonth: [2, 3],
  },
  GPL: {
    consumptionL100km: 9.0,
    consumptionKwh100km: 0,
    monthlyKm: 1500,
    pricePerLitre: 0.75,
    pricePerKwh: 0,
    refuelsPerMonth: [3, 4],
  },
  METANO: {
    consumptionL100km: 8.0,
    consumptionKwh100km: 0,
    monthlyKm: 1400,
    pricePerLitre: 1.2,
    pricePerKwh: 0,
    refuelsPerMonth: [2, 3],
  },
  IBRIDO_BENZINA: {
    consumptionL100km: 5.0,
    consumptionKwh100km: 3,
    monthlyKm: 1600,
    pricePerLitre: 1.8,
    pricePerKwh: 0.3,
    refuelsPerMonth: [2, 3],
  },
  IBRIDO_DIESEL: {
    consumptionL100km: 5.5,
    consumptionKwh100km: 2.5,
    monthlyKm: 1700,
    pricePerLitre: 1.65,
    pricePerKwh: 0.3,
    refuelsPerMonth: [2, 3],
  },
  IDROGENO: {
    consumptionL100km: 1.0,
    consumptionKwh100km: 0,
    monthlyKm: 1200,
    pricePerLitre: 14.0,
    pricePerKwh: 0,
    refuelsPerMonth: [2, 3],
  },
  BIFUEL_BENZINA_GPL: {
    consumptionL100km: 8.0,
    consumptionKwh100km: 0,
    monthlyKm: 1500,
    pricePerLitre: 0.75,
    pricePerKwh: 0,
    refuelsPerMonth: [3, 4],
  },
  BIFUEL_BENZINA_METANO: {
    consumptionL100km: 7.5,
    consumptionKwh100km: 0,
    monthlyKm: 1500,
    pricePerLitre: 1.2,
    pricePerKwh: 0,
    refuelsPerMonth: [2, 3],
  },
};

// ---------------------------------------------------------------------------
// Utility: random helpers (seeded for reproducibility)
// ---------------------------------------------------------------------------
// Simple seeded PRNG (mulberry32)
function createRng(seed: number) {
  let s = seed | 0;
  return function () {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rng = createRng(42); // deterministic seed

function randomBetween(min: number, max: number): number {
  return min + rng() * (max - min);
}

function randomIntBetween(min: number, max: number): number {
  return Math.floor(randomBetween(min, max + 1));
}

function applyVariation(base: number, pct = 0.15): number {
  const factor = 1 + (rng() * 2 - 1) * pct;
  return base * factor;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Generate N spread-out days within a month (sorted, no duplicates).
 */
function generateSpreadDays(count: number, daysInMonth: number): number[] {
  const segmentSize = daysInMonth / count;
  const days: number[] = [];
  for (let i = 0; i < count; i++) {
    const segStart = Math.floor(i * segmentSize) + 1;
    const segEnd = Math.floor((i + 1) * segmentSize);
    days.push(randomIntBetween(segStart, Math.min(segEnd, daysInMonth)));
  }
  return days.sort((a, b) => a - b);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log("============================================================");
  console.log("  GREENFLEET — Seed Lindt Fuel Records");
  if (DRY_RUN) console.log("  [DRY-RUN MODE — nessuna scrittura DB]");
  if (CLEAN_FIRST) console.log("  [CLEAN — cancella dati seed esistenti]");
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

  // 3. Optionally clean existing seed records
  if (CLEAN_FIRST && !DRY_RUN) {
    const deleted = await prisma.fuelRecord.deleteMany({
      where: { tenantId: org.id, source: SOURCE_TAG },
    });
    console.log(`Cancellati ${deleted.count} fuel records seed esistenti\n`);
  }

  // 4. Check if seed records already exist
  if (!CLEAN_FIRST) {
    const existingCount = await prisma.fuelRecord.count({
      where: { tenantId: org.id, source: SOURCE_TAG },
    });
    if (existingCount > 0) {
      console.log(
        `[WARN] ${existingCount} fuel records seed già esistenti. Usa --clean per rigenerare.`
      );
      console.log("Uscita senza modifiche.");
      return;
    }
  }

  // 5. Load all active Lindt vehicles with engines
  const vehicles = await prisma.tenantVehicle.findMany({
    where: { tenantId: org.id, status: "ACTIVE" },
    include: {
      catalogVehicle: {
        include: { engines: true },
      },
    },
  });
  console.log(`Veicoli attivi caricati: ${vehicles.length}\n`);

  // 6. Generate fuel records
  type FuelRecordInput = {
    tenantId: string;
    vehicleId: number;
    userId: string;
    date: Date;
    fuelType: string;
    quantityLiters: number;
    quantityKwh: number | null;
    amountEur: number;
    odometerKm: number;
    source: string;
  };

  const records: FuelRecordInput[] = [];
  let vehiclesProcessed = 0;
  let vehiclesSkipped = 0;
  const fuelTypeBreakdown: Record<string, number> = {};

  for (const vehicle of vehicles) {
    if (!vehicle.catalogVehicle?.engines?.length) {
      vehiclesSkipped++;
      continue;
    }

    // Determine effective fuel type (hybrid-aware)
    let fuelType = vehicle.catalogVehicle.engines[0].fuelType;
    if (vehicle.catalogVehicle.isHybrid && vehicle.catalogVehicle.engines.length >= 2) {
      const engineTypes = new Set(vehicle.catalogVehicle.engines.map((e: { fuelType: string }) => e.fuelType));
      if (engineTypes.has("ELETTRICO")) {
        if (engineTypes.has("BENZINA")) fuelType = "IBRIDO_BENZINA";
        else if (engineTypes.has("DIESEL")) fuelType = "IBRIDO_DIESEL";
      }
    }
    const profile = PROFILES[fuelType] ?? PROFILES["BENZINA"];
    fuelTypeBreakdown[fuelType] = (fuelTypeBreakdown[fuelType] ?? 0) + 1;

    // Start odometer: random between 15000-45000 km
    let currentOdometer = randomIntBetween(15000, 45000);

    for (const { year, month } of MONTHS) {
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const monthlyKm = Math.round(applyVariation(profile.monthlyKm));
      const monthlyLitres =
        profile.consumptionL100km > 0
          ? (monthlyKm / 100) * applyVariation(profile.consumptionL100km)
          : 0;
      const monthlyKwh =
        profile.consumptionKwh100km > 0
          ? (monthlyKm / 100) * applyVariation(profile.consumptionKwh100km)
          : 0;

      const numRefuels = randomIntBetween(
        profile.refuelsPerMonth[0],
        profile.refuelsPerMonth[1]
      );
      const refuelDays = generateSpreadDays(numRefuels, daysInMonth);

      for (let i = 0; i < numRefuels; i++) {
        const day = refuelDays[i];
        const kmPortion = Math.round(
          applyVariation(monthlyKm / numRefuels, 0.1)
        );
        currentOdometer += kmPortion;

        const litres =
          monthlyLitres > 0
            ? round2(applyVariation(monthlyLitres / numRefuels, 0.1))
            : 0;
        const kwh =
          monthlyKwh > 0
            ? round2(applyVariation(monthlyKwh / numRefuels, 0.1))
            : null;

        // Price calculation
        const fuelCost =
          litres > 0
            ? litres * applyVariation(profile.pricePerLitre, 0.05)
            : 0;
        const electricCost =
          kwh && kwh > 0
            ? kwh * applyVariation(profile.pricePerKwh, 0.05)
            : 0;
        const amountEur = round2(fuelCost + electricCost);

        records.push({
          tenantId: org.id,
          vehicleId: vehicle.id,
          userId: adminUser.id,
          date: new Date(year, month, day),
          fuelType,
          quantityLiters: Math.max(0, litres),
          quantityKwh: kwh,
          amountEur: Math.max(0.01, amountEur),
          odometerKm: currentOdometer,
          source: SOURCE_TAG,
        });
      }
    }

    vehiclesProcessed++;
  }

  console.log(`Veicoli elaborati: ${vehiclesProcessed}`);
  console.log(`Veicoli saltati (no engine): ${vehiclesSkipped}`);
  console.log(`FuelRecords generati: ${records.length}`);
  console.log("\nBreakdown per tipo carburante:");
  for (const [ft, count] of Object.entries(fuelTypeBreakdown).sort(
    (a, b) => b[1] - a[1]
  )) {
    console.log(`  ${ft}: ${count} veicoli`);
  }

  // 7. Insert records
  if (DRY_RUN) {
    console.log("\n[DRY-RUN] Nessun record inserito.");
  } else {
    console.log("\nInserimento in corso...");
    const BATCH_SIZE = 50;
    let inserted = 0;

    for (let i = 0; i < records.length; i += BATCH_SIZE) {
      const batch = records.slice(i, i + BATCH_SIZE);
      for (const record of batch) {
        await prisma.fuelRecord.create({ data: record });
        inserted++;
      }

      // Progress log every 500 records
      if (inserted % 500 === 0 || i + BATCH_SIZE >= records.length) {
        console.log(`  ${inserted}/${records.length} inseriti...`);
      }
    }

    console.log(`\nInserimento completato: ${inserted} fuel records creati.`);
  }

  // 8. Summary stats
  const totalLitres = records.reduce((s, r) => s + r.quantityLiters, 0);
  const totalKwh = records.reduce((s, r) => s + (r.quantityKwh ?? 0), 0);
  const totalEur = records.reduce((s, r) => s + r.amountEur, 0);

  console.log("\n============================================================");
  console.log("  RIEPILOGO");
  console.log("============================================================");
  console.log(`  Periodo: Luglio 2025 - Febbraio 2026`);
  console.log(`  Veicoli: ${vehiclesProcessed}`);
  console.log(`  Fuel Records: ${records.length}`);
  console.log(`  Litri totali: ${Math.round(totalLitres).toLocaleString("it")}`);
  console.log(`  kWh totali: ${Math.round(totalKwh).toLocaleString("it")}`);
  console.log(`  Importo totale: €${round2(totalEur).toLocaleString("it")}`);
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
