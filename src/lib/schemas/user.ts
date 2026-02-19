import { z } from "zod";
import { createPasswordSchema } from "./auth";

// ---------------------------------------------------------------------------
// Factory function for i18n
// ---------------------------------------------------------------------------

type T = (key: string) => string;

const IT: Record<string, string> = {
  nameMin: "Il nome deve avere almeno 2 caratteri",
  nameMax: "Il nome non puo superare 100 caratteri",
  emailInvalid: "Email non valida",
  emailTooLong: "Email troppo lunga",
  roleRequired: "Ruolo obbligatorio",
  tenantRequired: "Tenant obbligatorio",
};

const itFallback: T = (k) => IT[k] ?? k;

export function buildCreateUserSchema(t: T = itFallback) {
  return z.object({
    name: z
      .string()
      .min(2, t("nameMin"))
      .max(100, t("nameMax")),
    email: z
      .string()
      .email(t("emailInvalid"))
      .max(254, t("emailTooLong")),
    password: createPasswordSchema(),
    role: z.enum(["admin", "mobility_manager", "member"], {
      message: t("roleRequired"),
    }),
    tenantId: z.string().min(1, t("tenantRequired")),
  });
}

export function buildUpdateUserSchema(t: T = itFallback) {
  return z.object({
    name: z
      .string()
      .min(2, t("nameMin"))
      .max(100, t("nameMax"))
      .optional(),
    email: z
      .string()
      .email(t("emailInvalid"))
      .max(254, t("emailTooLong"))
      .optional(),
    role: z.enum(["admin", "mobility_manager", "member"]).optional(),
  });
}

// ---------------------------------------------------------------------------
// Default instances (Italian) — backward compatible
// ---------------------------------------------------------------------------

export const createUserSchema = buildCreateUserSchema();
export const updateUserSchema = buildUpdateUserSchema();

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
