import { z } from "zod";

export const employeeImportRowSchema = z.object({
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
  fiscalCode: z
    .string()
    .transform((val) => val.trim().toUpperCase())
    .pipe(
      z.union([
        z.literal(""),
        z.string().regex(/^[A-Z0-9]{16}$/i, {
          error: "Codice fiscale non valido (16 caratteri alfanumerici)",
        }),
      ])
    )
    .optional(),
  phone: z
    .string()
    .max(20, { error: "Il telefono non può superare 20 caratteri" })
    .optional(),
});

export const employeeImportConfigSchema = z.object({
  separator: z.string().default(","),
  hasHeader: z.boolean().default(true),
});

export const columnMappingSchema = z
  .record(z.string(), z.number().int().min(0))
  .refine(
    (mapping) => {
      return "firstName" in mapping && "lastName" in mapping;
    },
    { error: "Mappatura obbligatoria: Nome e Cognome" }
  )
  .refine(
    (mapping) => {
      const indices = Object.values(mapping);
      return new Set(indices).size === indices.length;
    },
    { error: "Non è possibile mappare più campi sulla stessa colonna" }
  );

export type EmployeeImportRow = z.infer<typeof employeeImportRowSchema>;
export type EmployeeImportConfig = z.infer<typeof employeeImportConfigSchema>;
