import { z } from "zod";
import { passwordSchema } from "./auth";

export const createUserSchema = z.object({
  name: z
    .string()
    .min(2, "Il nome deve avere almeno 2 caratteri")
    .max(100, "Il nome non puo superare 100 caratteri"),
  email: z
    .string()
    .email("Email non valida")
    .max(254, "Email troppo lunga"),
  password: passwordSchema,
  role: z.enum(["admin", "member"], {
    message: "Ruolo obbligatorio",
  }),
  tenantId: z.string().min(1, "Tenant obbligatorio"),
});

export const updateUserSchema = z.object({
  name: z
    .string()
    .min(2, "Il nome deve avere almeno 2 caratteri")
    .max(100, "Il nome non puo superare 100 caratteri")
    .optional(),
  email: z
    .string()
    .email("Email non valida")
    .max(254, "Email troppo lunga")
    .optional(),
  role: z.enum(["admin", "member"]).optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
