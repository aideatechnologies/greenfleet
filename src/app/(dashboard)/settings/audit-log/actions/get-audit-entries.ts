"use server";

import { getSessionContext } from "@/lib/auth/permissions";
import { getPrismaForTenant } from "@/lib/db/client";
import { getAuditEntries } from "@/lib/services/audit-service";
import type { AuditLogFilters, AuditLogEntry } from "@/types/audit";
import type { ActionResult } from "@/types/action-result";
import type { PaginatedResult } from "@/types/pagination";
import { ErrorCode } from "@/types/action-result";

// Serializable version of AuditLogEntry (Date -> string)
export type SerializableAuditLogEntry = Omit<AuditLogEntry, "timestamp"> & {
  timestamp: string;
};

export type SerializablePaginatedAuditResult = {
  data: SerializableAuditLogEntry[];
  pagination: PaginatedResult<AuditLogEntry>["pagination"];
};

export async function fetchAuditEntries(
  filters: AuditLogFilters
): Promise<ActionResult<SerializablePaginatedAuditResult>> {
  const ctx = await getSessionContext();
  if (!ctx || !ctx.organizationId) {
    return {
      success: false,
      error: "Non autenticato",
      code: ErrorCode.UNAUTHORIZED,
    };
  }

  // Only owner (Platform Admin) can access audit log
  if (ctx.role !== "owner" && ctx.role !== "admin") {
    return {
      success: false,
      error: "Permessi insufficienti per accedere all'audit log",
      code: ErrorCode.FORBIDDEN,
    };
  }

  const prisma = getPrismaForTenant(ctx.organizationId);
  const result = await getAuditEntries(prisma, filters);

  // Serialize dates for client transport
  const serialized: SerializablePaginatedAuditResult = {
    data: result.data.map((entry) => ({
      ...entry,
      timestamp: entry.timestamp.toISOString(),
    })),
    pagination: result.pagination,
  };

  return { success: true, data: serialized };
}
