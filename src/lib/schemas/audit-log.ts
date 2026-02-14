import { z } from "zod";
import { DEFAULT_PAGE_SIZE } from "@/lib/utils/constants";

// ---------------------------------------------------------------------------
// Audit log filter schema (for URL search params)
// ---------------------------------------------------------------------------

export const auditLogFilterSchema = z.object({
  entityType: z.string().optional(),
  userId: z.string().optional(),
  actionType: z
    .enum(["created", "updated", "deleted"])
    .optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(DEFAULT_PAGE_SIZE),
});

export type AuditLogFilterInput = z.infer<typeof auditLogFilterSchema>;
