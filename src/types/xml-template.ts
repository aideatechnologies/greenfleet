// ---------------------------------------------------------------------------
// Extraction method — how a field value is extracted from an XML node
// ---------------------------------------------------------------------------

export type ExtractionMethod = "XPATH" | "REGEX" | "XPATH_REGEX" | "STATIC";

// ---------------------------------------------------------------------------
// Regex pattern — single pattern within a multi-pattern set
// ---------------------------------------------------------------------------

export type RegexPattern = {
  /** Human-readable label */
  label?: string;
  /** Regex pattern string */
  regex: string;
  /** Capture group index (default: 1) */
  regexGroup?: number;
  /** Per-pattern transform (overrides rule-level) */
  transform?: "uppercase" | "lowercase" | "trim";
};

// ---------------------------------------------------------------------------
// Field extraction rule — defines how to extract a single field
// ---------------------------------------------------------------------------

export type FieldExtractionRule = {
  /** The extraction method */
  method: ExtractionMethod;
  /** XPath-like path to the node (dot-separated for fast-xml-parser) */
  xpath?: string;
  /** Regex pattern to apply on the extracted text (single, backward compatible) */
  regex?: string;
  /** Regex capture group index (default: 1) */
  regexGroup?: number;
  /** Ordered list of regex patterns — tried in sequence, first match wins */
  regexPatterns?: RegexPattern[];
  /** Date format (for date fields), e.g. "yyyy-MM-dd", "dd/MM/yyyy" */
  dateFormat?: string;
  /** Static value (for STATIC method) */
  staticValue?: string;
  /** Optional transform: "uppercase" | "lowercase" | "trim" */
  transform?: "uppercase" | "lowercase" | "trim";
};

// ---------------------------------------------------------------------------
// Line filter — include/exclude lines based on criteria
// ---------------------------------------------------------------------------

export type LineFilter = {
  /** Dot-path to the field to check */
  fieldPath?: string;
  /** Regex to match */
  regex?: string;
  /** include = keep only matching; exclude = remove matching */
  action: "include" | "exclude";
};

// ---------------------------------------------------------------------------
// TemplateConfig — full configuration for XML extraction
// ---------------------------------------------------------------------------

export type TemplateConfig = {
  /** Config version for future migrations */
  version: number;
  /** XML namespace prefix if needed */
  namespace?: string;
  /** Dot-path to the array of line items in the XML tree */
  lineXpath: string;
  /** Field extraction rules mapped by target field name */
  fields: {
    licensePlate?: FieldExtractionRule;
    date?: FieldExtractionRule;
    fuelType?: FieldExtractionRule;
    quantity?: FieldExtractionRule;
    amount?: FieldExtractionRule;
    cardNumber?: FieldExtractionRule;
    odometerKm?: FieldExtractionRule;
    description?: FieldExtractionRule;
    unitPrice?: FieldExtractionRule;
  };
  /** Line filters to include/exclude specific lines */
  lineFilters?: LineFilter[];
  /** Supplier detection config */
  supplierDetection?: {
    /** Dot-path to the supplier VAT number in the XML */
    vatNumberPath?: string;
  };
  /** Invoice metadata extraction */
  invoiceMetadata?: {
    /** Dot-path to invoice number */
    invoiceNumberPath?: string;
    /** Dot-path to invoice date */
    invoiceDatePath?: string;
    /** Date format for invoice date */
    invoiceDateFormat?: string;
  };
};

// ---------------------------------------------------------------------------
// MatchingTolerances — used by the matching service (Fase 4)
// ---------------------------------------------------------------------------

export type MatchingTolerances = {
  /** How many days of tolerance when matching dates */
  dateToleranceDays: number;
  /** Percentage tolerance for quantity matching */
  quantityTolerancePercent: number;
  /** Percentage tolerance for amount matching */
  amountTolerancePercent: number;
  /** Score threshold for automatic matching (0-1) */
  autoMatchThreshold: number;
  /** Weights for scoring components */
  weights: {
    licensePlate: number;
    date: number;
    quantity: number;
    amount: number;
    fuelType: number;
  };
};

// ---------------------------------------------------------------------------
// Default regex patterns for common Italian document fields
// ---------------------------------------------------------------------------

export type RegexPatternInfo = {
  /** Human-readable label */
  label: string;
  /** The regex pattern string */
  pattern: string;
  /** Description of what this pattern matches */
  description: string;
  /** Example matches */
  examples: string[];
};

export const DEFAULT_REGEX_PATTERNS: Record<string, RegexPatternInfo> = {
  // -- Date patterns --
  dateISO: {
    label: "Data ISO (yyyy-MM-dd)",
    pattern: "(\\d{4}-\\d{2}-\\d{2})",
    description: "Data in formato ISO: 2024-01-15",
    examples: ["2024-01-15", "2025-12-31"],
  },
  dateItalian: {
    label: "Data italiana (dd/MM/yyyy)",
    pattern: "(\\d{1,2}[/\\-.]\\d{1,2}[/\\-.]\\d{4})",
    description: "Data in formato italiano: 15/01/2024, 15-01-2024, 15.01.2024",
    examples: ["15/01/2024", "1-3-2025", "31.12.2024"],
  },
  dateItalianShort: {
    label: "Data italiana breve (dd/MM/yy)",
    pattern: "(\\d{1,2}[/\\-.]\\d{1,2}[/\\-.]\\d{2})",
    description: "Data in formato italiano breve: 15/01/24",
    examples: ["15/01/24", "1-3-25"],
  },
  dateCompact: {
    label: "Data compatta (yyyyMMdd)",
    pattern: "(\\d{8})",
    description: "Data senza separatori: 20240115",
    examples: ["20240115", "20251231"],
  },

  // -- Numeric patterns --
  amount: {
    label: "Importo (EUR)",
    pattern: "([\\d.,]+)",
    description: "Cifra numerica con separatori: 1.234,56 o 1234.56",
    examples: ["1.234,56", "1234.56", "99,99"],
  },
  amountWithCurrency: {
    label: "Importo con valuta",
    pattern: "(?:EUR|\\u20AC)?\\s*([\\d.,]+)",
    description: "Importo con eventuale prefisso EUR o simbolo euro",
    examples: ["EUR 1.234,56", "1234.56"],
  },
  integerNumber: {
    label: "Numero intero",
    pattern: "(\\d+)",
    description: "Sequenza di sole cifre",
    examples: ["12345", "0", "999999"],
  },
  decimalNumber: {
    label: "Numero decimale",
    pattern: "(\\d+[.,]\\d+)",
    description: "Numero con decimali (punto o virgola)",
    examples: ["12.50", "1234,56", "0.5"],
  },

  // -- Italian fiscal identifiers --
  codiceFiscale: {
    label: "Codice Fiscale",
    pattern: "([A-Z]{6}\\d{2}[A-Z]\\d{2}[A-Z]\\d{3}[A-Z])",
    description: "Codice fiscale italiano (16 caratteri alfanumerici)",
    examples: ["RSSMRA85M01H501Z"],
  },
  partitaIVA: {
    label: "Partita IVA",
    pattern: "(\\d{11})",
    description: "Partita IVA italiana (11 cifre)",
    examples: ["01234567890", "08510870960"],
  },
  partitaIVAWithPrefix: {
    label: "Partita IVA con prefisso IT",
    pattern: "(?:IT)?(\\d{11})",
    description: "Partita IVA con eventuale prefisso IT",
    examples: ["IT01234567890", "01234567890"],
  },

  // -- Vehicle identifiers --
  targaItaliana: {
    label: "Targa italiana",
    pattern: "([A-Z]{2}\\s?\\d{3}\\s?[A-Z]{2})",
    description: "Targa italiana formato nuovo: AB123CD o AB 123 CD",
    examples: ["GA727GS", "AB 123 CD", "FH432NB"],
  },
  targaItalianaDaDescrizione: {
    label: "Targa in testo descrittivo",
    pattern: "(?:targa|plate|veicolo)[:\\s]*([A-Za-z]{2}\\s?\\d{3}\\s?[A-Za-z]{2})",
    description: "Estrae la targa da testo con prefisso 'targa:', 'plate:', 'veicolo:'",
    examples: ["targa: GA727GS", "veicolo AB123CD"],
  },
  targaCardNumber: {
    label: "Targa da numero carta carburante",
    pattern: "\\d+-([A-Z]{2}\\d{3}[A-Z]{2})",
    description: "Estrae la targa dal formato numero carta-targa (es. ESSO: 7033167200254244329-GA727GS)",
    examples: ["7033167200254244329-GA727GS"],
  },
  telaio: {
    label: "Numero di telaio (VIN)",
    pattern: "([A-HJ-NPR-Z0-9]{17})",
    description: "Vehicle Identification Number: 17 caratteri alfanumerici (esclusi I, O, Q)",
    examples: ["WVWZZZ3CZWE123456", "1HGBH41JXMN109186"],
  },
};

// ---------------------------------------------------------------------------
// Default matching config
// ---------------------------------------------------------------------------

export const DEFAULT_MATCHING_CONFIG: MatchingTolerances = {
  dateToleranceDays: 2,
  quantityTolerancePercent: 5,
  amountTolerancePercent: 5,
  autoMatchThreshold: 0.85,
  weights: {
    licensePlate: 0.35,
    date: 0.25,
    quantity: 0.2,
    amount: 0.15,
    fuelType: 0.05,
  },
};

// ---------------------------------------------------------------------------
// Extracted line — result of extraction from XML
// ---------------------------------------------------------------------------

export type ExtractedLine = {
  lineNumber: number;
  licensePlate?: string | null;
  date?: string | null;
  fuelType?: string | null;
  quantity?: number | null;
  amount?: number | null;
  cardNumber?: string | null;
  odometerKm?: number | null;
  description?: string | null;
  unitPrice?: number | null;
  rawXml?: string;
  errors?: string[];
};

// ---------------------------------------------------------------------------
// Extraction result — complete result of template extraction
// ---------------------------------------------------------------------------

export type ExtractionResult = {
  success: boolean;
  lines: ExtractedLine[];
  totalLines: number;
  filteredLines: number;
  errors: string[];
  invoiceMetadata?: {
    invoiceNumber?: string;
    invoiceDate?: string;
    supplierVatNumber?: string;
  };
};

// ---------------------------------------------------------------------------
// XML tree node — simplified representation for the UI tree viewer
// ---------------------------------------------------------------------------

export type XmlTreeNode = {
  name: string;
  path: string;
  attributes?: Record<string, string>;
  text?: string;
  children?: XmlTreeNode[];
  /** How many sibling nodes share this name (for arrays) */
  count?: number;
};
