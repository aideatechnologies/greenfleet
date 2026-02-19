/**
 * Seed XML templates for fuel invoice import.
 *
 * Creates supplier records (if missing) and their SupplierXmlTemplate
 * configs for the following providers:
 *   - Edenred UTA Mobility (P.IVA 01696270212)
 *   - WEX Europe Services / Esso (P.IVA 08510870960)
 *   - Kuwait Petroleum Italia / Q8 (P.IVA 00891951006)
 *
 * Run with: npx tsx scripts/seed-xml-templates.ts
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaMssql } from "@prisma/adapter-mssql";
import type { TemplateConfig, MatchingTolerances } from "../src/types/xml-template";

// ---------------------------------------------------------------------------
// Prisma client setup (same pattern as other scripts)
// ---------------------------------------------------------------------------

function parseDatabaseUrl(url: string) {
  const afterProtocol = url.replace(/^sqlserver:\/\//, "");
  const parts = afterProtocol.split(";");
  const hostPort = parts[0];
  const [host, portStr] = hostPort.split(":");

  const params: Record<string, string> = {};
  for (let i = 1; i < parts.length; i++) {
    const [key, ...valueParts] = parts[i].split("=");
    if (key) {
      params[key.toLowerCase()] = valueParts.join("=");
    }
  }

  return {
    server: host,
    port: portStr ? parseInt(portStr, 10) : 1433,
    database: params.database || "",
    user: params.user || "",
    password: params.password || "",
    options: {
      encrypt: params.encrypt === "true",
      trustServerCertificate: params.trustservercertificate === "true",
    },
  };
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set. Check your .env.local file.");
}

const config = parseDatabaseUrl(connectionString);
const adapter = new PrismaMssql(config);
const prisma = new PrismaClient({ adapter });

// ---------------------------------------------------------------------------
// Default matching config
// ---------------------------------------------------------------------------

const DEFAULT_MATCHING: MatchingTolerances = {
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
// Template definitions
// ---------------------------------------------------------------------------

type SupplierTemplate = {
  supplierName: string;
  vatNumber: string;
  templateName: string;
  templateDescription: string;
  templateConfig: TemplateConfig;
};

/**
 * EDENRED UTA Mobility — FatturaPA con prefisso p:
 *
 * Struttura DettaglioLinee:
 *   - Targa: AltriDatiGestionali.RiferimentoTesto (TipoDato=TARGA)
 *     NB: il valore può essere un alias flotta (es. "JOLLY 1")
 *   - Data: nella Descrizione (dd/MM/yyyy HH:mm:ss)
 *   - Carburante: nella Descrizione (dopo "Km:NNNNN")
 *   - Km: nella Descrizione (Km:NNNNN)
 *   - Quantità: campo Quantita
 *   - Importo: campo PrezzoTotale
 *   - Carta: campo RiferimentoAmministrazione
 *
 * Esempio Descrizione:
 *   "17/12/2024 18:38:00 AGIP Roma (RM) Agip JOLLY 1 Km:22947 SUPER 95 16,41 lt 28,37Eu."
 */
const edenredTemplate: SupplierTemplate = {
  supplierName: "Edenred UTA Mobility",
  vatNumber: "01696270212",
  templateName: "Edenred UTA - FatturaPA carburante",
  templateDescription:
    "Template per fatture carburante Edenred UTA Mobility. " +
    "Estrae targa da AltriDatiGestionali, data/carburante/km dalla Descrizione.",
  templateConfig: {
    version: 1,
    lineXpath:
      "p:FatturaElettronica.FatturaElettronicaBody.DatiBeniServizi.DettaglioLinee",
    fields: {
      licensePlate: {
        method: "XPATH_REGEX",
        xpath: "AltriDatiGestionali.RiferimentoTesto",
        regex: "([A-Z]{2}\\d{3}[A-Z]{2})",
        regexGroup: 1,
        transform: "uppercase",
      },
      date: {
        method: "XPATH_REGEX",
        xpath: "Descrizione",
        regex: "(\\d{2}/\\d{2}/\\d{4})",
        regexGroup: 1,
        dateFormat: "dd/MM/yyyy",
      },
      fuelType: {
        method: "XPATH_REGEX",
        xpath: "Descrizione",
        regex: "Km:\\d+\\s+(.+?)\\s+[\\d.,]+\\s*lt",
        regexGroup: 1,
        transform: "trim",
      },
      quantity: {
        method: "XPATH",
        xpath: "Quantita",
      },
      amount: {
        method: "XPATH",
        xpath: "PrezzoTotale",
      },
      unitPrice: {
        method: "XPATH",
        xpath: "PrezzoUnitario",
      },
      cardNumber: {
        method: "XPATH",
        xpath: "RiferimentoAmministrazione",
        transform: "trim",
      },
      odometerKm: {
        method: "XPATH_REGEX",
        xpath: "Descrizione",
        regex: "Km:(\\d+)",
        regexGroup: 1,
      },
      description: {
        method: "XPATH",
        xpath: "Descrizione",
        transform: "trim",
      },
    },
    lineFilters: [
      {
        fieldPath: "description",
        regex: "lt\\s+[\\d.,]+\\s*Eu",
        action: "include",
      },
    ],
    supplierDetection: {
      vatNumberPath:
        "p:FatturaElettronica.FatturaElettronicaHeader.CedentePrestatore.DatiAnagrafici.IdFiscaleIVA.IdCodice",
    },
    invoiceMetadata: {
      invoiceNumberPath:
        "p:FatturaElettronica.FatturaElettronicaBody.DatiGenerali.DatiGeneraliDocumento.Numero",
      invoiceDatePath:
        "p:FatturaElettronica.FatturaElettronicaBody.DatiGenerali.DatiGeneraliDocumento.Data",
      invoiceDateFormat: "yyyy-MM-dd",
    },
  },
};

/**
 * WEX Europe Services / ESSO — FatturaPA con prefisso ns0:
 *
 * Struttura DettaglioLinee:
 *   - Targa: nella Descrizione, formato carta-targa
 *     (es. "7033167200254244329-GA727GS")
 *   - Data: nella Descrizione ("in data dd.MM.yy")
 *   - Carburante: nella Descrizione (inizio riga prima di "in data")
 *   - Quantità: campo Quantita (assente per voci non-carburante come AdBlue)
 *   - Importo: campo PrezzoTotale
 *   - N° carta: nella Descrizione ("con carta NNNN-TARGA")
 *
 * Esempio Descrizione:
 *   "gasolio autotrazion  in data 08.02.23 con carta 7033167200254244329-GA727GS
 *    scontrino N.009006 c/o 105063 BOLLATE PREZZO POMPA EUR/100L 190,59  Sconto 1,50"
 */
const essoTemplate: SupplierTemplate = {
  supplierName: "WEX Europe Services (Esso)",
  vatNumber: "08510870960",
  templateName: "Esso/WEX - FatturaPA carburante",
  templateDescription:
    "Template per fatture carburante Esso emesse da WEX Europe Services. " +
    "Estrae targa dal formato carta-targa nella Descrizione.",
  templateConfig: {
    version: 1,
    lineXpath:
      "ns0:FatturaElettronica.FatturaElettronicaBody.DatiBeniServizi.DettaglioLinee",
    fields: {
      licensePlate: {
        method: "XPATH_REGEX",
        xpath: "Descrizione",
        regex: "\\d+-([A-Z]{2}\\d{3}[A-Z]{2})",
        regexGroup: 1,
        transform: "uppercase",
      },
      date: {
        method: "XPATH_REGEX",
        xpath: "Descrizione",
        regex: "in data (\\d{2}\\.\\d{2}\\.\\d{2})",
        regexGroup: 1,
        dateFormat: "dd.MM.yy",
      },
      fuelType: {
        method: "XPATH_REGEX",
        xpath: "Descrizione",
        regex: "^(.+?)\\s{2,}in data",
        regexGroup: 1,
        transform: "trim",
      },
      quantity: {
        method: "XPATH",
        xpath: "Quantita",
      },
      amount: {
        method: "XPATH",
        xpath: "PrezzoTotale",
      },
      unitPrice: {
        method: "XPATH",
        xpath: "PrezzoUnitario",
      },
      cardNumber: {
        method: "XPATH_REGEX",
        xpath: "Descrizione",
        regex: "con carta (\\d+)",
        regexGroup: 1,
      },
      description: {
        method: "XPATH",
        xpath: "Descrizione",
        transform: "trim",
      },
    },
    supplierDetection: {
      vatNumberPath:
        "ns0:FatturaElettronica.FatturaElettronicaHeader.CedentePrestatore.DatiAnagrafici.IdFiscaleIVA.IdCodice",
    },
    invoiceMetadata: {
      invoiceNumberPath:
        "ns0:FatturaElettronica.FatturaElettronicaBody.DatiGenerali.DatiGeneraliDocumento.Numero",
      invoiceDatePath:
        "ns0:FatturaElettronica.FatturaElettronicaBody.DatiGenerali.DatiGeneraliDocumento.Data",
      invoiceDateFormat: "yyyy-MM-dd",
    },
  },
};

/**
 * Kuwait Petroleum Italia / Q8 — FatturaPA con prefisso p:
 *
 * Struttura DettaglioLinee:
 *   - Targa: AltriDatiGestionali.RiferimentoTesto (TipoDato=TARGA)
 *   - Data: campo DataInizioPeriodo (yyyy-MM-dd)
 *   - Carburante: campo Descrizione ("SUPER SENZA PB", "GASOLIO", ecc.)
 *   - Quantità: campo Quantita
 *   - Importo: campo PrezzoTotale
 *
 * Esempio linea:
 *   Descrizione: "SUPER SENZA PB"
 *   DataInizioPeriodo: "2024-12-18"
 *   AltriDatiGestionali > RiferimentoTesto: "GR027EW"
 */
const q8Template: SupplierTemplate = {
  supplierName: "Kuwait Petroleum Italia (Q8)",
  vatNumber: "00891951006",
  templateName: "Q8 - FatturaPA carburante",
  templateDescription:
    "Template per fatture carburante Q8 (Kuwait Petroleum Italia). " +
    "Estrae targa da AltriDatiGestionali, data da DataInizioPeriodo.",
  templateConfig: {
    version: 1,
    lineXpath:
      "p:FatturaElettronica.FatturaElettronicaBody.DatiBeniServizi.DettaglioLinee",
    fields: {
      licensePlate: {
        method: "XPATH_REGEX",
        xpath: "AltriDatiGestionali.RiferimentoTesto",
        regex: "([A-Z]{2}\\d{3}[A-Z]{2})",
        regexGroup: 1,
        transform: "uppercase",
      },
      date: {
        method: "XPATH",
        xpath: "DataInizioPeriodo",
        dateFormat: "yyyy-MM-dd",
      },
      fuelType: {
        method: "XPATH",
        xpath: "Descrizione",
        transform: "trim",
      },
      quantity: {
        method: "XPATH",
        xpath: "Quantita",
      },
      amount: {
        method: "XPATH",
        xpath: "PrezzoTotale",
      },
      unitPrice: {
        method: "XPATH",
        xpath: "PrezzoUnitario",
      },
      description: {
        method: "XPATH",
        xpath: "Descrizione",
        transform: "trim",
      },
    },
    supplierDetection: {
      vatNumberPath:
        "p:FatturaElettronica.FatturaElettronicaHeader.CedentePrestatore.DatiAnagrafici.IdFiscaleIVA.IdCodice",
    },
    invoiceMetadata: {
      invoiceNumberPath:
        "p:FatturaElettronica.FatturaElettronicaBody.DatiGenerali.DatiGeneraliDocumento.Numero",
      invoiceDatePath:
        "p:FatturaElettronica.FatturaElettronicaBody.DatiGenerali.DatiGeneraliDocumento.Data",
      invoiceDateFormat: "yyyy-MM-dd",
    },
  },
};

// ---------------------------------------------------------------------------
// All templates
// ---------------------------------------------------------------------------

const TEMPLATES: SupplierTemplate[] = [edenredTemplate, essoTemplate, q8Template];

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const orgs = await prisma.organization.findMany({ select: { id: true, name: true } });
  if (orgs.length === 0) {
    console.error("Nessuna organizzazione trovata. Eseguire prima il seed principale.");
    process.exit(1);
  }

  console.log(`Trovate ${orgs.length} organizzazione/i\n`);

  for (const org of orgs) {
    console.log(`=== Organizzazione: ${org.name} (${org.id}) ===`);

    // Ensure "CARBURANTE" supplier type exists
    let supplierType = await prisma.supplierType.findFirst({
      where: { tenantId: org.id, code: "CARBURANTE" },
    });

    if (!supplierType) {
      supplierType = await prisma.supplierType.create({
        data: {
          tenantId: org.id,
          code: "CARBURANTE",
          label: "Carburante",
          sortOrder: 2,
        },
      });
      console.log("  Creato SupplierType CARBURANTE");
    }

    for (const tpl of TEMPLATES) {
      // Find or create supplier
      let supplier = await prisma.supplier.findFirst({
        where: { tenantId: org.id, vatNumber: tpl.vatNumber },
      });

      if (!supplier) {
        supplier = await prisma.supplier.create({
          data: {
            tenantId: org.id,
            supplierTypeId: supplierType.id,
            name: tpl.supplierName,
            vatNumber: tpl.vatNumber,
          },
        });
        console.log(`  Creato Supplier: ${tpl.supplierName} (${tpl.vatNumber})`);
      } else {
        console.log(`  Supplier già esistente: ${supplier.name} (${tpl.vatNumber})`);
      }

      // Check if template already exists for this supplier
      const existingTemplate = await prisma.supplierXmlTemplate.findFirst({
        where: { tenantId: org.id, supplierId: supplier.id },
      });

      if (existingTemplate) {
        // Update existing template
        await prisma.supplierXmlTemplate.update({
          where: { id: existingTemplate.id },
          data: {
            name: tpl.templateName,
            description: tpl.templateDescription,
            templateConfig: JSON.stringify(tpl.templateConfig),
            matchingConfig: JSON.stringify(DEFAULT_MATCHING),
          },
        });
        console.log(`  Aggiornato template: ${tpl.templateName}`);
      } else {
        await prisma.supplierXmlTemplate.create({
          data: {
            tenantId: org.id,
            supplierId: supplier.id,
            name: tpl.templateName,
            description: tpl.templateDescription,
            templateConfig: JSON.stringify(tpl.templateConfig),
            matchingConfig: JSON.stringify(DEFAULT_MATCHING),
          },
        });
        console.log(`  Creato template: ${tpl.templateName}`);
      }
    }

    console.log();

    // -----------------------------------------------------------------------
    // Seed FieldRegexPresets
    // -----------------------------------------------------------------------

    console.log(`  --- Regex Presets ---`);

    // Helper: find supplier by VAT
    const findSupplier = async (vat: string) =>
      prisma.supplier.findFirst({ where: { tenantId: org.id, vatNumber: vat } });

    const edenredSupplier = await findSupplier("01696270212");
    const essoSupplier = await findSupplier("08510870960");

    type PresetDef = {
      supplierId: number | null;
      fieldName: string;
      name: string;
      patterns: { label?: string; regex: string; regexGroup?: number }[];
      priority: number;
    };

    const presetDefs: PresetDef[] = [
      // Globale: targa italiana standard
      {
        supplierId: null,
        fieldName: "licensePlate",
        name: "Targa italiana standard",
        patterns: [{ label: "Targa AA000AA", regex: "([A-Z]{2}\\d{3}[A-Z]{2})", regexGroup: 1 }],
        priority: 0,
      },
      // Edenred: alias flotta JOLLY
      ...(edenredSupplier
        ? [
            {
              supplierId: Number(edenredSupplier.id),
              fieldName: "licensePlate",
              name: "Alias flotta JOLLY (Edenred)",
              patterns: [{ label: "JOLLY N", regex: "JOLLY\\s*(\\d+)", regexGroup: 1 }],
              priority: 10,
            },
          ]
        : []),
      // ESSO: targa da carta-targa
      ...(essoSupplier
        ? [
            {
              supplierId: Number(essoSupplier.id),
              fieldName: "licensePlate",
              name: "Targa da carta-targa (ESSO)",
              patterns: [{ label: "Carta-Targa", regex: "\\d+-([A-Z]{2}\\d{3}[A-Z]{2})", regexGroup: 1 }],
              priority: 0,
            },
            {
              supplierId: Number(essoSupplier.id),
              fieldName: "cardNumber",
              name: "Numero carta numerico (ESSO)",
              patterns: [{ label: "con carta N", regex: "con carta (\\d+)", regexGroup: 1 }],
              priority: 0,
            },
          ]
        : []),
      // Globale: data italiana (dd/MM/yyyy, dd.MM.yyyy, dd-MM-yyyy)
      {
        supplierId: null,
        fieldName: "date",
        name: "Data italiana (dd/MM/yyyy)",
        patterns: [{ label: "dd/MM/yyyy", regex: "(\\d{1,2}[/\\-.](\\d{1,2})[/\\-.](\\d{2,4}))", regexGroup: 1 }],
        priority: 0,
      },
      // Globale: data ISO (yyyy-MM-dd)
      {
        supplierId: null,
        fieldName: "date",
        name: "Data ISO (yyyy-MM-dd)",
        patterns: [{ label: "yyyy-MM-dd", regex: "(\\d{4}-\\d{2}-\\d{2})", regexGroup: 1 }],
        priority: 0,
      },
      // Globale: importo numerico con separatori
      {
        supplierId: null,
        fieldName: "amount",
        name: "Importo numerico",
        patterns: [{ label: "Importo", regex: "([\\d.,]+)", regexGroup: 1 }],
        priority: 0,
      },
      // Globale: telaio VIN (17 caratteri alfanumerici)
      {
        supplierId: null,
        fieldName: "vin",
        name: "Telaio VIN 17 caratteri",
        patterns: [{ label: "VIN", regex: "([A-HJ-NPR-Z0-9]{17})", regexGroup: 1 }],
        priority: 0,
      },
    ];

    for (const def of presetDefs) {
      const existing = await prisma.fieldRegexPreset.findFirst({
        where: {
          tenantId: org.id,
          supplierId: def.supplierId,
          fieldName: def.fieldName,
          name: def.name,
        },
      });

      if (existing) {
        await prisma.fieldRegexPreset.update({
          where: { id: existing.id },
          data: {
            patterns: JSON.stringify(def.patterns),
            priority: def.priority,
          },
        });
        console.log(`  Aggiornato preset: ${def.name}`);
      } else {
        await prisma.fieldRegexPreset.create({
          data: {
            tenantId: org.id,
            supplierId: def.supplierId,
            fieldName: def.fieldName,
            name: def.name,
            patterns: JSON.stringify(def.patterns),
            priority: def.priority,
          },
        });
        console.log(`  Creato preset: ${def.name}`);
      }
    }

    console.log();
  }

  console.log("Seed template completato!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
