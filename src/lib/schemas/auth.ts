import { z } from "zod";

export const passwordSchema = z
  .string()
  .min(12, "Minimo 12 caratteri")
  .max(128, "Massimo 128 caratteri")
  .regex(/[A-Z]/, "Almeno una lettera maiuscola")
  .regex(/[a-z]/, "Almeno una lettera minuscola")
  .regex(/[0-9]/, "Almeno un numero")
  .regex(/[^A-Za-z0-9]/, "Almeno un carattere speciale");

export const loginSchema = z.object({
  email: z.string().email("Email non valida").max(254, "Email troppo lunga"),
  password: z.string().min(1, "Password obbligatoria"),
});

export const registerSchema = z
  .object({
    name: z
      .string()
      .min(2, "Minimo 2 caratteri")
      .max(100, "Massimo 100 caratteri"),
    email: z.string().email("Email non valida").max(254, "Email troppo lunga"),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Le password non coincidono",
    path: ["confirmPassword"],
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
