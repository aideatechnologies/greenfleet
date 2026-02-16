import { z } from "zod";
import { DEFAULT_PAGE_SIZE } from "@/lib/utils/constants";

// ---------------------------------------------------------------------------
// Create carlist
// ---------------------------------------------------------------------------

export const createCarlistSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { error: "Il nome e obbligatorio" })
    .max(100, { error: "Il nome non puo superare 100 caratteri" }),
  description: z
    .string()
    .max(500, { error: "La descrizione non puo superare 500 caratteri" })
    .optional()
    .transform((val) => (val === "" ? undefined : val)),
});

export type CreateCarlistInput = z.input<typeof createCarlistSchema>;

// ---------------------------------------------------------------------------
// Update carlist
// ---------------------------------------------------------------------------

export const updateCarlistSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { error: "Il nome e obbligatorio" })
    .max(100, { error: "Il nome non puo superare 100 caratteri" })
    .optional(),
  description: z
    .string()
    .max(500, { error: "La descrizione non puo superare 500 caratteri" })
    .optional()
    .transform((val) => (val === "" ? undefined : val)),
});

export type UpdateCarlistInput = z.input<typeof updateCarlistSchema>;

// ---------------------------------------------------------------------------
// Add vehicles to carlist
// ---------------------------------------------------------------------------

export const addCatalogVehiclesToCarlistSchema = z.object({
  carlistId: z.coerce.number({ error: "ID carlist obbligatorio" }),
  catalogVehicleIds: z
    .array(z.coerce.number({ error: "ID veicolo catalogo non valido" }))
    .min(1, { error: "Selezionare almeno un veicolo" }),
});

export type AddCatalogVehiclesToCarlistInput = z.input<typeof addCatalogVehiclesToCarlistSchema>;

// ---------------------------------------------------------------------------
// Remove catalog vehicles from carlist
// ---------------------------------------------------------------------------

export const removeCatalogVehiclesFromCarlistSchema = z.object({
  carlistId: z.coerce.number({ error: "ID carlist obbligatorio" }),
  catalogVehicleIds: z
    .array(z.coerce.number({ error: "ID veicolo catalogo non valido" }))
    .min(1, { error: "Selezionare almeno un veicolo" }),
});

export type RemoveCatalogVehiclesFromCarlistInput = z.input<typeof removeCatalogVehiclesFromCarlistSchema>;

// ---------------------------------------------------------------------------
// Filter schema for list view
// ---------------------------------------------------------------------------

export const carlistFilterSchema = z.object({
  search: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(DEFAULT_PAGE_SIZE),
  sortBy: z
    .enum(["name", "createdAt", "updatedAt"])
    .optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
});

export type CarlistFilterInput = z.infer<typeof carlistFilterSchema>;
