import type { PrismaClientWithTenant } from "@/lib/db/client";
import { prisma as basePrisma } from "@/lib/db/client";
import type { Employee } from "@/generated/prisma/client";

/**
 * Ensures a Pool pseudo-employee exists for the given tenant.
 * The Pool is identified by isPool = true. Idempotent.
 */
export async function ensurePoolExists(
  db: PrismaClientWithTenant
): Promise<Employee> {
  const existing = await db.employee.findFirst({
    where: { isPool: true },
  });

  if (existing) return existing;

  return db.employee.create({
    data: {
      tenantId: "", // overwritten by extension
      firstName: "Pool",
      lastName: "Veicoli Condivisi",
      isActive: true,
      isPool: true,
      type: "pool",
    },
  });
}

/**
 * Ensures Pool exists for all tenants. Used for migration/seed.
 */
export async function ensurePoolForAllTenants(): Promise<void> {
  const orgs = await basePrisma.organization.findMany({
    where: { isActive: true },
    select: { id: true },
  });

  for (const org of orgs) {
    // Check if pool exists for this org
    const existing = await basePrisma.employee.findFirst({
      where: { tenantId: org.id, isPool: true },
    });

    if (!existing) {
      await basePrisma.employee.create({
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
  }
}

/**
 * Check if an employee is the Pool record.
 */
export function isPoolEmployee(employee: { isPool?: boolean; type?: string }): boolean {
  return employee.isPool === true || employee.type === "pool";
}
