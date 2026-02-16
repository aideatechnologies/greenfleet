import { XMLParser } from "fast-xml-parser";
import type {
  TemplateConfig,
  FieldExtractionRule,
  ExtractedLine,
  ExtractionResult,
  XmlTreeNode,
} from "@/types/xml-template";

// ---------------------------------------------------------------------------
// XML Parser — parse FatturaPA XML to JS object
// ---------------------------------------------------------------------------

const parserOptions = {
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  textNodeName: "#text",
  parseAttributeValue: false,
  parseTagValue: false, // Keep all values as strings — preserves leading zeros in P.IVA, invoice numbers, etc.
  trimValues: true,
  isArray: (_name: string, _jpath: string, isLeafNode: boolean) => {
    // Force arrays for known repeating elements
    if (!isLeafNode) return false;
    return false;
  },
};

export function parseXml(xmlString: string): Record<string, unknown> {
  const parser = new XMLParser(parserOptions);
  return parser.parse(xmlString) as Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// XML Tree Structure — for UI tree viewer
// ---------------------------------------------------------------------------

export function getXmlTreeStructure(xmlString: string): XmlTreeNode[] {
  const parsed = parseXml(xmlString);
  return buildTree(parsed, "");
}

function buildTree(
  obj: unknown,
  parentPath: string
): XmlTreeNode[] {
  if (obj === null || obj === undefined || typeof obj !== "object") {
    return [];
  }

  const nodes: XmlTreeNode[] = [];

  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    // Skip XML declaration and processing instructions
    if (key === "?xml" || key.startsWith("?")) continue;

    const currentPath = parentPath ? `${parentPath}.${key}` : key;

    if (key.startsWith("@_")) {
      // Attributes are handled by parent
      continue;
    }

    if (key === "#text") {
      // Text content is handled by parent
      continue;
    }

    if (Array.isArray(value)) {
      // Array of elements — show first item as representative
      const firstItem = value[0];
      const node: XmlTreeNode = {
        name: key,
        path: `${currentPath}[0]`,
        count: value.length,
        children: typeof firstItem === "object" && firstItem !== null
          ? buildTree(firstItem, `${currentPath}[0]`)
          : undefined,
        text: typeof firstItem === "string" || typeof firstItem === "number"
          ? String(firstItem)
          : undefined,
      };

      // Extract attributes from first item
      if (typeof firstItem === "object" && firstItem !== null) {
        const attrs = extractAttributes(firstItem as Record<string, unknown>);
        if (Object.keys(attrs).length > 0) node.attributes = attrs;
        const text = (firstItem as Record<string, unknown>)["#text"];
        if (text !== undefined) node.text = String(text);
      }

      nodes.push(node);
    } else if (typeof value === "object" && value !== null) {
      const node: XmlTreeNode = {
        name: key,
        path: currentPath,
        children: buildTree(value, currentPath),
      };

      const attrs = extractAttributes(value as Record<string, unknown>);
      if (Object.keys(attrs).length > 0) node.attributes = attrs;
      const text = (value as Record<string, unknown>)["#text"];
      if (text !== undefined) node.text = String(text);

      nodes.push(node);
    } else {
      // Leaf node (string, number, boolean)
      nodes.push({
        name: key,
        path: currentPath,
        text: value !== undefined ? String(value) : undefined,
      });
    }
  }

  return nodes;
}

function extractAttributes(obj: Record<string, unknown>): Record<string, string> {
  const attrs: Record<string, string> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (key.startsWith("@_")) {
      attrs[key.substring(2)] = String(value);
    }
  }
  return attrs;
}

// ---------------------------------------------------------------------------
// Navigate dot-path in parsed XML object
// ---------------------------------------------------------------------------

function navigatePath(obj: unknown, path: string): unknown {
  if (!path) return obj;

  const parts = path.split(".");
  let current: unknown = obj;

  for (const part of parts) {
    if (current === null || current === undefined) return undefined;

    // Handle array index: "DettaglioLinee[0]"
    const arrayMatch = part.match(/^(.+)\[(\d+)\]$/);
    if (arrayMatch) {
      const [, name, indexStr] = arrayMatch;
      const container = (current as Record<string, unknown>)[name];
      if (Array.isArray(container)) {
        current = container[parseInt(indexStr, 10)];
      } else {
        current = container;
      }
    } else {
      current = (current as Record<string, unknown>)[part];
    }
  }

  return current;
}

// ---------------------------------------------------------------------------
// Extract a single field from a node using a FieldExtractionRule
// ---------------------------------------------------------------------------

export function extractField(
  node: unknown,
  rule: FieldExtractionRule,
  rootObj?: unknown
): string | null {
  if (rule.method === "STATIC") {
    return rule.staticValue ?? null;
  }

  let text: string | null = null;

  // XPATH or XPATH_REGEX — get text from path
  if (rule.method === "XPATH" || rule.method === "XPATH_REGEX") {
    const target = rule.xpath
      ? navigatePath(node, rule.xpath)
      : node;

    if (target === null || target === undefined) return null;

    if (typeof target === "object") {
      // Might be an element with #text
      text = String((target as Record<string, unknown>)["#text"] ?? "");
      if (!text) {
        // Try to get any string value
        const values = Object.entries(target as Record<string, unknown>)
          .filter(([k]) => !k.startsWith("@_"))
          .map(([, v]) => v);
        if (values.length === 1 && typeof values[0] === "string") {
          text = values[0];
        }
      }
    } else {
      text = String(target);
    }
  }

  // REGEX or XPATH_REGEX — apply regex
  if (rule.method === "REGEX") {
    // For REGEX-only, use the root object text or node as string
    const sourceText = rootObj
      ? String(navigatePath(rootObj, rule.xpath ?? "") ?? "")
      : String(node ?? "");
    text = sourceText;
  }

  if ((rule.method === "REGEX" || rule.method === "XPATH_REGEX") && text) {
    // Multi-pattern: try each pattern in order, first match wins
    if (rule.regexPatterns && rule.regexPatterns.length > 0) {
      let matched = false;
      for (const pattern of rule.regexPatterns) {
        try {
          const match = new RegExp(pattern.regex).exec(text);
          if (match) {
            text = match[pattern.regexGroup ?? 1] ?? match[0];
            if (pattern.transform) {
              switch (pattern.transform) {
                case "uppercase": text = text.toUpperCase(); break;
                case "lowercase": text = text.toLowerCase(); break;
                case "trim": text = text.trim(); break;
              }
            }
            matched = true;
            break;
          }
        } catch {
          // Invalid regex, skip to next pattern
        }
      }
      if (!matched) return null;
    } else if (rule.regex) {
      // Backward compatible: single regex
      try {
        const match = new RegExp(rule.regex).exec(text);
        if (match) {
          text = match[rule.regexGroup ?? 1] ?? match[0];
        } else {
          return null;
        }
      } catch {
        return null;
      }
    }
  }

  // Apply transform
  if (text && rule.transform) {
    switch (rule.transform) {
      case "uppercase":
        text = text.toUpperCase();
        break;
      case "lowercase":
        text = text.toLowerCase();
        break;
      case "trim":
        text = text.trim();
        break;
    }
  }

  return text || null;
}

// ---------------------------------------------------------------------------
// Extract lines from XML using a TemplateConfig
// ---------------------------------------------------------------------------

export function extractLinesFromXml(
  xmlString: string,
  config: TemplateConfig
): ExtractionResult {
  const errors: string[] = [];

  let parsed: Record<string, unknown>;
  try {
    parsed = parseXml(xmlString);
  } catch (e) {
    return {
      success: false,
      lines: [],
      totalLines: 0,
      filteredLines: 0,
      errors: [`Errore parsing XML: ${e instanceof Error ? e.message : String(e)}`],
    };
  }

  // Extract invoice metadata
  const invoiceMetadata: ExtractionResult["invoiceMetadata"] = {};
  if (config.invoiceMetadata?.invoiceNumberPath) {
    const num = navigatePath(parsed, config.invoiceMetadata.invoiceNumberPath);
    if (num) invoiceMetadata.invoiceNumber = String(num);
  }
  if (config.invoiceMetadata?.invoiceDatePath) {
    const date = navigatePath(parsed, config.invoiceMetadata.invoiceDatePath);
    if (date) invoiceMetadata.invoiceDate = String(date);
  }
  if (config.supplierDetection?.vatNumberPath) {
    const vat = navigatePath(parsed, config.supplierDetection.vatNumberPath);
    if (vat) invoiceMetadata.supplierVatNumber = String(vat);
  }

  // Navigate to the line items
  const lineItems = navigatePath(parsed, config.lineXpath);
  if (!lineItems) {
    return {
      success: false,
      lines: [],
      totalLines: 0,
      filteredLines: 0,
      errors: [`Nessun elemento trovato al percorso: ${config.lineXpath}`],
      invoiceMetadata,
    };
  }

  const items = Array.isArray(lineItems) ? lineItems : [lineItems];
  const totalLines = items.length;

  // Extract fields from each line
  let lines: ExtractedLine[] = items.map((item, index) => {
    const line: ExtractedLine = {
      lineNumber: index + 1,
      errors: [],
    };

    for (const [fieldName, rule] of Object.entries(config.fields)) {
      if (!rule) continue;

      try {
        const value = extractField(item, rule, parsed);

        switch (fieldName) {
          case "licensePlate":
            line.licensePlate = value?.toUpperCase() ?? null;
            break;
          case "date":
            line.date = value;
            break;
          case "fuelType":
            line.fuelType = value;
            break;
          case "quantity":
            line.quantity = value ? parseFloat(value.replace(",", ".")) : null;
            break;
          case "amount":
            line.amount = value ? parseFloat(value.replace(",", ".")) : null;
            break;
          case "cardNumber":
            line.cardNumber = value;
            break;
          case "odometerKm":
            line.odometerKm = value ? parseInt(value.replace(/\D/g, ""), 10) : null;
            break;
          case "description":
            line.description = value;
            break;
          case "unitPrice":
            line.unitPrice = value ? parseFloat(value.replace(",", ".")) : null;
            break;
        }
      } catch (e) {
        line.errors!.push(
          `Campo ${fieldName}: ${e instanceof Error ? e.message : String(e)}`
        );
      }
    }

    return line;
  });

  // Apply line filters
  if (config.lineFilters && config.lineFilters.length > 0) {
    for (const filter of config.lineFilters) {
      if (!filter.fieldPath || !filter.regex) continue;

      try {
        const re = new RegExp(filter.regex, "i");

        lines = lines.filter((line) => {
          // Get field value from the extracted line
          const value = getLineFieldValue(line, filter.fieldPath!);
          const matches = value ? re.test(value) : false;

          return filter.action === "include" ? matches : !matches;
        });
      } catch {
        errors.push(`Filtro regex non valido: ${filter.regex}`);
      }
    }
  }

  return {
    success: true,
    lines,
    totalLines,
    filteredLines: totalLines - lines.length,
    errors,
    invoiceMetadata,
  };
}

function getLineFieldValue(line: ExtractedLine, fieldPath: string): string | null {
  switch (fieldPath) {
    case "licensePlate": return line.licensePlate ?? null;
    case "date": return line.date ?? null;
    case "fuelType": return line.fuelType ?? null;
    case "quantity": return line.quantity?.toString() ?? null;
    case "amount": return line.amount?.toString() ?? null;
    case "cardNumber": return line.cardNumber ?? null;
    case "odometerKm": return line.odometerKm?.toString() ?? null;
    case "description": return line.description ?? null;
    default: return null;
  }
}

// ---------------------------------------------------------------------------
// Auto-detect supplier VAT number from FatturaPA
// ---------------------------------------------------------------------------

/** All known FatturaPA namespace prefixes */
const FATTURAPA_ROOTS = [
  "FatturaElettronica",
  "p:FatturaElettronica",
  "ns0:FatturaElettronica",
  "ns1:FatturaElettronica",
  "ns2:FatturaElettronica",
];

/** Standard FatturaPA paths for supplier VAT number */
const FATTURAPA_VAT_PATHS = FATTURAPA_ROOTS.map(
  (root) =>
    `${root}.FatturaElettronicaHeader.CedentePrestatore.DatiAnagrafici.IdFiscaleIVA.IdCodice`
);

export function autoDetectSupplierVat(xmlString: string): string | null {
  const parsed = parseXml(xmlString);

  for (const path of FATTURAPA_VAT_PATHS) {
    const value = navigatePath(parsed, path);
    if (value && typeof value === "string") {
      return value;
    }
    if (value && typeof value === "number") {
      return String(value);
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Auto-detect FatturaPA line items path and structure
// ---------------------------------------------------------------------------

export type FatturaDetection = {
  root: string;
  lineXpath: string;
  hasAltriDatiGestionaliTarga: boolean;
  hasDataInizioPeriodo: boolean;
  hasDescrizione: boolean;
  hasQuantita: boolean;
  supplierVat: string | null;
  supplierName: string | null;
  invoiceNumber: string | null;
  invoiceDate: string | null;
  sampleLineCount: number;
};

/**
 * Analizza un XML FatturaPA e rileva automaticamente la struttura,
 * i percorsi delle righe e i campi disponibili per l'estrazione.
 */
export function autoDetectFatturaPA(xmlString: string): FatturaDetection | null {
  const parsed = parseXml(xmlString);

  for (const root of FATTURAPA_ROOTS) {
    const lineXpath = `${root}.FatturaElettronicaBody.DatiBeniServizi.DettaglioLinee`;
    const lines = navigatePath(parsed, lineXpath);
    if (!lines) continue;

    const items = Array.isArray(lines) ? lines : [lines];
    if (items.length === 0) continue;

    // Analisi della prima riga
    const firstLine = items[0] as Record<string, unknown>;

    const hasAltriDati = firstLine?.AltriDatiGestionali != null;
    let hasAltriDatiGestionaliTarga = false;
    if (hasAltriDati) {
      const altriDati = firstLine.AltriDatiGestionali;
      if (typeof altriDati === "object" && altriDati !== null) {
        const tipoDato = (altriDati as Record<string, unknown>)?.TipoDato;
        hasAltriDatiGestionaliTarga = tipoDato === "TARGA";
      }
    }

    const hasDataInizioPeriodo = firstLine?.DataInizioPeriodo != null;
    const hasDescrizione = firstLine?.Descrizione != null;
    const hasQuantita = firstLine?.Quantita != null;

    // Supplier info
    const headerBase = `${root}.FatturaElettronicaHeader`;
    const supplierVat = (() => {
      const v = navigatePath(parsed, `${headerBase}.CedentePrestatore.DatiAnagrafici.IdFiscaleIVA.IdCodice`);
      return v ? String(v) : null;
    })();
    const supplierName = (() => {
      const v = navigatePath(parsed, `${headerBase}.CedentePrestatore.DatiAnagrafici.Anagrafica.Denominazione`);
      return v ? String(v) : null;
    })();
    const invoiceNumber = (() => {
      const v = navigatePath(parsed, `${root}.FatturaElettronicaBody.DatiGenerali.DatiGeneraliDocumento.Numero`);
      return v ? String(v) : null;
    })();
    const invoiceDate = (() => {
      const v = navigatePath(parsed, `${root}.FatturaElettronicaBody.DatiGenerali.DatiGeneraliDocumento.Data`);
      return v ? String(v) : null;
    })();

    return {
      root,
      lineXpath,
      hasAltriDatiGestionaliTarga,
      hasDataInizioPeriodo,
      hasDescrizione,
      hasQuantita,
      supplierVat,
      supplierName,
      invoiceNumber,
      invoiceDate,
      sampleLineCount: items.length,
    };
  }

  return null;
}

/**
 * Genera una TemplateConfig automatica per una FatturaPA
 * basandosi sulla struttura rilevata.
 */
export function generateTemplateConfig(detection: FatturaDetection): TemplateConfig {
  const config: TemplateConfig = {
    version: 1,
    lineXpath: detection.lineXpath,
    fields: {},
    supplierDetection: {
      vatNumberPath: `${detection.root}.FatturaElettronicaHeader.CedentePrestatore.DatiAnagrafici.IdFiscaleIVA.IdCodice`,
    },
    invoiceMetadata: {
      invoiceNumberPath: `${detection.root}.FatturaElettronicaBody.DatiGenerali.DatiGeneraliDocumento.Numero`,
      invoiceDatePath: `${detection.root}.FatturaElettronicaBody.DatiGenerali.DatiGeneraliDocumento.Data`,
      invoiceDateFormat: "yyyy-MM-dd",
    },
  };

  // Targa: da AltriDatiGestionali o da Descrizione
  if (detection.hasAltriDatiGestionaliTarga) {
    config.fields.licensePlate = {
      method: "XPATH",
      xpath: "AltriDatiGestionali.RiferimentoTesto",
      transform: "uppercase",
    };
  } else if (detection.hasDescrizione) {
    // Tenta estrazione targa dalla descrizione (pattern carta-targa ESSO o targa standard)
    config.fields.licensePlate = {
      method: "XPATH_REGEX",
      xpath: "Descrizione",
      regex: "\\d+-([A-Z]{2}\\d{3}[A-Z]{2})",
      regexGroup: 1,
      transform: "uppercase",
    };
  }

  // Data: da DataInizioPeriodo o da Descrizione
  if (detection.hasDataInizioPeriodo) {
    config.fields.date = {
      method: "XPATH",
      xpath: "DataInizioPeriodo",
      dateFormat: "yyyy-MM-dd",
    };
  } else if (detection.hasDescrizione) {
    config.fields.date = {
      method: "XPATH_REGEX",
      xpath: "Descrizione",
      regex: "(?:in data|data|il)\\s*(\\d{1,2}[./\\-]\\d{1,2}[./\\-]\\d{2,4})",
      regexGroup: 1,
    };
  }

  // Quantita
  if (detection.hasQuantita) {
    config.fields.quantity = {
      method: "XPATH",
      xpath: "Quantita",
    };
  }

  // Importo
  config.fields.amount = {
    method: "XPATH",
    xpath: "PrezzoTotale",
  };

  // Tipo carburante da Descrizione
  if (detection.hasDescrizione) {
    config.fields.fuelType = {
      method: "XPATH",
      xpath: "Descrizione",
    };
    config.fields.description = {
      method: "XPATH",
      xpath: "Descrizione",
    };
  }

  // Prezzo unitario
  config.fields.unitPrice = {
    method: "XPATH",
    xpath: "PrezzoUnitario",
  };

  return config;
}
