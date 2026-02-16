import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaMssql } from "@prisma/adapter-mssql";
import { hashPassword } from "better-auth/crypto";

/**
 * Parse a Prisma-style SQL Server URL into an mssql config object.
 */
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

// Dedicated Prisma instance for seed (runs outside Next.js context)
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set. Check your .env.local file.");
}

const config = parseDatabaseUrl(connectionString);
const adapter = new PrismaMssql(config);
const prisma = new PrismaClient({ adapter });

// ---------------------------------------------------------------------------
// Demo users definition
// ---------------------------------------------------------------------------
const DEMO_USERS = [
  {
    email: "admin@greenfleet-demo.local",
    name: "Demo Admin",
    password: "DemoAdmin2026!Pass",
    role: "owner",
  },
  {
    email: "fm@greenfleet-demo.local",
    name: "Demo Fleet Manager",
    password: "DemoFM2026!Pass",
    role: "admin",
  },
  {
    email: "driver@greenfleet-demo.local",
    name: "Demo Driver",
    password: "DemoDriver2026!Pass",
    role: "member",
  },
] as const;

// ---------------------------------------------------------------------------
// Feature toggles — keep in sync with src/lib/services/feature-keys.ts
// ---------------------------------------------------------------------------
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

const DEFAULT_ENABLED = [
  "VEHICLES",
  "FUEL_RECORDS",
  "DASHBOARD_FM",
  "DASHBOARD_DRIVER",
];

// ---------------------------------------------------------------------------
// Sentinel CatalogVehicle for uncataloged vehicles
// ---------------------------------------------------------------------------
const UNCATALOGED_VEHICLE_ID = 0;

// ---------------------------------------------------------------------------
// Main seed function (idempotent)
// ---------------------------------------------------------------------------
async function main() {
  console.log("Seed: inizio...");

  // 0. Upsert sentinel CatalogVehicle for uncataloged vehicles
  // IDENTITY_INSERT required to insert explicit id=0 on a BigInt identity column
  await prisma.$executeRawUnsafe(`
    IF NOT EXISTS (SELECT 1 FROM catalog_vehicles WHERE id = 0)
    BEGIN
      SET IDENTITY_INSERT catalog_vehicles ON;
      INSERT INTO catalog_vehicles (id, marca, modello, source, created_at, updated_at)
      VALUES (0, N'Non catalogato', N'', N'SYSTEM', GETDATE(), GETDATE());
      SET IDENTITY_INSERT catalog_vehicles OFF;
    END
  `);
  console.log("  Sentinel CatalogVehicle (Non catalogato) initialized");

  // 1. Create or update the demo organization
  const org = await prisma.organization.upsert({
    where: { slug: "greenfleet-demo" },
    update: { name: "Greenfleet Demo", isActive: true, isDemo: true },
    create: {
      name: "Greenfleet Demo",
      slug: "greenfleet-demo",
      isActive: true,
      isDemo: true,
    },
  });
  console.log(`  Organization: ${org.name} (${org.id})`);

  // 2. Create demo users with accounts and memberships
  for (const userData of DEMO_USERS) {
    // Upsert user
    const user = await prisma.user.upsert({
      where: { email: userData.email },
      update: { name: userData.name },
      create: {
        email: userData.email,
        name: userData.name,
        emailVerified: true,
      },
    });

    // Hash password using Better Auth's own hashing (scrypt via @noble/hashes)
    // to guarantee compatibility with the login flow.
    const hashedPw = await hashPassword(userData.password);

    // Create credential account if it does not exist yet
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
      // Update password on re-seed to keep credentials in sync
      await prisma.account.update({
        where: { id: existingAccount.id },
        data: { password: hashedPw },
      });
    }

    // Upsert membership linking user to demo organization
    await prisma.member.upsert({
      where: {
        userId_organizationId: {
          userId: user.id,
          organizationId: org.id,
        },
      },
      update: { role: userData.role },
      create: {
        userId: user.id,
        organizationId: org.id,
        role: userData.role,
      },
    });

    console.log(`  User: ${userData.name} (${userData.role})`);
  }

  // 3. Seed default emission conversion configs
  const adminUser = await prisma.user.findFirst({
    where: { email: "admin@greenfleet-demo.local" },
  });
  const adminUserId = adminUser?.id ?? org.id; // fallback, should always exist

  const defaultConversionConfigs = [
    {
      name: "Standard EU (tipico)",
      nedcToWltpFactor: 1.21,
      wltpToNedcFactor: 0.83,
      isDefault: true,
    },
    {
      name: "Conservativo",
      nedcToWltpFactor: 1.25,
      wltpToNedcFactor: 0.80,
      isDefault: false,
    },
    {
      name: "Ottimistico",
      nedcToWltpFactor: 1.15,
      wltpToNedcFactor: 0.87,
      isDefault: false,
    },
  ];

  for (const configData of defaultConversionConfigs) {
    const existing = await prisma.emissionConversionConfig.findFirst({
      where: { name: configData.name },
    });
    if (!existing) {
      await prisma.emissionConversionConfig.create({
        data: {
          ...configData,
          createdById: adminUserId,
        },
      });
    }
  }
  console.log("  Emission conversion configs initialized");

  // 4. Initialize feature toggles for the demo tenant
  for (const featureKey of ALL_FEATURE_KEYS) {
    await prisma.tenantFeature.upsert({
      where: {
        tenantId_featureKey: { tenantId: org.id, featureKey },
      },
      update: {},
      create: {
        tenantId: org.id,
        featureKey,
        enabled: DEFAULT_ENABLED.includes(featureKey),
      },
    });
  }
  console.log("  Feature toggles initialized");

  // 4b. Seed MacroFuelTypes (global, no tenantId)
  const macroFuelTypesData = [
    { name: "Benzina", scope: 1, unit: "L", color: "#22c55e", sortOrder: 1 },
    { name: "Gasolio", scope: 1, unit: "L", color: "#3b82f6", sortOrder: 2 },
    { name: "GPL", scope: 1, unit: "L", color: "#f97316", sortOrder: 3 },
    { name: "Metano", scope: 1, unit: "kg", color: "#8b5cf6", sortOrder: 4 },
    { name: "Elettricita", scope: 2, unit: "kWh", color: "#06b6d4", sortOrder: 5 },
    { name: "Idrogeno", scope: 1, unit: "UA", color: "#ec4899", sortOrder: 6 },
  ];

  for (const mft of macroFuelTypesData) {
    await prisma.macroFuelType.upsert({
      where: { name: mft.name },
      update: { scope: mft.scope, unit: mft.unit, color: mft.color, sortOrder: mft.sortOrder },
      create: mft,
    });
  }
  console.log("  MacroFuelTypes initialized");

  // 4c. Seed FuelTypeMacroMappings (global)
  // Look up macro fuel types by name for relational linking
  const benzina = await prisma.macroFuelType.findUniqueOrThrow({ where: { name: "Benzina" } });
  const gasolio = await prisma.macroFuelType.findUniqueOrThrow({ where: { name: "Gasolio" } });
  const gpl = await prisma.macroFuelType.findUniqueOrThrow({ where: { name: "GPL" } });
  const metano = await prisma.macroFuelType.findUniqueOrThrow({ where: { name: "Metano" } });
  const elettricita = await prisma.macroFuelType.findUniqueOrThrow({ where: { name: "Elettricita" } });
  const idrogeno = await prisma.macroFuelType.findUniqueOrThrow({ where: { name: "Idrogeno" } });

  const fuelTypeMappingsData: Array<{
    vehicleFuelType: string;
    macroFuelTypeId: number;
    scope: number;
    description: string;
  }> = [
    { vehicleFuelType: "BENZINA", macroFuelTypeId: Number(benzina.id), scope: 1, description: "Benzina" },
    { vehicleFuelType: "DIESEL", macroFuelTypeId: Number(gasolio.id), scope: 1, description: "Diesel" },
    { vehicleFuelType: "GPL", macroFuelTypeId: Number(gpl.id), scope: 1, description: "GPL" },
    { vehicleFuelType: "METANO", macroFuelTypeId: Number(metano.id), scope: 1, description: "Metano" },
    { vehicleFuelType: "IBRIDO_BENZINA", macroFuelTypeId: Number(benzina.id), scope: 1, description: "Ibrido Benzina" },
    { vehicleFuelType: "IBRIDO_BENZINA", macroFuelTypeId: Number(elettricita.id), scope: 2, description: "Ibrido Benzina" },
    { vehicleFuelType: "IBRIDO_DIESEL", macroFuelTypeId: Number(gasolio.id), scope: 1, description: "Ibrido Diesel" },
    { vehicleFuelType: "IBRIDO_DIESEL", macroFuelTypeId: Number(elettricita.id), scope: 2, description: "Ibrido Diesel" },
    { vehicleFuelType: "IDROGENO", macroFuelTypeId: Number(idrogeno.id), scope: 1, description: "Idrogeno" },
    { vehicleFuelType: "BIFUEL_BENZINA_GPL", macroFuelTypeId: Number(benzina.id), scope: 1, description: "Bifuel Benzina/GPL" },
    { vehicleFuelType: "BIFUEL_BENZINA_METANO", macroFuelTypeId: Number(benzina.id), scope: 1, description: "Bifuel Benzina/Metano" },
  ];

  for (const mapping of fuelTypeMappingsData) {
    await prisma.fuelTypeMacroMapping.upsert({
      where: {
        vehicleFuelType_scope: {
          vehicleFuelType: mapping.vehicleFuelType,
          scope: mapping.scope,
        },
      },
      update: { macroFuelTypeId: mapping.macroFuelTypeId, description: mapping.description },
      create: mapping,
    });
  }
  console.log("  FuelTypeMacroMappings initialized");

  // 4d. Seed GwpConfig (IPCC AR5 defaults)
  const gwpConfigsData = [
    { gasName: "CO2", gwpValue: 1, source: "IPCC AR5" },
    { gasName: "CH4", gwpValue: 28, source: "IPCC AR5" },
    { gasName: "N2O", gwpValue: 265, source: "IPCC AR5" },
    { gasName: "HFC", gwpValue: 1300, source: "IPCC AR5" },
    { gasName: "PFC", gwpValue: 6630, source: "IPCC AR5" },
    { gasName: "SF6", gwpValue: 23500, source: "IPCC AR5" },
    { gasName: "NF3", gwpValue: 16100, source: "IPCC AR5" },
  ];

  for (const gwp of gwpConfigsData) {
    await prisma.gwpConfig.upsert({
      where: {
        gasName_source: {
          gasName: gwp.gasName,
          source: gwp.source,
        },
      },
      update: { gwpValue: gwp.gwpValue },
      create: gwp,
    });
  }
  console.log("  GwpConfig (IPCC AR5) initialized");

  // 4e. Seed EmissionFactors (ISPRA 2024 values)
  // Real-world Italian emission factors per unit (L or kWh) for each MacroFuelType
  const emissionFactorsData = [
    { macroId: benzina.id,     co2: 2.315, ch4: 0.00086,  n2o: 0.00026  },
    { macroId: gasolio.id,     co2: 2.653, ch4: 0.00003,  n2o: 0.00028  },
    { macroId: gpl.id,         co2: 1.513, ch4: 0.00068,  n2o: 0.00002  },
    { macroId: metano.id,      co2: 1.932, ch4: 0.00188,  n2o: 0.00003  },
    { macroId: elettricita.id, co2: 0.256, ch4: 0.00001,  n2o: 0.000004 },
    { macroId: idrogeno.id,    co2: 0.830, ch4: 0.00001,  n2o: 0.000001 },
  ];

  const efEffectiveDate = new Date("2024-01-01T00:00:00.000Z");

  for (const ef of emissionFactorsData) {
    const existing = await prisma.emissionFactor.findFirst({
      where: {
        macroFuelTypeId: ef.macroId,
        effectiveDate: efEffectiveDate,
        source: "ISPRA 2024",
      },
    });
    if (!existing) {
      await prisma.emissionFactor.create({
        data: {
          macroFuelTypeId: ef.macroId,
          co2: ef.co2,
          ch4: ef.ch4,
          n2o: ef.n2o,
          hfc: 0,
          pfc: 0,
          sf6: 0,
          nf3: 0,
          source: "ISPRA 2024",
          effectiveDate: efEffectiveDate,
          createdBy: adminUserId,
        },
      });
    }
  }
  console.log("  EmissionFactors (ISPRA 2024) initialized");

  // 5. Create Pool pseudo-employee for demo tenant
  const existingPool = await prisma.employee.findFirst({
    where: { tenantId: org.id, isPool: true },
  });
  if (!existingPool) {
    await prisma.employee.create({
      data: {
        tenantId: org.id,
        firstName: "Pool",
        lastName: "Veicoli Condivisi",
        isActive: true,
        isPool: true,
        type: "pool",
      },
    });
  }
  console.log("  Pool pseudo-employee initialized");

  console.log("Seed: completato con successo!");
}

main()
  .catch((e) => {
    console.error("Seed: errore", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
