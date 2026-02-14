import { PrismaClient } from "@/generated/prisma/client";
import { PrismaMssql } from "@prisma/adapter-mssql";
import { tenantExtension } from "./tenant-extension";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Parse a Prisma-style SQL Server URL into an mssql config object.
 * Format: sqlserver://host:port;database=DB;user=USER;password=PASS;encrypt=true;trustServerCertificate=true
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

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  const config = parseDatabaseUrl(connectionString);
  const adapter = new PrismaMssql(config);
  return new PrismaClient({ adapter });
}

// Base client for cross-tenant operations (Admin only)
export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// Tenant-scoped client with automatic tenantId filtering
export function getPrismaForTenant(tenantId: string) {
  return prisma.$extends(tenantExtension(tenantId));
}

export type PrismaClientWithTenant = ReturnType<typeof getPrismaForTenant>;
