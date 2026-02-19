/**
 * GREENFLEET — Import Dati Lindt
 *
 * Standalone script that reads Excel files from the data/ directory
 * and imports Lindt client data into SQL Server via Prisma.
 *
 * Usage:
 *   npx tsx scripts/import-lindt-data.ts
 *   npx tsx scripts/import-lindt-data.ts --dry-run
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaMssql } from "@prisma/adapter-mssql";
import { hashPassword } from "better-auth/crypto";
import * as XLSX from "xlsx";
import * as path from "path";
import * as fs from "fs";
import * as crypto from "crypto";

// ---------------------------------------------------------------------------
// CLI flags
// ---------------------------------------------------------------------------
const DRY_RUN = process.argv.includes("--dry-run");

// ---------------------------------------------------------------------------
// Prisma client setup (same pattern as prisma/seed.ts)
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
const PROJECT_ROOT = path.resolve(__dirname, "..");
const DATA_DIR = path.join(PROJECT_ROOT, "data");
const CONFIG_DIR = path.join(
  DATA_DIR,
  "LINDT - FILE DI IMPORT TAB CONFIGURAZIONE INIZIALE"
);

const FILES = {
  clienti: path.join(CONFIG_DIR, "clienti_1762441433.xlsx"),
  fornitori: path.join(CONFIG_DIR, "fornitore gruppo clienti_1762441495.xlsx"),
  carList: path.join(CONFIG_DIR, "car list_1762441460.xlsx"),
  dipendenti: path.join(CONFIG_DIR, "dipendente_1762441485.xlsx"),
  veicoli: path.join(CONFIG_DIR, "veicoli_1762441515.xlsx"),
  veicoliContratti: path.join(DATA_DIR, "LINDT - VEICOLI - CONTRATTI.xlsx"),
  cartaCarburante: path.join(CONFIG_DIR, "carta carburante_1762441548.xlsx"),
} as const;

const LINDT_ORG_SLUG = "lindt-sprungli";
const LINDT_ADMIN_EMAIL = "admin@lindt.greenfleet.local";

const ALL_FEATURE_KEYS = [
  "VEHICLES",
  "CONTRACTS",
  "FUEL_RECORDS",
  "EMISSIONS",
  "DASHBOARD_FM",
  "DASHBOARD_DRIVER",
  "IMPORT_EXPORT",
  "CARLIST",
  "ADVANCED_REPORTS",
  "ALERTS",
  "ESG_EXPORT",
  "AUDIT_LOG",
];

const FUEL_TYPE_MAP: Record<string, string> = {
  "Full Hybrid  (B)": "IBRIDO_BENZINA",
  "Mild/Micro Hybrid  (B)": "IBRIDO_BENZINA",
  "Mild/Micro Hybrid  (D)": "IBRIDO_DIESEL",
  "Plug-In Hybrid  (B)": "IBRIDO_BENZINA",
  "Elettrico extended rang  (B)": "IBRIDO_BENZINA",
  Gasolio: "DIESEL",
  Benzina: "BENZINA",
};

const HYBRID_FUEL_TYPES = new Set([
  "IBRIDO_BENZINA",
  "IBRIDO_DIESEL",
]);

const CONTRACT_TYPE_MAP: Record<string, string> = {
  "Lungo termine": "LUNGO_TERMINE",
  "Proprietà": "PROPRIETARIO",
};

// Known supplier that is NOT in the fornitore file but appears in contracts
const MISSING_SUPPLIERS: Array<{
  name: string;
  vatNumber: string | null;
  type: string;
  address: string | null;
}> = [
  {
    name: "Arval Service Lease Italia Spa",
    vatNumber: "04911190488",
    type: "NLT",
    address: null,
  },
  {
    name: "Shell Mobility Italia Srl",
    vatNumber: null,
    type: "CARBURANTE",
    address: null,
  },
];

// ---------------------------------------------------------------------------
// Stats tracking
// ---------------------------------------------------------------------------
interface PhaseStats {
  created: number;
  updated: number;
  skipped: number;
  errors: number;
  warnings: number;
}

function newStats(): PhaseStats {
  return { created: 0, updated: 0, skipped: 0, errors: 0, warnings: 0 };
}

const stats: Record<string, PhaseStats> = {};

// ---------------------------------------------------------------------------
// Utility: Excel reading
// ---------------------------------------------------------------------------
function readExcel(filePath: string): Record<string, unknown>[] {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  return XLSX.utils.sheet_to_json(sheet, { defval: null });
}

// ---------------------------------------------------------------------------
// Utility: value cleaning
// ---------------------------------------------------------------------------
const MISSING_PATTERNS = /^(mancante\s*\d*|nd\d*|n\.?d\.?\d*|n\/a)$/i;

function isMissing(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed === "") return true;
    if (MISSING_PATTERNS.test(trimmed)) return true;
  }
  return false;
}

function cleanString(value: unknown): string | null {
  if (isMissing(value)) return null;
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  return null;
}

function cleanNumber(value: unknown): number | null {
  if (isMissing(value)) return null;
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = parseFloat(value.replace(",", "."));
    return isNaN(parsed) ? null : parsed;
  }
  return null;
}

function cleanInt(value: unknown): number | null {
  const num = cleanNumber(value);
  if (num === null) return null;
  return Math.round(num);
}

/**
 * Parse dates from Excel. Handles:
 * - String "dd/mm/yyyy"
 * - XLSX serial date numbers
 * - Date objects
 * - "mancante" -> null
 */
function parseDate(value: unknown): Date | null {
  if (isMissing(value)) return null;

  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === "number") {
    // XLSX serial date number
    const date = XLSX.SSF.parse_date_code(value);
    if (date) {
      return new Date(date.y, date.m - 1, date.d);
    }
    return null;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (isMissing(trimmed)) return null;

    // Try dd/mm/yyyy
    const ddmmyyyy = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (ddmmyyyy) {
      const day = parseInt(ddmmyyyy[1], 10);
      const month = parseInt(ddmmyyyy[2], 10) - 1;
      const year = parseInt(ddmmyyyy[3], 10);
      const d = new Date(year, month, day);
      return isNaN(d.getTime()) ? null : d;
    }

    // Try ISO format
    const d = new Date(trimmed);
    return isNaN(d.getTime()) ? null : d;
  }

  return null;
}

/**
 * Strip leading apostrophe from card numbers (Shell cards).
 */
function cleanCardNumber(value: unknown): string | null {
  const s = cleanString(value);
  if (s === null) return null;
  return s.replace(/^'+/, "");
}

/**
 * Extract employee code from "Surname Name (code)" format.
 */
function extractEmployeeCode(assignee: unknown): string | null {
  const s = cleanString(assignee);
  if (s === null) return null;
  const match = s.match(/\(([^)]+)\)$/);
  if (match) return match[1].trim();
  return null;
}

/**
 * Check if an employee code looks like a "mancante" placeholder.
 */
function isMissingEmployeeCode(code: string | null): boolean {
  if (code === null) return true;
  return /^mancante/i.test(code.trim());
}

/**
 * Normalize supplier name for matching.
 */
function normalizeSupplierName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

// ---------------------------------------------------------------------------
// Console output helpers
// ---------------------------------------------------------------------------
const SEPARATOR =
  "============================================================";

function header(text: string): void {
  console.log(`\n${SEPARATOR}`);
  console.log(`  ${text}`);
  console.log(SEPARATOR);
}

function phaseHeader(num: number, text: string): void {
  console.log(`\nFase ${num}: ${text}...`);
}

function ok(text: string): void {
  console.log(`  [OK] ${text}`);
}

function warn(text: string): void {
  console.log(`  [WARN] ${text}`);
}

function err(text: string): void {
  console.log(`  [ERR] ${text}`);
}

function info(text: string): void {
  console.log(`  ${text}`);
}

function printStats(label: string, s: PhaseStats): void {
  const parts: string[] = [];
  if (s.created > 0) parts.push(`Creati: ${s.created}`);
  if (s.updated > 0) parts.push(`Aggiornati: ${s.updated}`);
  if (s.skipped > 0) parts.push(`Saltati: ${s.skipped}`);
  if (s.errors > 0) parts.push(`Errori: ${s.errors}`);
  if (s.warnings > 0) parts.push(`Warnings: ${s.warnings}`);
  console.log(`  ${label}: ${parts.join(", ")}`);
}

// ---------------------------------------------------------------------------
// Phase 0: Pre-flight checks
// ---------------------------------------------------------------------------
async function phase0(): Promise<boolean> {
  phaseHeader(0, "Pre-flight checks");

  // Check files
  let filesFound = 0;
  const totalFiles = Object.keys(FILES).length;
  for (const [key, filePath] of Object.entries(FILES)) {
    if (fs.existsSync(filePath)) {
      filesFound++;
    } else {
      err(`File mancante (${key}): ${filePath}`);
    }
  }
  if (filesFound === totalFiles) {
    ok(`File trovati: ${filesFound}/${totalFiles}`);
  } else {
    err(`File trovati: ${filesFound}/${totalFiles}`);
    return false;
  }

  // Check DB connection
  if (!DRY_RUN) {
    try {
      await prisma.$queryRawUnsafe("SELECT 1 AS test");
      ok("Connessione DB verificata");
    } catch (e) {
      err(`Connessione DB fallita: ${e instanceof Error ? e.message : String(e)}`);
      return false;
    }
  } else {
    ok("Connessione DB saltata (dry-run)");
  }

  if (DRY_RUN) {
    info("*** MODALITA DRY-RUN: nessuna scrittura su DB ***");
  }

  return true;
}

// ---------------------------------------------------------------------------
// Phase 1: Organization + Admin User + Feature toggles + Pool employee
// ---------------------------------------------------------------------------
async function phase1(): Promise<{
  orgId: string;
  adminPassword: string;
}> {
  phaseHeader(1, "Organizzazione & Admin");
  const s = newStats();
  stats["Organizzazione"] = s;

  // Read client data for org name
  const clientiRows = readExcel(FILES.clienti);
  const clientRow = clientiRows[0] as Record<string, unknown> | undefined;
  const orgName = cleanString(clientRow?.["Nome"]) ?? "Lindt & Sprungli S.p.A.";

  // Generate password
  const adminPassword = crypto.randomBytes(16).toString("base64url").slice(0, 20) + "!A1";

  if (DRY_RUN) {
    info(`[DRY-RUN] Organizzazione: ${orgName} (slug: ${LINDT_ORG_SLUG})`);
    info(`[DRY-RUN] Admin user: ${LINDT_ADMIN_EMAIL}`);
    info(`[DRY-RUN] Feature toggles: ${ALL_FEATURE_KEYS.length} abilitati`);
    info(`[DRY-RUN] Pool employee: creato`);
    return { orgId: "dry-run-org-id", adminPassword };
  }

  // Ensure sentinel CatalogVehicle exists (for vehicles without catalog match)
  const sentinel = await prisma.catalogVehicle.findFirst({
    where: { codiceInfocarData: "__UNCATALOGED__" },
  });
  if (!sentinel) {
    await prisma.catalogVehicle.create({
      data: {
        codiceInfocarData: "__UNCATALOGED__",
        marca: "Non catalogato",
        modello: "",
        source: "SYSTEM",
      },
    });
  }
  info("Sentinel CatalogVehicle verificato");

  // Upsert organization
  const org = await prisma.organization.upsert({
    where: { slug: LINDT_ORG_SLUG },
    update: { name: orgName, isActive: true, isDemo: false },
    create: {
      name: orgName,
      slug: LINDT_ORG_SLUG,
      isActive: true,
      isDemo: false,
    },
  });
  info(`Organizzazione: ${org.name} (id: ${org.id})`);

  // Upsert admin user
  const user = await prisma.user.upsert({
    where: { email: LINDT_ADMIN_EMAIL },
    update: { name: "Admin Lindt" },
    create: {
      email: LINDT_ADMIN_EMAIL,
      name: "Admin Lindt",
      emailVerified: true,
    },
  });

  // Hash password and upsert credential account
  const hashedPw = await hashPassword(adminPassword);
  const existingAccount = await prisma.account.findFirst({
    where: { userId: user.id, providerId: "credential" },
  });
  if (!existingAccount) {
    await prisma.account.create({
      data: {
        userId: user.id,
        accountId: user.id,
        providerId: "credential",
        password: hashedPw,
      },
    });
  } else {
    await prisma.account.update({
      where: { id: existingAccount.id },
      data: { password: hashedPw },
    });
  }

  // Upsert membership
  await prisma.member.upsert({
    where: {
      userId_organizationId: {
        userId: user.id,
        organizationId: org.id,
      },
    },
    update: { role: "owner" },
    create: {
      userId: user.id,
      organizationId: org.id,
      role: "owner",
    },
  });
  info(`Admin user: ${LINDT_ADMIN_EMAIL}`);

  // Feature toggles — all enabled for Lindt
  for (const featureKey of ALL_FEATURE_KEYS) {
    await prisma.tenantFeature.upsert({
      where: {
        tenantId_featureKey: { tenantId: org.id, featureKey },
      },
      update: { enabled: true },
      create: {
        tenantId: org.id,
        featureKey,
        enabled: true,
      },
    });
  }
  info(`Feature toggles: ${ALL_FEATURE_KEYS.length} abilitati`);

  // Pool employee
  const existingPool = await prisma.employee.findFirst({
    where: { tenantId: org.id, isPool: true, type: "pool", employeeCode: "__POOL__" },
  });
  if (!existingPool) {
    await prisma.employee.create({
      data: {
        tenantId: org.id,
        firstName: "Pool",
        lastName: "Veicoli Condivisi",
        employeeCode: "__POOL__",
        isActive: true,
        isPool: true,
        type: "pool",
      },
    });
    info("Pool employee: creato");
  } else {
    info("Pool employee: gia esistente");
  }

  return { orgId: org.id, adminPassword };
}

// ---------------------------------------------------------------------------
// Phase 2: Suppliers
// ---------------------------------------------------------------------------
async function phase2(orgId: string): Promise<Map<string, number>> {
  phaseHeader(2, "Fornitori");
  const s = newStats();
  stats["Fornitori"] = s;

  // Read fornitore file
  const rows = readExcel(FILES.fornitori);

  // Build supplier list from file
  interface SupplierData {
    type: string;
    name: string;
    vatNumber: string | null;
    address: string | null;
    pec: string | null;
    contactName: string | null;
    contactPhone: string | null;
    contactEmail: string | null;
    notes: string | null;
  }

  const suppliers: SupplierData[] = [];

  for (const row of rows) {
    const r = row as Record<string, unknown>;
    const rawType = cleanString(r["Tipo"]);
    let type = "ALTRO";
    if (rawType === "NLT") type = "NLT";
    else if (rawType === "Carburante") type = "CARBURANTE";

    const name = cleanString(r["Nome"]);
    if (!name) {
      s.skipped++;
      continue;
    }

    suppliers.push({
      type,
      name,
      vatNumber: cleanString(r["Partita IVA"]),
      address: cleanString(r["Indirizzo sede legale"]),
      pec: cleanString(r["PEC"]),
      contactName: cleanString(r["Nome referente"]),
      contactPhone: cleanString(r["Telefono referente"]),
      contactEmail: cleanString(r["Email referente"]),
      notes: cleanString(r["Note"]),
    });
  }

  // Add missing suppliers that appear in contracts/fuel cards but not in fornitore file
  for (const ms of MISSING_SUPPLIERS) {
    const alreadyExists = suppliers.some(
      (sup) =>
        (ms.vatNumber && sup.vatNumber === ms.vatNumber) ||
        normalizeSupplierName(sup.name) === normalizeSupplierName(ms.name)
    );
    if (!alreadyExists) {
      suppliers.push({
        type: ms.type,
        name: ms.name,
        vatNumber: ms.vatNumber,
        address: ms.address,
        pec: null,
        contactName: null,
        contactPhone: null,
        contactEmail: null,
        notes: "Auto-aggiunto da import (presente in contratti/carte carburante)",
      });
    }
  }

  // Also add Lindt itself as a supplier for "Proprietà" contracts
  const lindtAsSupplier = suppliers.some(
    (sup) => sup.vatNumber === "00197480122"
  );
  if (!lindtAsSupplier) {
    suppliers.push({
      type: "ALTRO",
      name: "Lindt & Sprungli S.p.A.",
      vatNumber: "00197480122",
      address: "Varese",
      pec: null,
      contactName: null,
      contactPhone: null,
      contactEmail: null,
      notes: "Proprietario veicoli (contratti Proprietà)",
    });
  }

  // Resolve SupplierType IDs
  const supplierTypes = await prisma.supplierType.findMany({
    where: { tenantId: orgId },
  });
  const typeMap = new Map(supplierTypes.map((t) => [t.code, t.id]));
  if (!typeMap.has("NLT") || !typeMap.has("CARBURANTE") || !typeMap.has("ALTRO")) {
    throw new Error("Missing SupplierType records. Run migrate-supplier-types.ts first.");
  }

  // Maps for later phases: vatNumber -> supplierId, name -> supplierId
  const supplierByVat = new Map<string, number>();
  const supplierByName = new Map<string, number>();

  if (DRY_RUN) {
    let dryId = -1;
    for (const sup of suppliers) {
      info(`[DRY-RUN] Fornitore: ${sup.name} (${sup.type}, P.IVA: ${sup.vatNumber ?? "N/A"})`);
      s.created++;
      if (sup.vatNumber) supplierByVat.set(sup.vatNumber, dryId);
      supplierByName.set(normalizeSupplierName(sup.name), dryId);
      dryId--;
    }
    printStats("Fornitori", s);
    return supplierByVat;
  }

  for (const sup of suppliers) {
    try {
      // For suppliers with VAT, use tenantId+vatNumber unique constraint
      if (sup.vatNumber) {
        const result = await prisma.supplier.upsert({
          where: {
            tenantId_vatNumber: {
              tenantId: orgId,
              vatNumber: sup.vatNumber,
            },
          },
          update: {
            name: sup.name,
            supplierTypeId: typeMap.get(sup.type)!,
            address: sup.address,
            pec: sup.pec,
            contactName: sup.contactName,
            contactPhone: sup.contactPhone,
            contactEmail: sup.contactEmail,
            notes: sup.notes,
            isActive: true,
          },
          create: {
            tenantId: orgId,
            supplierTypeId: typeMap.get(sup.type)!,
            name: sup.name,
            vatNumber: sup.vatNumber,
            address: sup.address,
            pec: sup.pec,
            contactName: sup.contactName,
            contactPhone: sup.contactPhone,
            contactEmail: sup.contactEmail,
            notes: sup.notes,
            isActive: true,
          },
        });
        supplierByVat.set(sup.vatNumber, Number(result.id));
        supplierByName.set(normalizeSupplierName(sup.name), Number(result.id));
        s.created++;
      } else {
        // Suppliers without VAT (e.g. Shell) — find by name or create
        const existing = await prisma.supplier.findFirst({
          where: {
            tenantId: orgId,
            name: sup.name,
          },
        });
        if (existing) {
          await prisma.supplier.update({
            where: { id: existing.id },
            data: {
              supplierTypeId: typeMap.get(sup.type)!,
              address: sup.address,
              pec: sup.pec,
              contactName: sup.contactName,
              contactPhone: sup.contactPhone,
              contactEmail: sup.contactEmail,
              notes: sup.notes,
              isActive: true,
            },
          });
          supplierByName.set(normalizeSupplierName(sup.name), Number(existing.id));
          s.updated++;
        } else {
          const created = await prisma.supplier.create({
            data: {
              tenantId: orgId,
              supplierTypeId: typeMap.get(sup.type)!,
              name: sup.name,
              vatNumber: "",
              address: sup.address,
              pec: sup.pec,
              contactName: sup.contactName,
              contactPhone: sup.contactPhone,
              contactEmail: sup.contactEmail,
              notes: sup.notes,
              isActive: true,
            },
          });
          supplierByName.set(normalizeSupplierName(sup.name), Number(created.id));
          s.created++;
        }
      }
    } catch (e) {
      err(`Fornitore "${sup.name}": ${e instanceof Error ? e.message : String(e)}`);
      s.errors++;
    }
  }

  // Build a combined map: we need to look up by VAT and by name
  // Also load all suppliers from DB to build a complete map
  const allSuppliers = await prisma.supplier.findMany({
    where: { tenantId: orgId },
  });
  for (const sup of allSuppliers) {
    if (sup.vatNumber) supplierByVat.set(sup.vatNumber, Number(sup.id));
    supplierByName.set(normalizeSupplierName(sup.name), Number(sup.id));
  }

  printStats("Fornitori", s);
  return supplierByVat;
}

// ---------------------------------------------------------------------------
// Phase 3: Car Tiers
// ---------------------------------------------------------------------------
async function phase3(orgId: string): Promise<Map<string, number>> {
  phaseHeader(3, "Fasce Car List");
  const s = newStats();
  stats["Fasce Car List"] = s;

  const rows = readExcel(FILES.carList);

  // tierName -> tierId
  const tierMap = new Map<string, number>();

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i] as Record<string, unknown>;
    const description = cleanString(r["Descrizione"]);
    if (!description) {
      s.skipped++;
      continue;
    }

    // Extract the FASCIA name (e.g., "FASCIA 1" from "FASCIA 1 - AREA MANAGERS")
    // Use the full description as the name
    const name = description;

    if (DRY_RUN) {
      info(`[DRY-RUN] Car Tier: ${name}`);
      tierMap.set(name, -(i + 1));
      s.created++;
      continue;
    }

    try {
      const result = await prisma.carTier.upsert({
        where: {
          tenantId_name: {
            tenantId: orgId,
            name,
          },
        },
        update: {
          description: name,
          sortOrder: i + 1,
          isActive: true,
        },
        create: {
          tenantId: orgId,
          name,
          description: name,
          sortOrder: i + 1,
          isActive: true,
        },
      });
      tierMap.set(name, Number(result.id));
      s.created++;
    } catch (e) {
      err(`Car Tier "${name}": ${e instanceof Error ? e.message : String(e)}`);
      s.errors++;
    }
  }

  printStats("Fasce Car List", s);
  return tierMap;
}

// ---------------------------------------------------------------------------
// Phase 4: Employees
// ---------------------------------------------------------------------------
async function phase4(
  orgId: string,
  tierMap: Map<string, number>
): Promise<Map<string, number>> {
  phaseHeader(4, "Dipendenti");
  const s = newStats();
  stats["Dipendenti"] = s;

  const rows = readExcel(FILES.dipendenti);

  // employeeCode -> employeeId
  const employeeMap = new Map<string, number>();

  for (const row of rows) {
    const r = row as Record<string, unknown>;
    const tipologia = cleanString(r["Tipologia"]);
    const codice = cleanString(r["Codice Identificativo"]);
    const nominativo = cleanString(r["Nominativo"]);
    const sede = cleanString(r["Sede di Lavoro"]);
    const carListField = cleanString(r["Car List"]);
    const isActive = cleanString(r["È attivo"]) !== "No";

    if (!codice) {
      warn(`Dipendente senza codice, riga saltata`);
      s.skipped++;
      continue;
    }

    const isPersona = tipologia === "Persona";
    const isEntita = tipologia === "Entità" || tipologia === "Entita";

    // For Persona: firstName is the Nominativo, lastName defaults to employee code
    // For Entità: use code as name
    let firstName: string;
    let lastName: string;
    let isPool = false;
    let type = "employee";

    if (isPersona) {
      firstName = nominativo ?? codice;
      lastName = "(da completare)";
      type = "employee";
    } else if (isEntita) {
      firstName = codice;
      lastName = "(entita)";
      isPool = true;
      type = "pool";
    } else {
      firstName = nominativo ?? codice;
      lastName = "(sconosciuto)";
      type = "employee";
    }

    // Match car tier by partial match on the carList field
    let carTierId: number | null = null;
    if (carListField) {
      // Try exact match first
      if (tierMap.has(carListField)) {
        carTierId = tierMap.get(carListField)!;
      } else {
        // Try partial match: find the tier whose name starts with the same FASCIA number
        const fasciaMatch = carListField.match(/^FASCIA\s+(\d+)/i);
        if (fasciaMatch) {
          const fasciaPrefix = `FASCIA ${fasciaMatch[1]}`;
          for (const [tierName, tierId] of tierMap) {
            if (tierName.startsWith(fasciaPrefix)) {
              carTierId = tierId;
              break;
            }
          }
        }
      }
    }

    if (DRY_RUN) {
      info(
        `[DRY-RUN] Dipendente: ${firstName} ${lastName} (${codice}, ${type}${carTierId ? ", con car tier" : ""})`
      );
      employeeMap.set(codice, -1);
      s.created++;
      continue;
    }

    try {
      // Use findFirst + create/update since we changed @@unique to @@index
      // (SQL Server doesn't allow multiple NULLs in unique constraints)
      const existing = await prisma.employee.findFirst({
        where: {
          tenantId: orgId,
          employeeCode: codice,
        },
      });

      if (existing) {
        await prisma.employee.update({
          where: { id: existing.id },
          data: {
            firstName,
            lastName,
            workLocation: sede,
            carTierId,
            isPool,
            type,
            isActive,
          },
        });
        employeeMap.set(codice, Number(existing.id));
        s.updated++;
      } else {
        const created = await prisma.employee.create({
          data: {
            tenantId: orgId,
            firstName,
            lastName,
            employeeCode: codice,
            workLocation: sede,
            carTierId,
            isPool,
            type,
            isActive,
          },
        });
        employeeMap.set(codice, Number(created.id));
        s.created++;
      }
    } catch (e) {
      err(`Dipendente "${codice}": ${e instanceof Error ? e.message : String(e)}`);
      s.errors++;
    }
  }

  // Also load all employees from DB to build a complete map (in case of re-run)
  if (!DRY_RUN) {
    const allEmployees = await prisma.employee.findMany({
      where: { tenantId: orgId },
    });
    for (const emp of allEmployees) {
      if (emp.employeeCode) {
        employeeMap.set(emp.employeeCode, Number(emp.id));
      }
    }
  }

  printStats("Dipendenti", s);
  return employeeMap;
}

// ---------------------------------------------------------------------------
// Phase 5: Catalog Vehicles
// ---------------------------------------------------------------------------
interface VehicleRow {
  targa: string;
  telaio: string | null;
  marca: string;
  modello: string;
  dataImmatricolazione: Date | null;
  fornitore: string | null;
  alimentazione: string | null;
  fuelType: string | null;
  tipologia: string | null;
  fringeBenefit: number | null;
}

function readVeicoli(): VehicleRow[] {
  const rows = readExcel(FILES.veicoli);
  const result: VehicleRow[] = [];

  for (const row of rows) {
    const r = row as Record<string, unknown>;
    const targa = cleanString(r["Targa"]);
    if (!targa) continue;

    const alimentazioneRaw = cleanString(r["Alimentazione"]);
    const fuelType = alimentazioneRaw ? FUEL_TYPE_MAP[alimentazioneRaw] ?? null : null;

    result.push({
      targa,
      telaio: cleanString(r["Telaio"]),
      marca: cleanString(r["Marca"]) ?? "Sconosciuta",
      modello: cleanString(r["Modello"]) ?? "Sconosciuto",
      dataImmatricolazione: parseDate(r["Data Immatricolazione"]),
      fornitore: cleanString(r["Fornitore"]),
      alimentazione: alimentazioneRaw,
      fuelType,
      tipologia: cleanString(r["Tipologia"]),
      fringeBenefit: cleanNumber(r["Fringe benefit mensile"]),
    });
  }

  return result;
}

interface ContractRow {
  targa: string;
  fornitoreVat: string | null;
  dataImmatricolazione: Date | null;
  co2rc: number | null;
  tipoContratto: string | null;
  numeroContratto: string | null;
  dipendenteCode: string | null;
  clienteVat: string | null;
  dataInizio: Date | null;
  km: number | null;
  mesi: number | null;
  canoneFinanziario: number | null;
  canoneServizi: number | null;
  totaleCanone: number | null;
  dataFine: Date | null;
  tassaPossesso: number | null;
  ricorrenzaTassa: string | null;
  codAll: string | null;
  annoProduzioneModello: number | null;
  meseProduzioneModello: number | null;
  marca: string | null;
}

function readVeicoliContratti(): ContractRow[] {
  const rows = readExcel(FILES.veicoliContratti);
  const result: ContractRow[] = [];

  for (const row of rows) {
    const r = row as Record<string, unknown>;
    const targa = cleanString(r["TARGA"]);
    if (!targa) continue;

    const dipendenteRaw = cleanString(r["DIPENDENTE ASSEGNATARIO (codice identificativo)"]);

    result.push({
      targa,
      fornitoreVat: cleanString(r["FORNITORE (partita iva fornitore)"]),
      dataImmatricolazione: parseDate(r["DATA IMMATRICOLAZIONE"]),
      co2rc: cleanNumber(r["Co2RC"]),
      tipoContratto: cleanString(r["TIPOLOGIA DI CONTRATTO"]),
      numeroContratto: cleanString(r["NUMERO CONTRATTO"]),
      dipendenteCode: dipendenteRaw && !isMissingEmployeeCode(dipendenteRaw)
        ? dipendenteRaw
        : null,
      clienteVat: cleanString(r["CLIENTI (partita iva azienda di appartenenza)"]),
      dataInizio: parseDate(r["DATA INIZIO CONTRATTO"]),
      km: cleanInt(r["KM"]),
      mesi: cleanInt(r["MESI"]),
      canoneFinanziario: cleanNumber(r["CANONE FINANZIARIO"]),
      canoneServizi: cleanNumber(r["CANONE SERVIZI"]),
      totaleCanone: cleanNumber(r["TOTALE CANONE"]),
      dataFine: parseDate(r["DATA FINE CONTRATTO"]),
      tassaPossesso: cleanNumber(r["TASSA DI POSSESSO"]),
      ricorrenzaTassa: cleanString(r["RICORRENZA TASSA DI POSSESSO"]),
      codAll: cleanString(r["COD ALL"]),
      annoProduzioneModello: cleanInt(r["ANNO DI PRODUZIONE MODELLO"]),
      meseProduzioneModello: cleanInt(r["MESE DI PRODUZIONE MODELLO"]),
      marca: cleanString(r["MARCA"]),
    });
  }

  return result;
}

async function phase5(
  vehicleRows: VehicleRow[]
): Promise<Map<string, number>> {
  phaseHeader(5, "Catalogo Veicoli");
  const s = newStats();
  stats["Catalogo veicoli"] = s;

  // Build unique (marca, modello, fuelType) combos
  const catalogKey = (marca: string, modello: string, fuelType: string) =>
    `${marca.toLowerCase()}|${modello.toLowerCase()}|${fuelType}`;

  const uniqueCombos = new Map<
    string,
    { marca: string; modello: string; fuelType: string }
  >();

  for (const v of vehicleRows) {
    const ft = v.fuelType ?? "BENZINA"; // fallback
    const key = catalogKey(v.marca, v.modello, ft);
    if (!uniqueCombos.has(key)) {
      uniqueCombos.set(key, {
        marca: v.marca,
        modello: v.modello,
        fuelType: ft,
      });
    }
  }

  // catalogKey -> catalogVehicleId
  const catalogMap = new Map<string, number>();

  info(`Combinazioni uniche (marca, modello, alimentazione): ${uniqueCombos.size}`);

  for (const [key, combo] of uniqueCombos) {
    const isHybrid = HYBRID_FUEL_TYPES.has(combo.fuelType);

    if (DRY_RUN) {
      info(
        `[DRY-RUN] CatalogVehicle: ${combo.marca} ${combo.modello} (${combo.fuelType}${isHybrid ? ", ibrido" : ""})`
      );
      catalogMap.set(key, -1);
      s.created++;
      continue;
    }

    try {
      // Generate a unique codiceInfocarData for manually imported vehicles
      // (SQL Server @unique doesn't allow multiple NULLs)
      const manualCode = `MANUAL_${combo.marca}_${combo.modello}_${combo.fuelType}`
        .toUpperCase()
        .replace(/[^A-Z0-9_]/g, "_")
        .slice(0, 100);

      // Find existing by codiceInfocarData or marca+modello+engine fuelType
      let existing = await prisma.catalogVehicle.findFirst({
        where: {
          OR: [
            { codiceInfocarData: manualCode },
            {
              marca: combo.marca,
              modello: combo.modello,
              source: "MANUAL_IMPORT",
              engines: { some: { fuelType: combo.fuelType } },
            },
          ],
        },
        include: { engines: true },
      });

      if (existing) {
        catalogMap.set(key, Number(existing.id));
        s.updated++;
      } else {
        const created = await prisma.catalogVehicle.create({
          data: {
            marca: combo.marca,
            modello: combo.modello,
            codiceInfocarData: manualCode,
            isHybrid,
            source: "MANUAL_IMPORT",
            engines: {
              create: {
                fuelType: combo.fuelType,
                co2Standard: "WLTP",
              },
            },
          },
        });
        catalogMap.set(key, Number(created.id));
        s.created++;
      }
    } catch (e) {
      err(
        `CatalogVehicle "${combo.marca} ${combo.modello} (${combo.fuelType})": ${e instanceof Error ? e.message : String(e)}`
      );
      s.errors++;
    }
  }

  printStats("Catalogo veicoli", s);
  return catalogMap;
}

// ---------------------------------------------------------------------------
// Phase 6: Tenant Vehicles
// ---------------------------------------------------------------------------
async function phase6(
  orgId: string,
  vehicleRows: VehicleRow[],
  contractRows: ContractRow[],
  catalogMap: Map<string, number>,
  employeeMap: Map<string, number>
): Promise<Map<string, number>> {
  phaseHeader(6, "Veicoli Flotta");
  const s = newStats();
  stats["Veicoli flotta"] = s;

  const catalogKey = (marca: string, modello: string, fuelType: string) =>
    `${marca.toLowerCase()}|${modello.toLowerCase()}|${fuelType}`;

  // Build a lookup from contracts: targa -> first contract row (for CO2, reg date enrichment, employee)
  const contractByPlate = new Map<string, ContractRow>();
  for (const cr of contractRows) {
    if (!contractByPlate.has(cr.targa)) {
      contractByPlate.set(cr.targa, cr);
    }
  }

  // licensePlate -> vehicleId
  const vehicleMap = new Map<string, number>();

  // Resolve sentinel catalogVehicle ID for vehicles without catalog match
  const sentinelVehicle = await prisma.catalogVehicle.findFirst({
    where: { codiceInfocarData: "__UNCATALOGED__" },
    select: { id: true },
  });
  const UNCATALOGED_VEHICLE_ID = sentinelVehicle ? Number(sentinelVehicle.id) : -1;

  for (const v of vehicleRows) {
    const ft = v.fuelType ?? "BENZINA";
    const key = catalogKey(v.marca, v.modello, ft);
    const catalogVehicleId = catalogMap.get(key) ?? UNCATALOGED_VEHICLE_ID;

    // Enrich with contract data
    const contractData = contractByPlate.get(v.targa);

    // Registration date: prefer vehicle file, fallback to contract file
    let registrationDate = v.dataImmatricolazione;
    if (!registrationDate && contractData) {
      registrationDate = contractData.dataImmatricolazione;
    }
    if (!registrationDate) {
      registrationDate = new Date(2000, 0, 1); // fallback
    }

    // Find assigned employee from contract data
    let assignedEmployeeId: number | null = null;
    if (contractData?.dipendenteCode) {
      assignedEmployeeId = employeeMap.get(contractData.dipendenteCode) ?? null;
    }

    if (DRY_RUN) {
      info(
        `[DRY-RUN] TenantVehicle: ${v.targa} (${v.marca} ${v.modello}, ${ft})`
      );
      vehicleMap.set(v.targa, -1);
      s.created++;
      continue;
    }

    try {
      const result = await prisma.tenantVehicle.upsert({
        where: {
          tenantId_licensePlate: {
            tenantId: orgId,
            licensePlate: v.targa,
          },
        },
        update: {
          catalogVehicleId,
          registrationDate,
          vin: v.telaio,
          fringeBenefit: v.fringeBenefit,
          assignedEmployeeId,
          status: "ACTIVE",
        },
        create: {
          tenantId: orgId,
          catalogVehicleId,
          licensePlate: v.targa,
          registrationDate,
          vin: v.telaio,
          fringeBenefit: v.fringeBenefit,
          assignedEmployeeId,
          status: "ACTIVE",
        },
      });
      vehicleMap.set(v.targa, Number(result.id));
      s.created++;
    } catch (e) {
      err(`TenantVehicle "${v.targa}": ${e instanceof Error ? e.message : String(e)}`);
      s.errors++;
    }
  }

  // Also create vehicle assignments for vehicles with assigned employees
  let assignmentCount = 0;
  if (!DRY_RUN) {
    for (const v of vehicleRows) {
      const contractData = contractByPlate.get(v.targa);
      if (!contractData?.dipendenteCode) continue;

      const employeeId = employeeMap.get(contractData.dipendenteCode);
      const vehicleId = vehicleMap.get(v.targa);
      if (!employeeId || !vehicleId) continue;

      const startDate = contractData.dataInizio ?? new Date();

      // Check if assignment already exists
      const existingAssignment = await prisma.vehicleAssignment.findFirst({
        where: {
          tenantId: orgId,
          vehicleId,
          employeeId,
        },
      });

      if (!existingAssignment) {
        try {
          await prisma.vehicleAssignment.create({
            data: {
              tenantId: orgId,
              vehicleId,
              employeeId,
              startDate,
              endDate: contractData.dataFine,
            },
          });
          assignmentCount++;
        } catch (e) {
          // Non-critical, log and continue
          warn(
            `Assegnazione ${v.targa} -> ${contractData.dipendenteCode}: ${e instanceof Error ? e.message : String(e)}`
          );
        }
      }
    }
  }

  if (assignmentCount > 0) {
    info(`Assegnazioni veicolo-dipendente create: ${assignmentCount}`);
  }

  // Reload all tenant vehicles from DB for complete map
  if (!DRY_RUN) {
    const allVehicles = await prisma.tenantVehicle.findMany({
      where: { tenantId: orgId },
    });
    for (const v of allVehicles) {
      vehicleMap.set(v.licensePlate, Number(v.id));
    }
  }

  printStats("Veicoli flotta", s);
  return vehicleMap;
}

// ---------------------------------------------------------------------------
// Phase 7: Contracts
// ---------------------------------------------------------------------------
async function phase7(
  orgId: string,
  contractRows: ContractRow[],
  vehicleMap: Map<string, number>,
  employeeMap: Map<string, number>
): Promise<void> {
  phaseHeader(7, "Contratti");
  const s = newStats();
  stats["Contratti"] = s;

  // Load suppliers for this tenant to build lookup maps
  let supplierByVat = new Map<string, number>();
  let supplierByName = new Map<string, number>();

  if (!DRY_RUN) {
    const allSuppliers = await prisma.supplier.findMany({
      where: { tenantId: orgId },
    });
    for (const sup of allSuppliers) {
      if (sup.vatNumber) supplierByVat.set(sup.vatNumber, Number(sup.id));
      supplierByName.set(normalizeSupplierName(sup.name), Number(sup.id));
    }
  }

  // Deduplicate by (targa + numeroContratto + dataInizio)
  const dedupKey = (cr: ContractRow): string => {
    const startStr = cr.dataInizio
      ? cr.dataInizio.toISOString().slice(0, 10)
      : "null";
    return `${cr.targa}|${cr.numeroContratto ?? "null"}|${startStr}`;
  };

  const seen = new Set<string>();
  const dedupedRows: ContractRow[] = [];
  let duplicateCount = 0;

  for (const cr of contractRows) {
    const key = dedupKey(cr);
    if (seen.has(key)) {
      duplicateCount++;
      continue;
    }
    seen.add(key);
    dedupedRows.push(cr);
  }

  if (duplicateCount > 0) {
    info(`Righe duplicate rimosse: ${duplicateCount}`);
  }
  info(`Contratti da importare (deduplicati): ${dedupedRows.length}`);

  for (const cr of dedupedRows) {
    const vehicleId = vehicleMap.get(cr.targa);
    if (!vehicleId) {
      warn(`Contratto per targa "${cr.targa}" senza veicolo corrispondente, saltato`);
      s.skipped++;
      continue;
    }

    const contractType = cr.tipoContratto
      ? CONTRACT_TYPE_MAP[cr.tipoContratto] ?? cr.tipoContratto
      : "LUNGO_TERMINE";

    // Resolve supplier
    let supplierId: number | null = null;
    if (cr.fornitoreVat) {
      supplierId = supplierByVat.get(cr.fornitoreVat) ?? null;
    }

    // Calculate end date from start date + months if not provided
    let endDate = cr.dataFine;
    if (!endDate && cr.dataInizio && cr.mesi) {
      const d = new Date(cr.dataInizio);
      d.setMonth(d.getMonth() + cr.mesi);
      endDate = d;
    }

    // Determine monthly rate from totale canone (it IS the monthly rate)
    const monthlyRate = cr.totaleCanone;

    if (DRY_RUN) {
      info(
        `[DRY-RUN] Contratto: ${cr.targa} / ${cr.numeroContratto ?? "N/A"} (${contractType})`
      );
      s.created++;
      continue;
    }

    try {
      // Use upsert on a combination of vehicleId + contractNumber + startDate
      // Since there's no unique constraint on these, we need to find first
      const startDateForQuery = cr.dataInizio ?? new Date(2000, 0, 1);

      const existing = await prisma.contract.findFirst({
        where: {
          tenantId: orgId,
          vehicleId,
          contractNumber: cr.numeroContratto ?? "",
          startDate: startDateForQuery,
        },
      });

      const contractData = {
        tenantId: orgId,
        vehicleId,
        type: contractType,
        status: "ACTIVE" as const,
        contractNumber: cr.numeroContratto ?? "",
        supplierId,
        durationMonths: cr.mesi,
        totalKm: cr.km,
        financialRate: cr.canoneFinanziario,
        serviceRate: cr.canoneServizi,
        ownershipTax: cr.tassaPossesso,
        taxRecurrence: cr.ricorrenzaTassa,
        allocationCode: cr.codAll,
        startDate: cr.dataInizio,
        endDate,
        monthlyRate,
        // For "Proprietà", set purchaseDate = registration date
        ...(contractType === "PROPRIETARIO"
          ? { purchaseDate: cr.dataInizio ?? cr.dataImmatricolazione }
          : {}),
      };

      if (existing) {
        await prisma.contract.update({
          where: { id: existing.id },
          data: contractData,
        });
        s.updated++;
      } else {
        await prisma.contract.create({
          data: contractData,
        });
        s.created++;
      }
    } catch (e) {
      err(
        `Contratto "${cr.targa} / ${cr.numeroContratto ?? "N/A"}": ${e instanceof Error ? e.message : String(e)}`
      );
      s.errors++;
    }
  }

  // Update Engine CO2 values from contract data where available
  if (!DRY_RUN) {
    let co2Updated = 0;
    // Group by targa, take first non-null co2rc
    const co2ByPlate = new Map<string, number>();
    for (const cr of dedupedRows) {
      if (cr.co2rc !== null && !co2ByPlate.has(cr.targa)) {
        co2ByPlate.set(cr.targa, cr.co2rc);
      }
    }

    for (const [plate, co2] of co2ByPlate) {
      try {
        const vehicle = await prisma.tenantVehicle.findFirst({
          where: { tenantId: orgId, licensePlate: plate },
          include: {
            catalogVehicle: {
              include: { engines: true },
            },
          },
        });

        if (vehicle && vehicle.catalogVehicle.engines.length > 0) {
          const engine = vehicle.catalogVehicle.engines[0];
          if (engine.co2GKm === null || engine.co2GKm === 0) {
            await prisma.engine.update({
              where: { id: engine.id },
              data: {
                co2GKm: co2,
                co2GKmWltp: co2,
                co2Standard: "WLTP",
              },
            });
            co2Updated++;
          }
        }
      } catch {
        // Non-critical, skip
      }
    }

    if (co2Updated > 0) {
      info(`Valori CO2 aggiornati da contratti: ${co2Updated}`);
    }
  }

  printStats("Contratti", s);
}

// ---------------------------------------------------------------------------
// Phase 8: Fuel Cards
// ---------------------------------------------------------------------------
async function phase8(
  orgId: string,
  vehicleMap: Map<string, number>,
  employeeMap: Map<string, number>
): Promise<void> {
  phaseHeader(8, "Carte Carburante");
  const s = newStats();
  stats["Carte carburante"] = s;

  const rows = readExcel(FILES.cartaCarburante);

  // Load suppliers for issuer matching
  let supplierByName = new Map<string, number>();
  if (!DRY_RUN) {
    const allSuppliers = await prisma.supplier.findMany({
      where: { tenantId: orgId },
    });
    for (const sup of allSuppliers) {
      supplierByName.set(normalizeSupplierName(sup.name), Number(sup.id));
    }
  }

  for (const row of rows) {
    const r = row as Record<string, unknown>;

    const cardNumber = cleanCardNumber(r["Numero carta"]);
    if (!cardNumber) {
      s.skipped++;
      continue;
    }

    const issuer = cleanString(r["Società emittente"]) ?? "Sconosciuto";
    const expiryDate = parseDate(r["Data scadenza"]);
    const rawAssignmentType = cleanString(r["Tipo Assegnazione"]);
    const targa = cleanString(r["Targa"]);
    const assegnatario = cleanString(r["Assegnatario"]);

    // Determine assignment type
    let assignmentType: string;
    if (rawAssignmentType === "Jolly") {
      assignmentType = "JOLLY";
    } else if (targa) {
      assignmentType = "VEHICLE";
    } else {
      assignmentType = "EMPLOYEE";
    }

    // Resolve vehicle
    let assignedVehicleId: number | null = null;
    if (targa) {
      assignedVehicleId = vehicleMap.get(targa) ?? null;
      if (!assignedVehicleId) {
        warn(`Carta ${cardNumber}: targa "${targa}" non trovata`);
        s.warnings++;
      }
    }

    // Resolve employee from "Surname Name (code)" format
    let assignedEmployeeId: number | null = null;
    if (assegnatario) {
      const empCode = extractEmployeeCode(assegnatario);
      if (empCode && !isMissingEmployeeCode(empCode)) {
        assignedEmployeeId = employeeMap.get(empCode) ?? null;
        if (!assignedEmployeeId) {
          warn(
            `Carta ${cardNumber}: dipendente "${empCode}" non trovato (da "${assegnatario}")`
          );
          s.warnings++;
        }
      }
    }

    // Resolve supplier from issuer name
    let supplierId: number | null = null;
    if (!DRY_RUN) {
      supplierId = supplierByName.get(normalizeSupplierName(issuer)) ?? null;
    }

    if (DRY_RUN) {
      info(
        `[DRY-RUN] FuelCard: ${cardNumber} (${issuer}, ${assignmentType}${targa ? `, targa: ${targa}` : ""})`
      );
      s.created++;
      continue;
    }

    try {
      await prisma.fuelCard.upsert({
        where: {
          tenantId_cardNumber: {
            tenantId: orgId,
            cardNumber,
          },
        },
        update: {
          issuer,
          supplierId,
          expiryDate,
          status: "ACTIVE",
          assignmentType,
          assignedVehicleId,
          assignedEmployeeId,
        },
        create: {
          tenantId: orgId,
          cardNumber,
          issuer,
          supplierId,
          expiryDate,
          status: "ACTIVE",
          assignmentType,
          assignedVehicleId,
          assignedEmployeeId,
        },
      });
      s.created++;
    } catch (e) {
      err(
        `FuelCard "${cardNumber}": ${e instanceof Error ? e.message : String(e)}`
      );
      s.errors++;
    }
  }

  printStats("Carte carburante", s);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main(): Promise<void> {
  header("GREENFLEET — Import Dati Lindt");

  if (DRY_RUN) {
    console.log("\n  *** MODALITA DRY-RUN: nessuna scrittura su DB ***\n");
  }

  // Phase 0: Pre-flight checks
  const preflightOk = await phase0();
  if (!preflightOk) {
    console.error("\nPre-flight check fallito. Import annullato.");
    process.exit(1);
  }

  // Phase 1: Organization, Admin, Features, Pool
  const { orgId, adminPassword } = await phase1();

  // Phase 2: Suppliers
  await phase2(orgId);

  // Phase 3: Car Tiers
  const tierMap = await phase3(orgId);

  // Phase 4: Employees
  const employeeMap = await phase4(orgId, tierMap);

  // Read vehicle data (used by phases 5, 6, 7)
  const vehicleRows = readVeicoli();
  const contractRows = readVeicoliContratti();

  // Phase 5: Catalog Vehicles
  const catalogMap = await phase5(vehicleRows);

  // Phase 6: Tenant Vehicles
  const vehicleMap = await phase6(
    orgId,
    vehicleRows,
    contractRows,
    catalogMap,
    employeeMap
  );

  // Phase 7: Contracts
  await phase7(orgId, contractRows, vehicleMap, employeeMap);

  // Phase 8: Fuel Cards
  await phase8(orgId, vehicleMap, employeeMap);

  // Final summary
  const totalErrors = Object.values(stats).reduce(
    (sum, s) => sum + s.errors,
    0
  );
  const totalWarnings = Object.values(stats).reduce(
    (sum, s) => sum + s.warnings,
    0
  );

  header("RIEPILOGO IMPORT");
  info(`Organizzazione: Lindt & Sprungli S.p.A.`);
  info(`Admin email: ${LINDT_ADMIN_EMAIL}`);
  info(`Admin password: ${adminPassword}`);
  console.log("");

  for (const [label, s] of Object.entries(stats)) {
    const total = s.created + s.updated;
    info(`${label.padEnd(20)} ${total.toString().padStart(5)} (creati: ${s.created}, aggiornati: ${s.updated}, errori: ${s.errors})`);
  }

  console.log("");
  info(`Errori totali: ${totalErrors}`);
  info(`Warnings totali: ${totalWarnings}`);

  if (DRY_RUN) {
    console.log("");
    info("*** DRY-RUN completato. Nessuna modifica al DB. ***");
  }

  console.log(SEPARATOR);
}

main()
  .catch((e) => {
    console.error("\nImport fallito con errore:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
