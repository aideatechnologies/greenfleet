/**
 * Migration script: Create SupplierType records for each tenant
 * and assign existing Suppliers to the correct type.
 *
 * Run with: npx tsx scripts/migrate-supplier-types.ts
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaMssql } from "@prisma/adapter-mssql";

// ---------------------------------------------------------------------------
// Prisma client setup (same pattern as other scripts)
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

const DEFAULT_TYPES = [
  { code: "NLT", label: "Noleggio Lungo Termine", sortOrder: 1 },
  { code: "CARBURANTE", label: "Carburante", sortOrder: 2 },
  { code: "ALTRO", label: "Altro", sortOrder: 3 },
];

async function main() {
  // Find all tenants that have suppliers
  const tenantIds = await prisma.$queryRaw<{ tenant_id: string }[]>`
    SELECT DISTINCT tenant_id FROM Suppliers
  `;

  // Also get all tenants from organizations
  const orgs = await prisma.organization.findMany({
    select: { id: true },
  });

  const allTenantIds = new Set([
    ...tenantIds.map((t) => t.tenant_id),
    ...orgs.map((o) => o.id),
  ]);

  console.log(`Found ${allTenantIds.size} tenant(s) to process`);

  for (const tenantId of allTenantIds) {
    console.log(`\nProcessing tenant: ${tenantId}`);

    // Create default supplier types if they don't exist
    for (const dt of DEFAULT_TYPES) {
      const existing = await prisma.supplierType.findFirst({
        where: { tenantId, code: dt.code },
      });

      if (!existing) {
        await prisma.supplierType.create({
          data: {
            tenantId,
            code: dt.code,
            label: dt.label,
            sortOrder: dt.sortOrder,
          },
        });
        console.log(`  Created SupplierType: ${dt.code}`);
      } else {
        console.log(`  SupplierType ${dt.code} already exists`);
      }
    }

    // Get the type IDs
    const types = await prisma.supplierType.findMany({
      where: { tenantId },
    });
    const typeMap = new Map(types.map((t) => [t.code, t.id]));

    // Get suppliers without a type (use raw query since field is now required in schema)
    const untyped = await prisma.$queryRaw<{ id: number; name: string }[]>`
      SELECT id, name FROM Suppliers
      WHERE tenant_id = ${tenantId} AND supplier_type_id IS NULL
    `;

    console.log(`  ${untyped.length} supplier(s) need type assignment`);

    for (const supplier of untyped) {
      // Try to guess the type from the name
      const name = supplier.name.toLowerCase();
      let typeCode = "ALTRO";

      if (
        name.includes("q8") ||
        name.includes("eni") ||
        name.includes("ip ") ||
        name.includes("tamoil") ||
        name.includes("total") ||
        name.includes("shell") ||
        name.includes("carburante") ||
        name.includes("benzina") ||
        name.includes("fuel") ||
        name.includes("agip")
      ) {
        typeCode = "CARBURANTE";
      } else if (
        name.includes("noleggio") ||
        name.includes("leasing") ||
        name.includes("leasplan") ||
        name.includes("leasys") ||
        name.includes("arval") ||
        name.includes("ald") ||
        name.includes("alphabet") ||
        name.includes("nlt") ||
        name.includes("rent")
      ) {
        typeCode = "NLT";
      }

      const typeId = typeMap.get(typeCode);
      if (typeId) {
        await prisma.supplier.update({
          where: { id: supplier.id },
          data: { supplierTypeId: typeId },
        });
        console.log(`  Assigned ${supplier.name} -> ${typeCode}`);
      }
    }
  }

  console.log("\nMigration complete!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
