import { z } from "zod";
import { DOCUMENT_TYPE_VALUES } from "@/types/document";

// ---------------------------------------------------------------------------
// Create document schema (metadata only — file handled via FormData)
// ---------------------------------------------------------------------------

export const createDocumentSchema = z.object({
  documentType: z.enum(
    DOCUMENT_TYPE_VALUES as unknown as [string, ...string[]],
    { error: "Tipo documento non valido" }
  ),
  description: z
    .string()
    .max(500, { error: "La descrizione non puo superare 500 caratteri" })
    .optional()
    .transform((val) => (val === "" ? undefined : val)),
  expiryDate: z.coerce.date({ error: "Data di scadenza non valida" }),
});

export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;

// ---------------------------------------------------------------------------
// Update document schema (file is optional on update)
// ---------------------------------------------------------------------------

export const updateDocumentSchema = z.object({
  documentType: z.enum(
    DOCUMENT_TYPE_VALUES as unknown as [string, ...string[]],
    { error: "Tipo documento non valido" }
  ),
  description: z
    .string()
    .max(500, { error: "La descrizione non puo superare 500 caratteri" })
    .optional()
    .transform((val) => (val === "" ? undefined : val)),
  expiryDate: z.coerce.date({ error: "Data di scadenza non valida" }),
});

export type UpdateDocumentInput = z.infer<typeof updateDocumentSchema>;

// ---------------------------------------------------------------------------
// Filter schema for document list
// ---------------------------------------------------------------------------

export const documentFilterSchema = z.object({
  vehicleId: z.coerce.number({ error: "Il veicolo e obbligatorio" }),
  documentType: z
    .enum(DOCUMENT_TYPE_VALUES as unknown as [string, ...string[]])
    .optional(),
  expiryStatus: z.enum(["all", "expiring", "expired"]).default("all"),
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(50),
});

export type DocumentFilterInput = z.infer<typeof documentFilterSchema>;
