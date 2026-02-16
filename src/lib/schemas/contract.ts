import { z } from "zod";
import { DEFAULT_PAGE_SIZE } from "@/lib/utils/constants";
import { CONTRACT_TYPE_VALUES, CONTRACT_STATUS_VALUES } from "@/types/contract";

// ---------------------------------------------------------------------------
// Base fields shared by all contract types
// ---------------------------------------------------------------------------

const contractBase = z.object({
  vehicleId: z.string().min(1, { error: "Il veicolo e obbligatorio" }),
  notes: z
    .string()
    .max(1000, { error: "Le note non possono superare 1000 caratteri" })
    .optional()
    .transform((val) => (val === "" ? undefined : val)),
});

// ---------------------------------------------------------------------------
// Type-specific schemas (without refine, for discriminatedUnion)
// ---------------------------------------------------------------------------

const proprietarioSchema = contractBase.extend({
  type: z.literal("PROPRIETARIO"),
  purchaseDate: z.coerce.date({ error: "Data acquisto obbligatoria" }),
  purchasePrice: z
    .number({ error: "Prezzo obbligatorio" })
    .positive({ error: "Il prezzo deve essere positivo" }),
  residualValue: z
    .number()
    .nonnegative({ error: "Il valore residuo non puo essere negativo" })
    .optional(),
});

const breveTermineSchema = contractBase.extend({
  type: z.literal("BREVE_TERMINE"),
  supplierId: z.string().min(1, { error: "Il fornitore e obbligatorio" }),
  startDate: z.coerce.date({ error: "Data inizio obbligatoria" }),
  endDate: z.coerce.date({ error: "Data fine obbligatoria" }),
  dailyRate: z
    .number({ error: "Canone giornaliero obbligatorio" })
    .positive({ error: "Il canone giornaliero deve essere positivo" }),
  includedKm: z
    .number()
    .int({ error: "I km inclusi devono essere un numero intero" })
    .positive({ error: "I km inclusi devono essere positivi" })
    .optional(),
});

const lungoTermineSchema = contractBase.extend({
  type: z.literal("LUNGO_TERMINE"),
  supplierId: z.string().min(1, { error: "Il fornitore e obbligatorio" }),
  startDate: z.coerce.date({ error: "Data inizio obbligatoria" }),
  endDate: z.coerce.date({ error: "Data fine obbligatoria" }),
  monthlyRate: z
    .number({ error: "Canone mensile obbligatorio" })
    .positive({ error: "Il canone mensile deve essere positivo" }),
  franchiseKm: z
    .number()
    .int({ error: "I km in franchigia devono essere un numero intero" })
    .positive({ error: "I km in franchigia devono essere positivi" })
    .optional(),
  extraKmPenalty: z
    .number()
    .positive({ error: "La penale extra km deve essere positiva" })
    .optional(),
  includedServices: z
    .string()
    .max(2000, {
      error: "I servizi inclusi non possono superare 2000 caratteri",
    })
    .optional()
    .transform((val) => (val === "" ? undefined : val)),
});

const leasingFinanziarioSchema = contractBase.extend({
  type: z.literal("LEASING_FINANZIARIO"),
  supplierId: z.string().min(1, { error: "Il fornitore e obbligatorio" }),
  startDate: z.coerce.date({ error: "Data inizio obbligatoria" }),
  endDate: z.coerce.date({ error: "Data fine obbligatoria" }),
  monthlyRate: z
    .number({ error: "Canone mensile obbligatorio" })
    .positive({ error: "Il canone mensile deve essere positivo" }),
  buybackValue: z
    .number()
    .positive({ error: "Il valore di riscatto deve essere positivo" })
    .optional(),
  maxDiscount: z
    .number()
    .nonnegative({ error: "Lo sconto massimo non puo essere negativo" })
    .optional(),
});

// ---------------------------------------------------------------------------
// Discriminated union with date cross-validation
// ---------------------------------------------------------------------------

export const contractSchema = z
  .discriminatedUnion("type", [
    proprietarioSchema,
    breveTermineSchema,
    lungoTermineSchema,
    leasingFinanziarioSchema,
  ])
  .superRefine((data, ctx) => {
    if (
      "startDate" in data &&
      "endDate" in data &&
      data.startDate &&
      data.endDate
    ) {
      if (data.endDate <= data.startDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "La data fine deve essere successiva alla data inizio",
          path: ["endDate"],
        });
      }
    }
  });

export type ContractInput = z.input<typeof contractSchema>;

// ---------------------------------------------------------------------------
// Update schema — same as create but vehicleId and type are not changeable
// ---------------------------------------------------------------------------

const updateBase = z.object({
  notes: z
    .string()
    .max(1000, { error: "Le note non possono superare 1000 caratteri" })
    .optional()
    .transform((val) => (val === "" ? undefined : val)),
});

const updateProprietarioSchema = updateBase.extend({
  type: z.literal("PROPRIETARIO"),
  purchaseDate: z.coerce.date({ error: "Data acquisto obbligatoria" }),
  purchasePrice: z
    .number({ error: "Prezzo obbligatorio" })
    .positive({ error: "Il prezzo deve essere positivo" }),
  residualValue: z
    .number()
    .nonnegative({ error: "Il valore residuo non puo essere negativo" })
    .optional(),
});

const updateBreveTermineSchema = updateBase.extend({
  type: z.literal("BREVE_TERMINE"),
  supplierId: z.string().min(1, { error: "Il fornitore e obbligatorio" }),
  startDate: z.coerce.date({ error: "Data inizio obbligatoria" }),
  endDate: z.coerce.date({ error: "Data fine obbligatoria" }),
  dailyRate: z
    .number({ error: "Canone giornaliero obbligatorio" })
    .positive({ error: "Il canone giornaliero deve essere positivo" }),
  includedKm: z
    .number()
    .int({ error: "I km inclusi devono essere un numero intero" })
    .positive({ error: "I km inclusi devono essere positivi" })
    .optional(),
});

const updateLungoTermineSchema = updateBase.extend({
  type: z.literal("LUNGO_TERMINE"),
  supplierId: z.string().min(1, { error: "Il fornitore e obbligatorio" }),
  startDate: z.coerce.date({ error: "Data inizio obbligatoria" }),
  endDate: z.coerce.date({ error: "Data fine obbligatoria" }),
  monthlyRate: z
    .number({ error: "Canone mensile obbligatorio" })
    .positive({ error: "Il canone mensile deve essere positivo" }),
  franchiseKm: z
    .number()
    .int({ error: "I km in franchigia devono essere un numero intero" })
    .positive({ error: "I km in franchigia devono essere positivi" })
    .optional(),
  extraKmPenalty: z
    .number()
    .positive({ error: "La penale extra km deve essere positiva" })
    .optional(),
  includedServices: z
    .string()
    .max(2000, {
      error: "I servizi inclusi non possono superare 2000 caratteri",
    })
    .optional()
    .transform((val) => (val === "" ? undefined : val)),
});

const updateLeasingFinanziarioSchema = updateBase.extend({
  type: z.literal("LEASING_FINANZIARIO"),
  supplierId: z.string().min(1, { error: "Il fornitore e obbligatorio" }),
  startDate: z.coerce.date({ error: "Data inizio obbligatoria" }),
  endDate: z.coerce.date({ error: "Data fine obbligatoria" }),
  monthlyRate: z
    .number({ error: "Canone mensile obbligatorio" })
    .positive({ error: "Il canone mensile deve essere positivo" }),
  buybackValue: z
    .number()
    .positive({ error: "Il valore di riscatto deve essere positivo" })
    .optional(),
  maxDiscount: z
    .number()
    .nonnegative({ error: "Lo sconto massimo non puo essere negativo" })
    .optional(),
});

export const updateContractSchema = z
  .discriminatedUnion("type", [
    updateProprietarioSchema,
    updateBreveTermineSchema,
    updateLungoTermineSchema,
    updateLeasingFinanziarioSchema,
  ])
  .superRefine((data, ctx) => {
    if (
      "startDate" in data &&
      "endDate" in data &&
      data.startDate &&
      data.endDate
    ) {
      if (data.endDate <= data.startDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "La data fine deve essere successiva alla data inizio",
          path: ["endDate"],
        });
      }
    }
  });

export type UpdateContractInput = z.input<typeof updateContractSchema>;

// ---------------------------------------------------------------------------
// Filter schema for list view
// ---------------------------------------------------------------------------

export const contractFilterSchema = z.object({
  search: z.string().optional(),
  type: z
    .enum(CONTRACT_TYPE_VALUES as unknown as [string, ...string[]])
    .optional(),
  status: z
    .enum(CONTRACT_STATUS_VALUES as unknown as [string, ...string[]])
    .optional(),
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(DEFAULT_PAGE_SIZE),
  sortBy: z
    .enum(["createdAt", "startDate", "endDate", "purchaseDate", "type", "status"])
    .optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
});

export type ContractFilterInput = z.infer<typeof contractFilterSchema>;
