import type { PrismaClientWithTenant } from "@/lib/db/client";
import type { PrismaClient } from "@/generated/prisma/client";
import type {
  AuditAction,
  AuditChange,
  AuditLogEntry,
  AuditLogFilters,
} from "@/types/audit";
import type { PaginatedResult } from "@/types/pagination";
import { logger } from "@/lib/utils/logger";
import { DEFAULT_PAGE_SIZE } from "@/lib/utils/constants";

// ---------------------------------------------------------------------------
// Sensitive fields that should never be logged in audit changes
// ---------------------------------------------------------------------------

const SENSITIVE_FIELDS = new Set([
  "password",
  "passwordHash",
  "accessToken",
  "refreshToken",
  "idToken",
  "secret",
  "apiKey",
]);

// ---------------------------------------------------------------------------
// Calculate changes between old and new values
// ---------------------------------------------------------------------------

export function calculateChanges(
  oldValues: Record<string, unknown>,
  newValues: Record<string, unknown>,
  fields: string[]
): AuditChange[] {
  const changes: AuditChange[] = [];

  for (const field of fields) {
    if (SENSITIVE_FIELDS.has(field)) continue;

    const oldVal = oldValues[field];
    const newVal = newValues[field];

    // Compare dates by their ISO string representation
    const oldStr =
      oldVal instanceof Date ? oldVal.toISOString() : JSON.stringify(oldVal);
    const newStr =
      newVal instanceof Date ? newVal.toISOString() : JSON.stringify(newVal);

    if (oldStr !== newStr) {
      changes.push({
        field,
        old: oldVal instanceof Date ? oldVal.toISOString() : oldVal,
        new: newVal instanceof Date ? newVal.toISOString() : newVal,
      });
    }
  }

  return changes;
}

// ---------------------------------------------------------------------------
// Diff two objects (all keys) — returns fields that changed
// ---------------------------------------------------------------------------

export function diffObjects(
  oldObj: Record<string, unknown>,
  newObj: Record<string, unknown>
): AuditChange[] {
  const changes: AuditChange[] = [];
  const allKeys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);

  for (const key of allKeys) {
    if (SENSITIVE_FIELDS.has(key)) continue;

    const oldVal = oldObj[key];
    const newVal = newObj[key];

    const oldStr =
      oldVal instanceof Date ? oldVal.toISOString() : JSON.stringify(oldVal);
    const newStr =
      newVal instanceof Date ? newVal.toISOString() : JSON.stringify(newVal);

    if (oldStr !== newStr) {
      changes.push({
        field: key,
        old: oldVal instanceof Date ? oldVal.toISOString() : oldVal,
        new: newVal instanceof Date ? newVal.toISOString() : newVal,
      });
    }
  }

  return changes;
}

// ---------------------------------------------------------------------------
// Create audit log entry (new AuditLog model — fire-and-forget)
// ---------------------------------------------------------------------------

export type CreateAuditLogInput = {
  action: AuditAction;
  entityType: string;
  entityId: string;
  userId: string;
  userName: string;
  changes: AuditChange[];
  metadata?: Record<string, unknown>;
};

/**
 * Creates an audit log entry. Fire-and-forget — does not block the caller.
 * Errors are logged but never thrown.
 */
export function createAuditLog(
  prisma: PrismaClientWithTenant,
  input: CreateAuditLogInput
): void {
  void prisma.auditLog
    .create({
      data: {
        tenantId: "", // Overwritten by tenant extension
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        userId: input.userId,
        userName: input.userName,
        changes: JSON.stringify(input.changes),
        metadata: input.metadata ? JSON.stringify(input.metadata) : null,
      },
    })
    .then(() => {
      logger.info(
        {
          action: input.action,
          entityType: input.entityType,
          entityId: input.entityId,
          userId: input.userId,
        },
        "Audit log entry created"
      );
    })
    .catch((error) => {
      logger.error(
        { error, action: input.action, entityId: input.entityId },
        "Failed to create audit log entry"
      );
    });
}

// ---------------------------------------------------------------------------
// Audit a create operation (convenience wrapper)
// ---------------------------------------------------------------------------

export async function auditCreate(
  prisma: PrismaClientWithTenant,
  params: {
    userId: string;
    userName?: string;
    action: AuditAction;
    entityType: string;
    entityId: string;
    data: Record<string, unknown>;
    source?: string;
    metadata?: Record<string, unknown>;
  }
): Promise<void> {
  try {
    const changes: AuditChange[] = Object.entries(params.data)
      .filter(([field]) => !SENSITIVE_FIELDS.has(field))
      .map(([field, value]) => ({
        field,
        old: null,
        new: value instanceof Date ? value.toISOString() : value,
      }));

    // Write to legacy AuditEntry
    await prisma.auditEntry.create({
      data: {
        tenantId: "", // Overwritten by tenant extension
        userId: params.userId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        changes: JSON.stringify(changes),
        source: params.source ?? null,
      },
    });

    // Also write to new AuditLog (fire-and-forget)
    createAuditLog(prisma, {
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      userId: params.userId,
      userName: params.userName ?? params.userId,
      changes,
      metadata: {
        ...params.metadata,
        ...(params.source ? { source: params.source } : {}),
      },
    });
  } catch (error) {
    // Audit failures should not break the main operation
    logger.error(
      { error, action: params.action, entityId: params.entityId },
      "Failed to create audit entry"
    );
  }
}

// ---------------------------------------------------------------------------
// Audit an update operation (convenience wrapper)
// ---------------------------------------------------------------------------

export async function auditUpdate(
  prisma: PrismaClientWithTenant,
  params: {
    userId: string;
    userName?: string;
    action: AuditAction;
    entityType: string;
    entityId: string;
    changes: AuditChange[];
    source?: string;
    metadata?: Record<string, unknown>;
  }
): Promise<void> {
  try {
    // Skip audit if no actual changes
    if (params.changes.length === 0) return;

    // Write to legacy AuditEntry
    await prisma.auditEntry.create({
      data: {
        tenantId: "", // Overwritten by tenant extension
        userId: params.userId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        changes: JSON.stringify(params.changes),
        source: params.source ?? null,
      },
    });

    // Also write to new AuditLog (fire-and-forget)
    createAuditLog(prisma, {
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      userId: params.userId,
      userName: params.userName ?? params.userId,
      changes: params.changes,
      metadata: {
        ...params.metadata,
        ...(params.source ? { source: params.source } : {}),
      },
    });
  } catch (error) {
    logger.error(
      { error, action: params.action, entityId: params.entityId },
      "Failed to create audit entry"
    );
  }
}

// ---------------------------------------------------------------------------
// Read audit log entries with filters (Admin-only, read-only)
// ---------------------------------------------------------------------------

export async function getAuditEntries(
  prisma: PrismaClientWithTenant | PrismaClient,
  filters: AuditLogFilters
): Promise<PaginatedResult<AuditLogEntry>> {
  const page = filters.page || 1;
  const pageSize = filters.pageSize || DEFAULT_PAGE_SIZE;
  const skip = (page - 1) * pageSize;

  // Build where clause
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: Record<string, any> = {};

  if (filters.entityType) {
    where.entityType = filters.entityType;
  }

  if (filters.userId) {
    where.userId = filters.userId;
  }

  if (filters.actionType) {
    // actionType is "created" | "updated" | "deleted" — match action ending
    where.action = { endsWith: `.${filters.actionType}` };
  }

  if (filters.dateFrom || filters.dateTo) {
    where.timestamp = {};
    if (filters.dateFrom) {
      where.timestamp.gte = filters.dateFrom;
    }
    if (filters.dateTo) {
      where.timestamp.lte = filters.dateTo;
    }
  }

  const [data, totalCount] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { timestamp: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.auditLog.count({ where }),
  ]);

  const entries: AuditLogEntry[] = data.map((row) => ({
    id: row.id,
    action: row.action as AuditAction,
    entityType: row.entityType,
    entityId: row.entityId,
    tenantId: row.tenantId,
    userId: row.userId,
    userName: row.userName,
    timestamp: row.timestamp,
    changes: safeParseJson<AuditChange[]>(row.changes, []),
    metadata: row.metadata
      ? safeParseJson<Record<string, unknown> | undefined>(row.metadata, undefined)
      : undefined,
  }));

  return {
    data: entries,
    pagination: {
      page,
      pageSize,
      totalCount,
      totalPages: Math.ceil(totalCount / pageSize),
    },
  };
}

// ---------------------------------------------------------------------------
// Helper: safely parse JSON string
// ---------------------------------------------------------------------------

function safeParseJson<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}
