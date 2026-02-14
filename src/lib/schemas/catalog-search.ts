import { z } from "zod";
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from "@/lib/utils/constants";

// ---------------------------------------------------------------------------
// Valori ammessi per ordinamento
// ---------------------------------------------------------------------------

const sortByValues = [
  "marca",
  "modello",
  "allestimento",
  "normativa",
] as const;

const sortDirValues = ["asc", "desc"] as const;

const fuelTypeValues = [
  "BENZINA",
  "DIESEL",
  "GPL",
  "METANO",
  "ELETTRICO",
  "IBRIDO_BENZINA",
  "IBRIDO_DIESEL",
  "IDROGENO",
  "BIFUEL_BENZINA_GPL",
  "BIFUEL_BENZINA_METANO",
] as const;

// ---------------------------------------------------------------------------
// Schema ricerca catalogo (da searchParams URL)
// ---------------------------------------------------------------------------

export const catalogSearchParamsSchema = z.object({
  q: z.string().max(200).optional(),
  marca: z.string().optional(),
  carburante: z.enum(fuelTypeValues).optional(),
  normativa: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z
    .union([z.coerce.number().int(), z.undefined()])
    .transform((v) =>
      v !== undefined && (PAGE_SIZE_OPTIONS as readonly number[]).includes(v)
        ? v
        : DEFAULT_PAGE_SIZE
    ),
  sortBy: z.enum(sortByValues).optional(),
  sortDir: z.enum(sortDirValues).default("asc"),
});

// ---------------------------------------------------------------------------
// Tipi derivati
// ---------------------------------------------------------------------------

export type CatalogSearchParams = z.infer<typeof catalogSearchParamsSchema>;
