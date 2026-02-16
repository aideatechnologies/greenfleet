import { z } from "zod";
import { DEFAULT_PAGE_SIZE } from "@/lib/utils/constants";

const ITALIAN_CF_REGEX = /^[A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z]$/;

export const createEmployeeSchema = z.object({
  firstName: z
    .string()
    .min(1, { error: "Il nome è obbligatorio" })
    .max(100, { error: "Il nome non può superare 100 caratteri" }),
  lastName: z
    .string()
    .min(1, { error: "Il cognome è obbligatorio" })
    .max(100, { error: "Il cognome non può superare 100 caratteri" }),
  email: z
    .string()
    .transform((val) => val.trim())
    .pipe(
      z.union([
        z.literal(""),
        z.string().email({ error: "Email non valida" }),
      ])
    )
    .optional(),
  phone: z
    .string()
    .max(50, { error: "Il telefono non può superare 50 caratteri" })
    .optional(),
  fiscalCode: z
    .string()
    .transform((val) => val.trim().toUpperCase())
    .pipe(
      z.union([
        z.literal(""),
        z
          .string()
          .regex(ITALIAN_CF_REGEX, {
            error: "Codice fiscale non valido (formato: RSSMRA85M01H501Z)",
          }),
      ])
    )
    .optional(),
  matricola: z
    .string()
    .max(50, { error: "La matricola non puo superare 50 caratteri" })
    .nullable()
    .optional()
    .transform((val) => (val === "" ? null : val)),
  avgMonthlyKm: z
    .number()
    .nonnegative({ error: "I km medi mensili non possono essere negativi" })
    .nullable()
    .optional(),
});

export const updateEmployeeSchema = createEmployeeSchema.extend({
  id: z.coerce.number({ error: "ID dipendente obbligatorio" }),
});

export const employeeFilterSchema = z.object({
  search: z.string().optional(),
  isActive: z
    .union([z.boolean(), z.literal("true"), z.literal("false")])
    .transform((val) => {
      if (typeof val === "boolean") return val;
      return val === "true";
    })
    .optional(),
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(DEFAULT_PAGE_SIZE),
  sortBy: z
    .enum(["firstName", "lastName", "email", "fiscalCode", "createdAt"])
    .optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
});

export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;
export type EmployeeFilterInput = z.infer<typeof employeeFilterSchema>;
