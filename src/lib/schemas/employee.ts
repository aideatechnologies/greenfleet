import { z } from "zod";
import { DEFAULT_PAGE_SIZE } from "@/lib/utils/constants";

const ITALIAN_CF_REGEX = /^[A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z]$/;

// ---------------------------------------------------------------------------
// Factory function for i18n
// ---------------------------------------------------------------------------

type T = (key: string) => string;

const IT: Record<string, string> = {
  firstNameRequired: "Il nome è obbligatorio",
  firstNameMax: "Il nome non può superare 100 caratteri",
  lastNameRequired: "Il cognome è obbligatorio",
  lastNameMax: "Il cognome non può superare 100 caratteri",
  emailRequired: "L'email è obbligatoria",
  emailInvalid: "Email non valida",
  phoneMax: "Il telefono non può superare 50 caratteri",
  fiscalCodeInvalid: "Codice fiscale non valido (formato: RSSMRA85M01H501Z)",
  matricolaMax: "La matricola non puo superare 50 caratteri",
  avgMonthlyKmRequired: "I km medi mensili sono obbligatori",
  avgMonthlyKmNegative: "I km medi mensili non possono essere negativi",
  carlistRequired: "La selezione della car list è obbligatoria",
  idRequired: "ID dipendente obbligatorio",
};

const itFallback: T = (k) => IT[k] ?? k;

export function buildCreateEmployeeSchema(t: T = itFallback) {
  return z.object({
    firstName: z
      .string()
      .min(1, { error: t("firstNameRequired") })
      .max(100, { error: t("firstNameMax") }),
    lastName: z
      .string()
      .min(1, { error: t("lastNameRequired") })
      .max(100, { error: t("lastNameMax") }),
    email: z
      .string()
      .min(1, { error: t("emailRequired") })
      .email({ error: t("emailInvalid") }),
    phone: z
      .string()
      .max(50, { error: t("phoneMax") })
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
              error: t("fiscalCodeInvalid"),
            }),
        ])
      )
      .optional(),
    matricola: z
      .string()
      .max(50, { error: t("matricolaMax") })
      .nullable()
      .optional()
      .transform((val) => (val === "" ? null : val)),
    avgMonthlyKm: z
      .number({ error: t("avgMonthlyKmRequired") })
      .nonnegative({ error: t("avgMonthlyKmNegative") }),
    carlistId: z.coerce.number({ error: t("carlistRequired") }),
  });
}

export function buildUpdateEmployeeSchema(t: T = itFallback) {
  return buildCreateEmployeeSchema(t).extend({
    id: z.coerce.number({ error: t("idRequired") }),
  });
}

// ---------------------------------------------------------------------------
// Default instances (Italian) — backward compatible
// ---------------------------------------------------------------------------

export const createEmployeeSchema = buildCreateEmployeeSchema();
export const updateEmployeeSchema = buildUpdateEmployeeSchema();

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
