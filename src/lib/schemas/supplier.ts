import { z } from "zod";
import { DEFAULT_PAGE_SIZE } from "@/lib/utils/constants";

// ---------------------------------------------------------------------------
// Factory function for i18n
// ---------------------------------------------------------------------------

type T = (key: string) => string;

const IT: Record<string, string> = {
  codeRequired: "Il codice e obbligatorio",
  codeMax: "Il codice non puo superare 50 caratteri",
  labelRequired: "L'etichetta e obbligatoria",
  labelMax: "L'etichetta non puo superare 100 caratteri",
  descriptionMax: "La descrizione non puo superare 500 caratteri",
  typeRequired: "Il tipo fornitore e obbligatorio",
  nameRequired: "Il nome e obbligatorio",
  nameMax: "Il nome non puo superare 200 caratteri",
  vatFormat: "Partita IVA: 11 cifre numeriche",
  addressMax: "L'indirizzo non puo superare 500 caratteri",
  pecMax: "La PEC non puo superare 100 caratteri",
  contactNameMax: "Il nome contatto non puo superare 100 caratteri",
  contactPhoneMax: "Il telefono contatto non puo superare 50 caratteri",
  contactEmailMax: "L'email contatto non puo superare 100 caratteri",
  notesMax: "Le note non possono superare 1000 caratteri",
};

const itFallback: T = (k) => IT[k] ?? k;

// ---------------------------------------------------------------------------
// SupplierType schemas
// ---------------------------------------------------------------------------

export function buildCreateSupplierTypeSchema(t: T = itFallback) {
  return z.object({
    code: z
      .string()
      .min(1, { error: t("codeRequired") })
      .max(50, { error: t("codeMax") })
      .transform((val) => val.toUpperCase().replace(/\s+/g, "_")),
    label: z
      .string()
      .min(1, { error: t("labelRequired") })
      .max(100, { error: t("labelMax") }),
    description: z
      .string()
      .max(500, { error: t("descriptionMax") })
      .optional()
      .transform((val) => (val === "" ? undefined : val)),
    sortOrder: z.coerce.number().int().min(0).default(0),
  });
}

export function buildUpdateSupplierTypeSchema(t: T = itFallback) {
  return z.object({
    label: z
      .string()
      .min(1, { error: t("labelRequired") })
      .max(100, { error: t("labelMax") }),
    description: z
      .string()
      .max(500, { error: t("descriptionMax") })
      .optional()
      .transform((val) => (val === "" ? undefined : val)),
    sortOrder: z.coerce.number().int().min(0).default(0),
    isActive: z.boolean().default(true),
  });
}

// ---------------------------------------------------------------------------
// Supplier schemas
// ---------------------------------------------------------------------------

export function buildCreateSupplierSchema(t: T = itFallback) {
  return z.object({
    supplierTypeId: z.coerce.number({ error: t("typeRequired") }),
    name: z
      .string()
      .min(1, { error: t("nameRequired") })
      .max(200, { error: t("nameMax") }),
    vatNumber: z
      .string()
      .regex(/^\d{11}$/, { error: t("vatFormat") }),
    address: z
      .string()
      .max(500, { error: t("addressMax") })
      .optional()
      .transform((val) => (val === "" ? undefined : val)),
    pec: z
      .string()
      .max(100, { error: t("pecMax") })
      .optional()
      .transform((val) => (val === "" ? undefined : val)),
    contactName: z
      .string()
      .max(100, { error: t("contactNameMax") })
      .optional()
      .transform((val) => (val === "" ? undefined : val)),
    contactPhone: z
      .string()
      .max(50, { error: t("contactPhoneMax") })
      .optional()
      .transform((val) => (val === "" ? undefined : val)),
    contactEmail: z
      .string()
      .max(100, { error: t("contactEmailMax") })
      .optional()
      .transform((val) => (val === "" ? undefined : val)),
    notes: z
      .string()
      .max(1000, { error: t("notesMax") })
      .optional()
      .transform((val) => (val === "" ? undefined : val)),
  });
}

// ---------------------------------------------------------------------------
// Default instances (Italian) — backward compatible
// ---------------------------------------------------------------------------

export const createSupplierTypeSchema = buildCreateSupplierTypeSchema();
export type CreateSupplierTypeInput = z.infer<typeof createSupplierTypeSchema>;

export const updateSupplierTypeSchema = buildUpdateSupplierTypeSchema();
export type UpdateSupplierTypeInput = z.infer<typeof updateSupplierTypeSchema>;

export const createSupplierSchema = buildCreateSupplierSchema();
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
