import { z } from "zod";

export const createTenantSchema = z.object({
  name: z
    .string()
    .min(2, "Il nome deve avere almeno 2 caratteri")
    .max(100, "Il nome non puo superare 100 caratteri"),
  slug: z
    .string()
    .min(2, "Lo slug deve avere almeno 2 caratteri")
    .max(50, "Lo slug non puo superare 50 caratteri")
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Lo slug deve essere in formato kebab-case (es. mia-azienda)"
    ),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const updateTenantSchema = z.object({
  name: z
    .string()
    .min(2, "Il nome deve avere almeno 2 caratteri")
    .max(100, "Il nome non puo superare 100 caratteri")
    .optional(),
  slug: z
    .string()
    .min(2, "Lo slug deve avere almeno 2 caratteri")
    .max(50, "Lo slug non puo superare 50 caratteri")
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Lo slug deve essere in formato kebab-case"
    )
    .optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const deactivateTenantSchema = z.object({
  id: z.string().min(1, "ID tenant richiesto"),
  reason: z.string().max(500).optional(),
});

export type CreateTenantInput = z.infer<typeof createTenantSchema>;
export type UpdateTenantInput = z.infer<typeof updateTenantSchema>;
export type DeactivateTenantInput = z.infer<typeof deactivateTenantSchema>;
