import { z } from "zod";
import { DEFAULT_PAGE_SIZE } from "@/lib/utils/constants";

// ---------------------------------------------------------------------------
// SupplierType schemas
// ---------------------------------------------------------------------------

export const createSupplierTypeSchema = z.object({
  code: z
    .string()
    .min(1, { error: "Il codice e obbligatorio" })
    .max(50, { error: "Il codice non puo superare 50 caratteri" })
    .transform((val) => val.toUpperCase().replace(/\s+/g, "_")),
  label: z
    .string()
    .min(1, { error: "L'etichetta e obbligatoria" })
    .max(100, { error: "L'etichetta non puo superare 100 caratteri" }),
  description: z
    .string()
    .max(500, { error: "La descrizione non puo superare 500 caratteri" })
    .optional()
    .transform((val) => (val === "" ? undefined : val)),
  sortOrder: z.coerce.number().int().min(0).default(0),
});

export type CreateSupplierTypeInput = z.infer<typeof createSupplierTypeSchema>;

export const updateSupplierTypeSchema = z.object({
  label: z
    .string()
    .min(1, { error: "L'etichetta e obbligatoria" })
    .max(100, { error: "L'etichetta non puo superare 100 caratteri" }),
  description: z
    .string()
    .max(500, { error: "La descrizione non puo superare 500 caratteri" })
    .optional()
    .transform((val) => (val === "" ? undefined : val)),
  sortOrder: z.coerce.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

export type UpdateSupplierTypeInput = z.infer<typeof updateSupplierTypeSchema>;

// ---------------------------------------------------------------------------
// Supplier schemas
// ---------------------------------------------------------------------------

export const createSupplierSchema = z.object({
  supplierTypeId: z.coerce.number({ error: "Il tipo fornitore e obbligatorio" }),
  name: z
    .string()
    .min(1, { error: "Il nome e obbligatorio" })
    .max(200, { error: "Il nome non puo superare 200 caratteri" }),
  vatNumber: z
    .string()
    .max(20, { error: "La partita IVA non puo superare 20 caratteri" })
    .optional()
    .transform((val) => (val === "" ? undefined : val)),
  address: z
    .string()
    .max(500, { error: "L'indirizzo non puo superare 500 caratteri" })
    .optional()
    .transform((val) => (val === "" ? undefined : val)),
  pec: z
    .string()
    .max(100, { error: "La PEC non puo superare 100 caratteri" })
    .optional()
    .transform((val) => (val === "" ? undefined : val)),
  contactName: z
    .string()
    .max(100, { error: "Il nome contatto non puo superare 100 caratteri" })
    .optional()
    .transform((val) => (val === "" ? undefined : val)),
  contactPhone: z
    .string()
    .max(50, { error: "Il telefono contatto non puo superare 50 caratteri" })
    .optional()
    .transform((val) => (val === "" ? undefined : val)),
  contactEmail: z
    .string()
    .max(100, { error: "L'email contatto non puo superare 100 caratteri" })
    .optional()
    .transform((val) => (val === "" ? undefined : val)),
  notes: z
    .string()
    .max(1000, { error: "Le note non possono superare 1000 caratteri" })
    .optional()
    .transform((val) => (val === "" ? undefined : val)),
});

export type CreateSupplierInput = z.infer<typeof createSupplierSchema>;

export const updateSupplierSchema = createSupplierSchema;
export type UpdateSupplierInput = z.infer<typeof updateSupplierSchema>;

// ---------------------------------------------------------------------------
// Filter schema
// ---------------------------------------------------------------------------

export const supplierFilterSchema = z.object({
  search: z.string().optional(),
  supplierTypeId: z.coerce.number().optional(),
  isActive: z
    .enum(["true", "false", "all"])
    .optional()
    .default("all"),
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(DEFAULT_PAGE_SIZE),
});

export type SupplierFilterInput = z.infer<typeof supplierFilterSchema>;
