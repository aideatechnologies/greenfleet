import { z } from "zod";
import { DEFAULT_PAGE_SIZE } from "@/lib/utils/constants";
import { CONTRACT_TYPE_VALUES, CONTRACT_STATUS_VALUES } from "@/types/contract";

// ---------------------------------------------------------------------------
// Factory function for i18n
// ---------------------------------------------------------------------------

type T = (key: string) => string;

const IT: Record<string, string> = {
  vehicleRequired: "Il veicolo e obbligatorio",
  contractNumberRequired: "Il numero contratto e obbligatorio",
  contractNumberMax: "Il numero contratto non puo superare 100 caratteri",
  contractKmInt: "I km contratto devono essere un numero intero",
  contractKmNonnegative: "I km contratto non possono essere negativi",
  notesMax: "Le note non possono superare 1000 caratteri",
  purchaseDateRequired: "Data acquisto obbligatoria",
  purchasePriceRequired: "Prezzo obbligatorio",
  purchasePricePositive: "Il prezzo deve essere positivo",
  residualValueNonnegative: "Il valore residuo non puo essere negativo",
  supplierRequired: "Il fornitore e obbligatorio",
  startDateRequired: "Data inizio obbligatoria",
  endDateRequired: "Data fine obbligatoria",
  dailyRateRequired: "Canone giornaliero obbligatorio",
  dailyRatePositive: "Il canone giornaliero deve essere positivo",
  includedKmInt: "I km inclusi devono essere un numero intero",
  includedKmPositive: "I km inclusi devono essere positivi",
  monthlyRateRequired: "Canone mensile obbligatorio",
  monthlyRatePositive: "Il canone mensile deve essere positivo",
  franchiseKmInt: "I km in franchigia devono essere un numero intero",
  franchiseKmPositive: "I km in franchigia devono essere positivi",
  extraKmPenaltyPositive: "La penale extra km deve essere positiva",
  includedServicesMax: "I servizi inclusi non possono superare 2000 caratteri",
  buybackValuePositive: "Il valore di riscatto deve essere positivo",
  maxDiscountNonnegative: "Lo sconto massimo non puo essere negativo",
  endDateAfterStart: "La data fine deve essere successiva alla data inizio",
};

const itFallback: T = (k) => IT[k] ?? k;

// ---------------------------------------------------------------------------
// Base fields shared by all contract types
// ---------------------------------------------------------------------------

function buildContractBase(t: T) {
  return z.object({
    vehicleId: z.coerce.number({ error: t("vehicleRequired") }),
    contractNumber: z
      .string()
      .min(1, { error: t("contractNumberRequired") })
      .max(100, { error: t("contractNumberMax") }),
    contractKm: z
      .number()
      .int({ error: t("contractKmInt") })
      .nonnegative({ error: t("contractKmNonnegative") })
      .nullable()
      .optional(),
    notes: z
      .string()
      .max(1000, { error: t("notesMax") })
      .optional()
      .transform((val) => (val === "" ? undefined : val)),
  });
}

// ---------------------------------------------------------------------------
// Type-specific schemas (without refine, for discriminatedUnion)
// ---------------------------------------------------------------------------

function buildProprietarioSchema(t: T) {
  return buildContractBase(t).extend({
    type: z.literal("PROPRIETARIO"),
    purchaseDate: z.coerce.date({ error: t("purchaseDateRequired") }),
    purchasePrice: z
      .number({ error: t("purchasePriceRequired") })
      .positive({ error: t("purchasePricePositive") }),
    residualValue: z
      .number()
      .nonnegative({ error: t("residualValueNonnegative") })
      .optional(),
  });
}

function buildBreveTermineSchema(t: T) {
  return buildContractBase(t).extend({
    type: z.literal("BREVE_TERMINE"),
    supplierId: z.coerce.number({ error: t("supplierRequired") }),
    startDate: z.coerce.date({ error: t("startDateRequired") }),
    endDate: z.coerce.date({ error: t("endDateRequired") }),
    dailyRate: z
      .number({ error: t("dailyRateRequired") })
      .positive({ error: t("dailyRatePositive") }),
    includedKm: z
      .number()
      .int({ error: t("includedKmInt") })
      .positive({ error: t("includedKmPositive") })
      .optional(),
  });
}

function buildLungoTermineSchema(t: T) {
  return buildContractBase(t).extend({
    type: z.literal("LUNGO_TERMINE"),
    supplierId: z.coerce.number({ error: t("supplierRequired") }),
    startDate: z.coerce.date({ error: t("startDateRequired") }),
    endDate: z.coerce.date({ error: t("endDateRequired") }),
    monthlyRate: z
      .number({ error: t("monthlyRateRequired") })
      .positive({ error: t("monthlyRatePositive") }),
    franchiseKm: z
      .number()
      .int({ error: t("franchiseKmInt") })
      .positive({ error: t("franchiseKmPositive") })
      .optional(),
    extraKmPenalty: z
      .number()
      .positive({ error: t("extraKmPenaltyPositive") })
      .optional(),
    includedServices: z
      .string()
      .max(2000, {
        error: t("includedServicesMax"),
      })
      .optional()
      .transform((val) => (val === "" ? undefined : val)),
  });
}

function buildLeasingFinanziarioSchema(t: T) {
  return buildContractBase(t).extend({
    type: z.literal("LEASING_FINANZIARIO"),
    supplierId: z.coerce.number({ error: t("supplierRequired") }),
    startDate: z.coerce.date({ error: t("startDateRequired") }),
    endDate: z.coerce.date({ error: t("endDateRequired") }),
    monthlyRate: z
      .number({ error: t("monthlyRateRequired") })
      .positive({ error: t("monthlyRatePositive") }),
    buybackValue: z
      .number()
      .positive({ error: t("buybackValuePositive") })
      .optional(),
    maxDiscount: z
      .number()
      .nonnegative({ error: t("maxDiscountNonnegative") })
      .optional(),
  });
}

// ---------------------------------------------------------------------------
// Discriminated union with date cross-validation
// ---------------------------------------------------------------------------

function addDateRefinement<S extends z.ZodTypeAny>(schema: S, t: T) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return schema.superRefine((data: any, ctx: z.RefinementCtx) => {
    if (
      "startDate" in data &&
      "endDate" in data &&
      data.startDate &&
      data.endDate
    ) {
      if ((data.endDate as Date) <= (data.startDate as Date)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: t("endDateAfterStart"),
          path: ["endDate"],
        });
      }
    }
  });
}

export function buildContractSchema(t: T = itFallback) {
  return addDateRefinement(
    z.discriminatedUnion("type", [
      buildProprietarioSchema(t),
      buildBreveTermineSchema(t),
      buildLungoTermineSchema(t),
      buildLeasingFinanziarioSchema(t),
    ]),
    t
  );
}

// ---------------------------------------------------------------------------
// Update schema — same as create but vehicleId and type are not changeable
// ---------------------------------------------------------------------------

function buildUpdateBase(t: T) {
  return z.object({
    contractNumber: z
      .string()
      .min(1, { error: t("contractNumberRequired") })
      .max(100, { error: t("contractNumberMax") }),
    contractKm: z
      .number()
      .int({ error: t("contractKmInt") })
      .nonnegative({ error: t("contractKmNonnegative") })
      .nullable()
      .optional(),
    notes: z
      .string()
      .max(1000, { error: t("notesMax") })
      .optional()
      .transform((val) => (val === "" ? undefined : val)),
  });
}

function buildUpdateProprietarioSchema(t: T) {
  return buildUpdateBase(t).extend({
    type: z.literal("PROPRIETARIO"),
    purchaseDate: z.coerce.date({ error: t("purchaseDateRequired") }),
    purchasePrice: z
      .number({ error: t("purchasePriceRequired") })
      .positive({ error: t("purchasePricePositive") }),
    residualValue: z
      .number()
      .nonnegative({ error: t("residualValueNonnegative") })
      .optional(),
  });
}

function buildUpdateBreveTermineSchema(t: T) {
  return buildUpdateBase(t).extend({
    type: z.literal("BREVE_TERMINE"),
    supplierId: z.coerce.number({ error: t("supplierRequired") }),
    startDate: z.coerce.date({ error: t("startDateRequired") }),
    endDate: z.coerce.date({ error: t("endDateRequired") }),
    dailyRate: z
      .number({ error: t("dailyRateRequired") })
      .positive({ error: t("dailyRatePositive") }),
    includedKm: z
      .number()
      .int({ error: t("includedKmInt") })
      .positive({ error: t("includedKmPositive") })
      .optional(),
  });
}

function buildUpdateLungoTermineSchema(t: T) {
  return buildUpdateBase(t).extend({
    type: z.literal("LUNGO_TERMINE"),
    supplierId: z.coerce.number({ error: t("supplierRequired") }),
    startDate: z.coerce.date({ error: t("startDateRequired") }),
    endDate: z.coerce.date({ error: t("endDateRequired") }),
    monthlyRate: z
      .number({ error: t("monthlyRateRequired") })
      .positive({ error: t("monthlyRatePositive") }),
    franchiseKm: z
      .number()
      .int({ error: t("franchiseKmInt") })
      .positive({ error: t("franchiseKmPositive") })
      .optional(),
    extraKmPenalty: z
      .number()
      .positive({ error: t("extraKmPenaltyPositive") })
      .optional(),
    includedServices: z
      .string()
      .max(2000, {
        error: t("includedServicesMax"),
      })
      .optional()
      .transform((val) => (val === "" ? undefined : val)),
  });
}

function buildUpdateLeasingFinanziarioSchema(t: T) {
  return buildUpdateBase(t).extend({
    type: z.literal("LEASING_FINANZIARIO"),
    supplierId: z.coerce.number({ error: t("supplierRequired") }),
    startDate: z.coerce.date({ error: t("startDateRequired") }),
    endDate: z.coerce.date({ error: t("endDateRequired") }),
    monthlyRate: z
      .number({ error: t("monthlyRateRequired") })
      .positive({ error: t("monthlyRatePositive") }),
    buybackValue: z
      .number()
      .positive({ error: t("buybackValuePositive") })
      .optional(),
    maxDiscount: z
      .number()
      .nonnegative({ error: t("maxDiscountNonnegative") })
      .optional(),
  });
}

export function buildUpdateContractSchema(t: T = itFallback) {
  return addDateRefinement(
    z.discriminatedUnion("type", [
      buildUpdateProprietarioSchema(t),
      buildUpdateBreveTermineSchema(t),
      buildUpdateLungoTermineSchema(t),
      buildUpdateLeasingFinanziarioSchema(t),
    ]),
    t
  );
}

// ---------------------------------------------------------------------------
// Default instances (Italian) — backward compatible
// ---------------------------------------------------------------------------

export const contractSchema = buildContractSchema();
export type ContractInput = z.input<typeof contractSchema>;

export const updateContractSchema = buildUpdateContractSchema();
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
