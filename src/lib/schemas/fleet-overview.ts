import { z } from "zod";
import { DEFAULT_PAGE_SIZE } from "@/lib/utils/constants";

// ---------------------------------------------------------------------------
// Fleet vehicle overview filters
// ---------------------------------------------------------------------------

export const fleetOverviewFilterSchema = z.object({
  search: z.string().optional(),
  vehicleStatus: z
    .enum(["ACTIVE", "INACTIVE", "DISPOSED"] as [string, ...string[]])
    .optional(),
  assignmentStatus: z
    .enum(["ASSIGNED", "UNASSIGNED", "POOL"] as [string, ...string[]])
    .optional(),
  contractStatus: z
    .enum(["HAS_CONTRACT", "NO_CONTRACT", "EXPIRING"] as [string, ...string[]])
    .optional(),
  carlistId: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(DEFAULT_PAGE_SIZE),
  sortBy: z
    .enum(["licensePlate", "make", "status", "createdAt"])
    .optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
});

export type FleetOverviewFilterInput = z.infer<typeof fleetOverviewFilterSchema>;

// ---------------------------------------------------------------------------
// Fleet employee overview filters
// ---------------------------------------------------------------------------

export const employeeOverviewFilterSchema = z.object({
  search: z.string().optional(),
  status: z
    .enum(["ACTIVE", "INACTIVE"] as [string, ...string[]])
    .optional(),
  assignmentStatus: z
    .enum(["ASSIGNED", "UNASSIGNED"] as [string, ...string[]])
    .optional(),
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(DEFAULT_PAGE_SIZE),
  sortBy: z
    .enum(["lastName", "firstName", "isActive", "createdAt"])
    .optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
});

export type EmployeeOverviewFilterInput = z.infer<typeof employeeOverviewFilterSchema>;
