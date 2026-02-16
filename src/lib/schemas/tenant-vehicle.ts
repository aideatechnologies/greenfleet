import { z } from "zod";
import { DEFAULT_PAGE_SIZE } from "@/lib/utils/constants";
import { VEHICLE_STATUS_VALUES } from "@/types/vehicle";

export const createTenantVehicleSchema = z.object({
  catalogVehicleId: z
    .coerce.number()
    .optional(),
  licensePlate: z
    .string()
    .min(2, { error: "La targa deve avere almeno 2 caratteri" })
    .max(10, { error: "La targa non puo superare 10 caratteri" })
    .transform((val) => val.trim().toUpperCase()),
  registrationDate: z.coerce.date({
    error: "Data di immatricolazione non valida",
  }),
  status: z
    .enum(VEHICLE_STATUS_VALUES as unknown as [string, ...string[]], {
      error: "Stato non valido",
    })
    .default("ACTIVE"),
  assignedEmployeeId: z
    .coerce.number()
    .optional()
    .transform((val) => (val === 0 ? undefined : val)),
  notes: z
    .string()
    .max(500, { error: "Le note non possono superare 500 caratteri" })
    .optional()
    .transform((val) => (val === "" ? undefined : val)),
});

export const updateTenantVehicleSchema = z.object({
  id: z.coerce.number({ error: "ID veicolo obbligatorio" }),
  catalogVehicleId: z.coerce.number().optional(),
  licensePlate: z
    .string()
    .min(2, { error: "La targa deve avere almeno 2 caratteri" })
    .max(10, { error: "La targa non puo superare 10 caratteri" })
    .transform((val) => val.trim().toUpperCase())
    .optional(),
  registrationDate: z.coerce
    .date({
      error: "Data di immatricolazione non valida",
    })
    .optional(),
  status: z
    .enum(VEHICLE_STATUS_VALUES as unknown as [string, ...string[]], {
      error: "Stato non valido",
    })
    .optional(),
  assignedEmployeeId: z
    .coerce.number()
    .nullable()
    .optional(),
  notes: z
    .string()
    .max(500, { error: "Le note non possono superare 500 caratteri" })
    .nullable()
    .optional()
    .transform((val) => (val === "" ? null : val)),
});

export const tenantVehicleFilterSchema = z.object({
  search: z.string().optional(),
  status: z
    .enum(VEHICLE_STATUS_VALUES as unknown as [string, ...string[]])
    .optional(),
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(DEFAULT_PAGE_SIZE),
  sortBy: z
    .enum(["licensePlate", "registrationDate", "status", "createdAt"])
    .optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
});

export type CreateTenantVehicleInput = z.infer<typeof createTenantVehicleSchema>;
export type UpdateTenantVehicleInput = z.infer<typeof updateTenantVehicleSchema>;
export type TenantVehicleFilterInput = z.infer<typeof tenantVehicleFilterSchema>;
