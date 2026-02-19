import { z } from "zod";

// ---------------------------------------------------------------------------
// Factory functions for i18n-aware schemas
// ---------------------------------------------------------------------------

type T = (key: string) => string;

const IT: Record<string, string> = {
  passwordMin: "Minimo 12 caratteri",
  passwordMax: "Massimo 128 caratteri",
  passwordUppercase: "Almeno una lettera maiuscola",
  passwordLowercase: "Almeno una lettera minuscola",
  passwordNumber: "Almeno un numero",
  passwordSpecial: "Almeno un carattere speciale",
  emailInvalid: "Email non valida",
  emailTooLong: "Email troppo lunga",
  passwordRequired: "Password obbligatoria",
  nameMin: "Minimo 2 caratteri",
  nameMax: "Massimo 100 caratteri",
  passwordMismatch: "Le password non coincidono",
};

const itFallback: T = (k) => IT[k] ?? k;

export function createPasswordSchema(t: T = itFallback) {
  return z
    .string()
    .min(12, t("passwordMin"))
    .max(128, t("passwordMax"))
    .regex(/[A-Z]/, t("passwordUppercase"))
    .regex(/[a-z]/, t("passwordLowercase"))
    .regex(/[0-9]/, t("passwordNumber"))
    .regex(/[^A-Za-z0-9]/, t("passwordSpecial"));
}

export function createLoginSchema(t: T = itFallback) {
  return z.object({
    email: z.string().email(t("emailInvalid")).max(254, t("emailTooLong")),
    password: z.string().min(1, t("passwordRequired")),
  });
}

export function createRegisterSchema(t: T = itFallback) {
  return z
    .object({
      name: z
        .string()
        .min(2, t("nameMin"))
        .max(100, t("nameMax")),
      email: z.string().email(t("emailInvalid")).max(254, t("emailTooLong")),
      password: createPasswordSchema(t),
      confirmPassword: z.string(),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: t("passwordMismatch"),
      path: ["confirmPassword"],
    });
}

// ---------------------------------------------------------------------------
// Default instances (Italian) — backward compatible
// ---------------------------------------------------------------------------

export const passwordSchema = createPasswordSchema();
export const loginSchema = createLoginSchema();
export const registerSchema = createRegisterSchema();

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
