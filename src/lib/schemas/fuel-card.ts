import { z } from "zod";
import { DEFAULT_PAGE_SIZE } from "@/lib/utils/constants";
import {
  FUEL_CARD_STATUS_VALUES,
  FUEL_CARD_ASSIGNMENT_TYPE_VALUES,
} from "@/types/fuel-card";

// ---------------------------------------------------------------------------
// Create / Update FuelCard
// ---------------------------------------------------------------------------

export const createFuelCardSchema = z
  .object({
    cardNumber: z
      .string()
      .min(1, { error: "Il numero carta e obbligatorio" })
      .max(50, { error: "Il numero carta non puo superare 50 caratteri" }),
    supplierId: z
      .coerce.number({ error: "Il fornitore e obbligatorio" })
      .min(1, { error: "Il fornitore e obbligatorio" }),
    expiryDate: z.coerce
      .date({ error: "Data scadenza non valida" })
      .optional(),
    status: z.enum(
      FUEL_CARD_STATUS_VALUES as unknown as [string, ...string[]],
      { error: "Stato non valido" }
    ),
    assignmentType: z.enum(
      FUEL_CARD_ASSIGNMENT_TYPE_VALUES as unknown as [string, ...string[]],
      { error: "Tipo assegnazione non valido" }
    ),
    assignedVehicleId: z
      .coerce.number()
      .optional()
      .transform((val) => (val === 0 ? undefined : val)),
    assignedEmployeeId: z
      .coerce.number()
      .optional()
      .transform((val) => (val === 0 ? undefined : val)),
    notes: z
      .string()
      .max(500, { error: "Le note non possono superare 500 caratteri" })
      .optional()
      .transform((val) => (val === "" ? undefined : val)),
  })
  .superRefine((data, ctx) => {
    if (data.assignmentType === "VEHICLE" && !data.assignedVehicleId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Il veicolo e obbligatorio per assegnazione a veicolo",
        path: ["assignedVehicleId"],
      });
    }
    if (data.assignmentType === "EMPLOYEE" && !data.assignedEmployeeId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Il dipendente e obbligatorio per assegnazione a dipendente",
        path: ["assignedEmployeeId"],
      });
    }
    if (data.assignmentType === "JOLLY") {
      data.assignedVehicleId = undefined;
      data.assignedEmployeeId = undefined;
    }
    if (data.assignmentType === "VEHICLE") {
      data.assignedEmployeeId = undefined;
    }
    if (data.assignmentType === "EMPLOYEE") {
      data.assignedVehicleId = undefined;
    }
  });

export type CreateFuelCardInput = z.infer<typeof createFuelCardSchema>;

export const updateFuelCardSchema = createFuelCardSchema;
export type UpdateFuelCardInput = z.infer<typeof updateFuelCardSchema>;

// ---------------------------------------------------------------------------
// Filter schema
// ---------------------------------------------------------------------------

export const fuelCardFilterSchema = z.object({
  search: z.string().optional(),
  status: z
    .enum(FUEL_CARD_STATUS_VALUES as unknown as [string, ...string[]])
    .optional(),
  assignmentType: z
    .enum(FUEL_CARD_ASSIGNMENT_TYPE_VALUES as unknown as [string, ...string[]])
    .optional(),
  supplierId: z.coerce.number().optional(),
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(DEFAULT_PAGE_SIZE),
});

export type FuelCardFilterInput = z.infer<typeof fuelCardFilterSchema>;
