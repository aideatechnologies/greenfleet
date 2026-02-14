import { logger } from "@/lib/utils/logger";
import type { PrismaClient } from "@/generated/prisma/client";

/**
 * Sets the SQL Server SESSION_CONTEXT for Row-Level Security.
 * Must be called within a $transaction to ensure the context stays
 * on the same connection for the duration of the operation.
 *
 * @param tx - Prisma transaction client or base client
 * @param tenantId - The tenant ID to set in SESSION_CONTEXT
 */
export async function setTenantContext(
  tx: PrismaClient,
  tenantId: string
): Promise<void> {
  if (!tenantId) {
    throw new Error("tenantId is required for RLS context");
  }

  await (tx as unknown as { $executeRawUnsafe: (query: string, ...values: unknown[]) => Promise<unknown> })
    .$executeRawUnsafe(
      "EXEC sp_set_session_context @key = N'tenantId', @value = @P1, @read_only = 1",
      tenantId
    );

  logger.debug({ tenantId }, "SESSION_CONTEXT set for RLS");
}

/**
 * Clears the SQL Server SESSION_CONTEXT.
 * Used in tests and for Admin cross-tenant operations.
 * Note: read_only = 0 is needed to allow clearing.
 */
export async function clearTenantContext(
  tx: PrismaClient
): Promise<void> {
  await (tx as unknown as { $executeRawUnsafe: (query: string) => Promise<unknown> })
    .$executeRawUnsafe(
      "EXEC sp_set_session_context @key = N'tenantId', @value = NULL, @read_only = 0"
    );

  logger.debug("SESSION_CONTEXT cleared");
}

/**
 * Executes a callback within a transaction that has SESSION_CONTEXT set.
 * This ensures the RLS context is consistent for all queries in the transaction.
 *
 * Usage:
 * ```
 * const result = await withTenantRLS(prisma, tenantId, async (tx) => {
 *   return tx.vehicle.findMany();
 * });
 * ```
 */
export async function withTenantRLS<T>(
  prisma: PrismaClient,
  tenantId: string,
  callback: (tx: PrismaClient) => Promise<T>
): Promise<T> {
  return (prisma as unknown as {
    $transaction: (fn: (tx: PrismaClient) => Promise<T>) => Promise<T>;
  }).$transaction(async (tx) => {
    await setTenantContext(tx, tenantId);
    return callback(tx);
  });
}
