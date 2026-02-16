# Story 6.6: Export Report Certificabili PDF e CSV

Status: done

## Story

As a **Fleet Manager**,
I want **esportare report certificabili in formato PDF e CSV**,
So that **posso produrre documentazione ufficiale delle emissioni con metodologia di calcolo inclusa**.

## Acceptance Criteria

1. Il PDF include: intestazione azienda, periodo, dati aggregati, grafici, dettaglio veicoli, metodologia di calcolo (FR40)
2. Il CSV include tutti i dati tabulari con encoding UTF-8 e separatori configurabili (NFR26)
3. La metodologia di calcolo descrive: fonte dati tecnici, formula teorica, formula reale, fonte fattori emissione, periodo di riferimento
4. Il PDF e generato tramite Route Handler dedicato
5. Il report e scaricabile con nome file che include tenant, periodo e data generazione

## Tasks / Subtasks

- [ ] Task 1: Selezionare e installare libreria PDF (AC: #1, #4)
  - [ ] 1.1 Valutare `@react-pdf/renderer` vs `puppeteer` per generazione PDF. Criteri: dimensione bundle, supporto grafici/tabelle, qualita output, facilita di styling, compatibilita Docker
  - [ ] 1.2 Scelta raccomandata: `@react-pdf/renderer` per generazione server-side senza browser headless (piu leggero per Docker, nessuna dipendenza Chromium). Fallback a `puppeteer` se i grafici embedded risultano insufficienti
  - [ ] 1.3 Installare la libreria scelta: `npm install @react-pdf/renderer` (e `@react-pdf/types` se necessario)
  - [ ] 1.4 Verificare compatibilita con Next.js 16 e server-side rendering in Route Handler
- [ ] Task 2: Installare libreria CSV (AC: #2)
  - [ ] 2.1 Installare `papaparse` per generazione CSV: `npm install papaparse` e `npm install -D @types/papaparse`
  - [ ] 2.2 Verificare supporto UTF-8 BOM per compatibilita Excel con caratteri speciali italiani
- [ ] Task 3: Creare servizio generazione PDF (AC: #1, #3)
  - [ ] 3.1 Creare `src/lib/services/pdf-export-service.ts` con funzione `generateEmissionReportPDF(data: ReportExportData): Promise<Buffer>` che compone il documento PDF
  - [ ] 3.2 Implementare sezione intestazione PDF: logo Greenfleet (se disponibile), nome azienda tenant, titolo "Report Emissioni", periodo di riferimento (es. "Gen 2025 - Dic 2025"), data di generazione
  - [ ] 3.3 Implementare sezione riepilogo KPI: emissioni totali teoriche, emissioni totali reali, delta assoluto e percentuale, km totali percorsi, litri totali riforniti, numero veicoli nel perimetro
  - [ ] 3.4 Implementare sezione tabella dati aggregati: tabella con colonne (gruppo, emissioni teoriche, emissioni reali, delta, km, litri, contributo %), riga totale in fondo. Formattazione numeri in locale IT
  - [ ] 3.5 Implementare sezione grafici: se si usa @react-pdf/renderer, generare i grafici come immagini SVG/PNG lato server e inserirli nel PDF. Alternativa: tabella visuale con barre ASCII/unicode per rappresentare le proporzioni
  - [ ] 3.6 Implementare sezione dettaglio veicoli: tabella con ogni veicolo del perimetro (targa, marca/modello, tipo carburante, km percorsi, emissioni teoriche, emissioni reali, delta). Paginazione automatica per flotte grandi
  - [ ] 3.7 Implementare sezione metodologia di calcolo (testo fisso + parametri dinamici):
    - Fonte dati tecnici: "Dati tecnici veicoli da catalogo InfocarData / inserimento manuale"
    - Formula emissioni teoriche: "Emissioni teoriche (kgCO2e) = emissioni CO2 dichiarate (gCO2e/km) x km percorsi / 1000. Standard: WLTP (prioritario) o NEDC con coefficiente di conversione."
    - Formula emissioni reali: "Emissioni reali (kgCO2e) = quantita carburante rifornita (litri) x fattore di emissione (kgCO2e/litro) per tipo carburante"
    - Fonte fattori emissione: "Fattori di emissione da fonte [ISPRA/DEFRA], aggiornati al [data ultimo aggiornamento]"
    - Periodo di riferimento: "[data inizio] - [data fine]"
    - Perimetro: "[N] veicoli, [M] carlist"
  - [ ] 3.8 Implementare sezione footer su ogni pagina: "Generato da Greenfleet - [data] - Pagina X di Y"
  - [ ] 3.9 Styling PDF: font serif per titoli, sans-serif per corpo, colori Greenfleet (teal header), bordi tabella leggeri, spacing coerente
- [ ] Task 4: Creare servizio generazione CSV (AC: #2)
  - [ ] 4.1 Creare `src/lib/services/csv-export-service.ts` con funzione `generateEmissionReportCSV(data: ReportExportData, options: CSVOptions): string` dove CSVOptions include: separator (default ";"), decimalSeparator (default ","), includeHeaders (default true), encoding (default "utf-8")
  - [ ] 4.2 Implementare generazione CSV con papaparse `unparse()`. Colonne: Gruppo, Tipo Aggregazione, Emissioni Teoriche (kgCO2e), Emissioni Reali (kgCO2e), Delta (kgCO2e), Delta (%), Km Totali, Litri Totali, Contributo (%)
  - [ ] 4.3 Aggiungere riga di intestazione metadata come commento: "# Report Emissioni - [Tenant] - Periodo: [start] - [end] - Generato: [data]"
  - [ ] 4.4 Aggiungere riga totale in fondo al CSV
  - [ ] 4.5 Se richiesto il dettaglio veicoli, aggiungere sezione separata con header: Targa, Marca, Modello, Tipo Carburante, Km Percorsi, Emissioni Teoriche, Emissioni Reali, Delta, Delta %
  - [ ] 4.6 Formattazione numeri: usare il decimalSeparator configurato (virgola per IT), numeri senza separatore migliaia nel CSV (per compatibilita import)
  - [ ] 4.7 Aggiungere BOM UTF-8 (byte order mark `\uFEFF`) all'inizio del file per compatibilita Excel con caratteri speciali
- [ ] Task 5: Creare schema Zod per parametri export (AC: #1, #2, #5)
  - [ ] 5.1 Creare `src/lib/schemas/export.ts` con `exportParamsSchema`: format (enum: "pdf" | "csv"), dateRange (startDate, endDate), aggregationLevel (enum AggregationLevel), includeVehicleDetail (boolean, default true), includeMethodology (boolean, default true per PDF, ignorato per CSV), csvSeparator (string opzionale, default ";"), carlistId (string opzionale)
  - [ ] 5.2 Validazione: startDate < endDate, format valido
- [ ] Task 6: Creare tipo ReportExportData (AC: #1, #2, #3)
  - [ ] 6.1 Aggiungere in `src/types/report.ts` il tipo `ReportExportData`: tenantName, tenantLogo (opzionale, URL), dateRange, aggregationLevel, aggregations (EmissionAggregation[]), vehicleDetails (opzionale, array con targa, marca, modello, fuelType, km, theoreticalEmissions, realEmissions), metadata (totali, vehicleCount, generatedAt), methodology (oggetto con i testi e parametri dinamici della sezione metodologia)
  - [ ] 6.2 Aggiungere tipo `CSVOptions`: separator, decimalSeparator, includeHeaders, encoding
  - [ ] 6.3 Aggiungere tipo `ExportFilename`: funzione helper che genera il nome file
- [ ] Task 7: Creare Route Handler PDF (AC: #1, #3, #4, #5)
  - [ ] 7.1 Creare `src/app/api/export/pdf/route.ts` — Route Handler GET che: verifica sessione Better Auth, estrae tenantId dalla sessione, valida query params con Zod exportParamsSchema, carica dati dal report-service (stesso Prisma client con tenant extension), genera PDF tramite pdf-export-service, ritorna Response con Content-Type `application/pdf` e Content-Disposition `attachment; filename="[nome_file].pdf"`
  - [ ] 7.2 Implementare logica generazione nome file: `greenfleet_{tenantSlug}_{startDate}_{endDate}_{generatedDate}.pdf` (es. `greenfleet_acme-corp_2025-01_2025-12_20260208.pdf`). Date nel formato YYYY-MM. tenantSlug = nome tenant slugificato (lowercase, trattini)
  - [ ] 7.3 Gestire errori: sessione non valida → 401, parametri non validi → 400 con dettaglio, nessun dato → 404 con messaggio, errore generazione → 500 con logging Pino
  - [ ] 7.4 Loggare con Pino (info level) ogni export PDF con: tenantId, dateRange, vehicleCount, durata generazione
- [ ] Task 8: Creare Route Handler CSV (AC: #2, #5)
  - [ ] 8.1 Creare `src/app/api/export/csv/route.ts` — Route Handler GET che: verifica sessione Better Auth, estrae tenantId dalla sessione, valida query params con Zod, carica dati dal report-service, genera CSV tramite csv-export-service, ritorna Response con Content-Type `text/csv; charset=utf-8` e Content-Disposition `attachment; filename="[nome_file].csv"`
  - [ ] 8.2 Implementare logica generazione nome file: `greenfleet_{tenantSlug}_{startDate}_{endDate}_{generatedDate}.csv` (stesso pattern del PDF)
  - [ ] 8.3 Per dataset grandi (> 1000 righe), implementare streaming con ReadableStream per evitare di caricare tutto in memoria. Usare TransformStream per trasformare righe in CSV progressivamente
  - [ ] 8.4 Gestire errori: stessi pattern del Route Handler PDF (401, 400, 404, 500)
  - [ ] 8.5 Loggare con Pino (info level) ogni export CSV con: tenantId, dateRange, rowCount, durata generazione
- [ ] Task 9: Creare componente UI bottoni export (AC: #1, #2, #5)
  - [ ] 9.1 Creare `src/app/(dashboard)/emissions/components/ExportButtons.tsx` — componente client con due bottoni: "Esporta PDF" (icona FileDown) e "Esporta CSV" (icona Table). Bottoni secondari (variant outline) posizionati nella toolbar del report
  - [ ] 9.2 Al click, costruire URL del Route Handler con query params dal filtro report corrente e avviare il download tramite `window.open(url)` o link con `download` attribute
  - [ ] 9.3 Implementare stato loading sui bottoni durante la generazione (disabilitare il bottone, mostrare spinner): per PDF usare fetch + blob per gestire il download con feedback, per CSV usare link diretto
  - [ ] 9.4 Gestire errori: se il Route Handler ritorna errore, mostrare toast con messaggio (sonner)
  - [ ] 9.5 Aggiungere dropdown opzionale per CSV con selezione separatore: punto e virgola (default IT), virgola, tab
- [ ] Task 10: Integrare bottoni export nella pagina report (AC: #1, #2)
  - [ ] 10.1 Aggiungere ExportButtons nel componente EmissionDashboard (da Story 6.4) nella toolbar, accanto ai filtri
  - [ ] 10.2 I bottoni ereditano i parametri correnti dei filtri report (dateRange, aggregationLevel, carlistId)
  - [ ] 10.3 I bottoni sono disabilitati se non ci sono dati da esportare (nessun risultato nel report corrente)
  - [ ] 10.4 Verificare che l'export funzioni anche dal drill-down: esportare il livello corrente di drill-down
- [ ] Task 11: Creare helper generazione nome file (AC: #5)
  - [ ] 11.1 Creare `src/lib/utils/filename.ts` con funzione `generateExportFilename(params: { tenantName: string, startDate: Date, endDate: Date, format: "pdf" | "csv" }): string` che genera il nome file nel formato: `greenfleet_{tenantSlug}_{startYYYY-MM}_{endYYYY-MM}_{generatedYYYYMMDD}.{format}`
  - [ ] 11.2 Implementare funzione `slugify(name: string): string` — lowercase, replace spazi e caratteri speciali con trattini, rimuovere accenti (normalizzare NFD + strip combining marks)
  - [ ] 11.3 Garantire che il nome file non contenga caratteri problematici per filesystem (/, \, :, *, ?, ", <, >, |)

## Dev Notes

### Architettura Export

L'export segue il pattern architetturale AC-1: Route Handlers per endpoints che producono file scaricabili. I Route Handlers vivono in `src/app/api/export/` e sono gli unici endpoint che ritornano file binari. La logica di business (raccolta dati, formattazione) resta nei services.

```
UI (ExportButtons) ──GET request──> Route Handler (api/export/pdf|csv)
                                        │
                                        ├── Verifica sessione Better Auth
                                        ├── Valida parametri (Zod)
                                        ├── Carica dati (report-service.ts)
                                        ├── Genera file (pdf-export-service.ts | csv-export-service.ts)
                                        └── Ritorna file (Response con Content-Disposition)
```

### Template PDF — @react-pdf/renderer

```typescript
// src/lib/services/pdf-export-service.ts

import { renderToBuffer } from "@react-pdf/renderer"
import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer"
import type { ReportExportData } from "@/types/report"

export async function generateEmissionReportPDF(data: ReportExportData): Promise<Buffer> {
  const document = (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Report Emissioni</Text>
          <Text style={styles.subtitle}>{data.tenantName}</Text>
          <Text style={styles.period}>
            Periodo: {formatDateIT(data.dateRange.startDate)} - {formatDateIT(data.dateRange.endDate)}
          </Text>
        </View>

        {/* KPI Riepilogo */}
        <View style={styles.kpiSection}>
          <KPIBox label="Emissioni Teoriche" value={formatEmission(data.metadata.totalTheoreticalEmissions)} />
          <KPIBox label="Emissioni Reali" value={formatEmission(data.metadata.totalRealEmissions)} />
          <KPIBox label="Delta" value={formatDelta(data.metadata.totalDeltaAbsolute)} />
          <KPIBox label="Km Totali" value={formatKm(data.metadata.totalKm)} />
        </View>

        {/* Tabella Aggregazioni */}
        <AggregationTable aggregations={data.aggregations} />

        {/* Dettaglio Veicoli (se incluso) */}
        {data.vehicleDetails && <VehicleDetailTable vehicles={data.vehicleDetails} />}

        {/* Metodologia */}
        <MethodologySection methodology={data.methodology} />
      </Page>
    </Document>
  )

  return renderToBuffer(document)
}

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica" },
  header: { marginBottom: 20, borderBottom: "2px solid #0d9488", paddingBottom: 10 },
  title: { fontSize: 24, fontWeight: "bold", color: "#0d9488" },
  subtitle: { fontSize: 14, marginTop: 4 },
  period: { fontSize: 11, color: "#666", marginTop: 4 },
  kpiSection: { flexDirection: "row", justifyContent: "space-between", marginBottom: 20 },
  // ... altri stili
})
```

### Generazione CSV con papaparse

```typescript
// src/lib/services/csv-export-service.ts

import Papa from "papaparse"
import type { ReportExportData, CSVOptions } from "@/types/report"

const BOM = "\uFEFF"  // UTF-8 BOM per Excel

export function generateEmissionReportCSV(
  data: ReportExportData,
  options: CSVOptions = { separator: ";", decimalSeparator: ",", includeHeaders: true }
): string {
  const { separator, decimalSeparator } = options

  // Header metadata come commento
  const metadataLine = `# Report Emissioni - ${data.tenantName} - Periodo: ${formatDateISO(data.dateRange.startDate)} - ${formatDateISO(data.dateRange.endDate)} - Generato: ${formatDateISO(data.metadata.generatedAt)}`

  // Dati aggregati
  const aggregationRows = data.aggregations.map(agg => ({
    Gruppo: agg.label,
    "Emissioni Teoriche (kgCO2e)": formatNumber(agg.theoreticalEmissions, decimalSeparator),
    "Emissioni Reali (kgCO2e)": formatNumber(agg.realEmissions, decimalSeparator),
    "Delta (kgCO2e)": formatNumber(agg.deltaAbsolute, decimalSeparator),
    "Delta (%)": formatNumber(agg.deltaPercentage, decimalSeparator),
    "Km Totali": formatNumber(agg.totalKm, decimalSeparator),
    "Litri Totali": formatNumber(agg.totalFuel, decimalSeparator),
    "Contributo (%)": formatNumber(agg.contributionPercentage || 0, decimalSeparator),
  }))

  const csvContent = Papa.unparse(aggregationRows, {
    delimiter: separator,
    header: options.includeHeaders,
  })

  // Dettaglio veicoli (se incluso)
  let vehicleCSV = ""
  if (data.vehicleDetails && data.vehicleDetails.length > 0) {
    const vehicleRows = data.vehicleDetails.map(v => ({
      Targa: v.plate,
      Marca: v.make,
      Modello: v.model,
      "Tipo Carburante": v.fuelType,
      "Km Percorsi": formatNumber(v.km, decimalSeparator),
      "Emissioni Teoriche (kgCO2e)": formatNumber(v.theoreticalEmissions, decimalSeparator),
      "Emissioni Reali (kgCO2e)": formatNumber(v.realEmissions, decimalSeparator),
      "Delta (kgCO2e)": formatNumber(v.delta, decimalSeparator),
      "Delta (%)": formatNumber(v.deltaPercentage, decimalSeparator),
    }))

    vehicleCSV = "\n\n# Dettaglio Veicoli\n" + Papa.unparse(vehicleRows, {
      delimiter: separator,
      header: true,
    })
  }

  return BOM + metadataLine + "\n" + csvContent + vehicleCSV
}

function formatNumber(value: number, decimalSeparator: string): string {
  const formatted = value.toFixed(2)
  return decimalSeparator === "," ? formatted.replace(".", ",") : formatted
}
```

### Route Handler Pattern

```typescript
// src/app/api/export/pdf/route.ts

import { auth } from "@/lib/auth/auth"
import { headers } from "next/headers"
import { exportParamsSchema } from "@/lib/schemas/export"
import { getAggregatedEmissions } from "@/lib/services/report-service"
import { generateEmissionReportPDF } from "@/lib/services/pdf-export-service"
import { generateExportFilename } from "@/lib/utils/filename"
import { getPrismaForTenant } from "@/lib/db/client"
import { logger } from "@/lib/utils/logger"

export async function GET(request: Request) {
  const startTime = Date.now()

  // 1. Auth check
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return new Response("Non autenticato", { status: 401 })
  }

  // 2. Validazione parametri
  const { searchParams } = new URL(request.url)
  const parseResult = exportParamsSchema.safeParse(Object.fromEntries(searchParams))
  if (!parseResult.success) {
    return Response.json({ error: parseResult.error.flatten() }, { status: 400 })
  }

  // 3. Carica dati
  const prisma = getPrismaForTenant(session.user.tenantId)
  const reportData = await getAggregatedEmissions(prisma, parseResult.data)

  if (reportData.aggregations.length === 0) {
    return Response.json({ error: "Nessun dato nel periodo selezionato" }, { status: 404 })
  }

  // 4. Genera PDF
  const exportData = buildExportData(reportData, session)
  const pdfBuffer = await generateEmissionReportPDF(exportData)

  // 5. Genera filename
  const filename = generateExportFilename({
    tenantName: session.user.tenantName,
    startDate: parseResult.data.dateRange.startDate,
    endDate: parseResult.data.dateRange.endDate,
    format: "pdf",
  })

  // 6. Log
  logger.info({
    action: "export.pdf",
    tenantId: session.user.tenantId,
    duration: Date.now() - startTime,
    vehicleCount: reportData.metadata.vehicleCount,
  }, "PDF report exported")

  // 7. Response
  return new Response(pdfBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  })
}
```

### Sezione Metodologia — Testo

La sezione metodologia e fondamentale per la certificabilita del report. Il testo e composto da parti fisse e parti dinamiche:

```
METODOLOGIA DI CALCOLO

Fonte Dati Tecnici
I dati tecnici dei veicoli (emissioni CO2 dichiarate, tipo carburante, consumi)
provengono dal catalogo InfocarData (banca dati Quattroruote) o da inserimento
manuale per veicoli non censiti. Standard emissioni: WLTP (prioritario), NEDC
con coefficiente di conversione dove WLTP non disponibile.

Formula Emissioni Teoriche
Emissioni teoriche (kgCO2e) = emissioni CO2 dichiarate (gCO2e/km) x km percorsi / 1000
I km percorsi sono determinati dalle rilevazioni chilometriche (da rifornimento
e da sezione dedicata) nel periodo di riferimento.

Formula Emissioni Reali
Emissioni reali (kgCO2e) = quantita carburante rifornita (litri) x fattore di
emissione (kgCO2e/litro) per tipo carburante
I rifornimenti sono registrati manualmente o importati da file nel periodo.

Fonte Fattori di Emissione
Fattori di emissione per tipo carburante da fonte {fonte} (es. ISPRA/DEFRA),
ultimo aggiornamento: {data_aggiornamento}.
Valori utilizzati nel periodo:
- Benzina: {valore} kgCO2e/litro
- Diesel: {valore} kgCO2e/litro
- GPL: {valore} kgCO2e/litro
- Metano: {valore} kgCO2e/kg
[...]

Periodo di Riferimento
Dal {data_inizio} al {data_fine}

Perimetro
{N} veicoli operativi, {M} carlist
```

### Generazione Nome File

```typescript
// src/lib/utils/filename.ts

export function generateExportFilename(params: {
  tenantName: string
  startDate: Date
  endDate: Date
  format: "pdf" | "csv"
}): string {
  const slug = slugify(params.tenantName)
  const start = formatDateCompact(params.startDate)   // "2025-01"
  const end = formatDateCompact(params.endDate)         // "2025-12"
  const generated = formatDateGenerated(new Date())     // "20260208"

  return `greenfleet_${slug}_${start}_${end}_${generated}.${params.format}`
}

export function slugify(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")   // Rimuove accenti
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")       // Replace non-alfanumerici con trattino
    .replace(/^-+|-+$/g, "")           // Trim trattini
}

function formatDateCompact(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
}

function formatDateGenerated(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}${m}${d}`
}
```

### CSV Streaming per Dataset Grandi

```typescript
// Nel Route Handler CSV, per dataset grandi (> 1000 righe):

export async function GET(request: Request) {
  // ... auth, validation, data loading ...

  // Per streaming:
  const stream = new TransformStream()
  const writer = stream.writable.getWriter()
  const encoder = new TextEncoder()

  // Scrivi BOM + header
  await writer.write(encoder.encode(BOM + headerLine + "\n"))

  // Scrivi righe progressive
  for (const row of rows) {
    const csvLine = Papa.unparse([row], { delimiter: separator, header: false })
    await writer.write(encoder.encode(csvLine + "\n"))
  }

  await writer.close()

  return new Response(stream.readable, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  })
}
```

### Struttura File Target

```
src/
├── app/
│   ├── (dashboard)/
│   │   └── emissions/
│   │       └── components/
│   │           └── ExportButtons.tsx              # NUOVO: Bottoni export PDF/CSV
│   └── api/
│       └── export/
│           ├── pdf/
│           │   └── route.ts                       # NUOVO: Route Handler PDF
│           └── csv/
│               └── route.ts                       # NUOVO: Route Handler CSV
├── lib/
│   ├── schemas/
│   │   └── export.ts                              # NUOVO: Zod schema parametri export
│   ├── services/
│   │   ├── report-service.ts                      # Esistente da Story 6.4 — riutilizzato
│   │   ├── pdf-export-service.ts                  # NUOVO: Generazione PDF
│   │   └── csv-export-service.ts                  # NUOVO: Generazione CSV
│   └── utils/
│       └── filename.ts                            # NUOVO: Helper generazione nome file
└── types/
    └── report.ts                                  # Esistente — aggiungere ReportExportData, CSVOptions
```

### Decisioni Architetturali Rilevanti

- **AC-1 Pattern API Ibrido:** Route Handlers per export file (PDF, CSV) — questo e il caso d'uso esplicito per cui i Route Handlers sono previsti nell'architettura
- **DA-1 Multi-Tenant:** Il Route Handler estrae tenantId dalla sessione e usa Prisma client con tenant extension. Il nome tenant appare nell'intestazione PDF e nel nome file
- **DA-4 Validazione Zod:** Schema Zod per parametri export condiviso tra UI (costruzione URL) e Route Handler (validazione)
- **AC-2 Error Handling:** Codici HTTP standard per Route Handlers (401, 400, 404, 500) invece di ActionResult
- **ID-4 Logging:** Pino info log per ogni export con metriche (durata, numero righe)

### Dipendenze da Story Precedenti

- **Story 1.1:** Scaffold progetto, Better Auth, middleware, Pino logging
- **Story 1.2:** Prisma client extension per auto-filter tenantId
- **Story 1.4:** Permissions helper — solo FM e Admin possono esportare report
- **Story 6.1:** EmissionFactor model — i fattori di emissione sono elencati nella metodologia PDF
- **Story 6.2:** emission-calculator.ts — le formule di calcolo descritte nella metodologia
- **Story 6.4:** report-service.ts — la funzione getAggregatedEmissions e riutilizzata per caricare i dati da esportare. Tipi ReportResult e EmissionAggregation
- **Story 6.5:** DrillDownNavigator — l'export dal drill-down usa i parametri del livello corrente

### Anti-Pattern da Evitare

- NON generare PDF lato client — usare Route Handler server-side per sicurezza e performance
- NON includere dati sensibili nel PDF senza verifica sessione/tenant nel Route Handler
- NON dimenticare il BOM UTF-8 nel CSV — senza BOM, Excel non interpreta correttamente i caratteri speciali italiani
- NON caricare tutto in memoria per CSV grandi — usare streaming con TransformStream
- NON hardcodare il separatore CSV — renderlo configurabile (default ";" per Italia)
- NON usare nomi file con spazi o caratteri speciali — slugificare il nome tenant
- NON generare grafici complessi nel PDF se non supportati dalla libreria — preferire tabelle ben formattate a grafici degradati
- NON esporre i Route Handler senza verifica sessione — sono endpoint GET accessibili direttamente via URL
- NON dimenticare la sezione metodologia nel PDF — e il requisito chiave per la certificabilita (FR40)
- NON usare `any` — tipi espliciti per ReportExportData, CSVOptions, parametri Route Handler

### Formattazione e UX

- Bottoni export con icone chiare: FileDown per PDF, Table per CSV
- Feedback loading durante generazione: spinner sul bottone, bottone disabilitato
- Toast di successo dopo download completato, toast di errore con messaggio dettagliato
- PDF con layout professionale: intestazione teal, tabelle con bordi leggeri, footer su ogni pagina
- CSV con commenti metadata in header (prefisso #), BOM UTF-8, separatore configurabile
- Nome file leggibile e informativo: greenfleet_acme-corp_2025-01_2025-12_20260208.pdf

### References

- [Source: architecture.md#AC-1] — Route Handlers per export file, Server Actions per mutations
- [Source: architecture.md#DA-1] — Multi-tenant con tenantId nella sessione
- [Source: architecture.md#Project Structure] — api/export/pdf/ e api/export/csv/ directory
- [Source: architecture.md#Integration Points] — Export PDF e CSV come integration points
- [Source: architecture.md#Gap Analysis] — @react-pdf/renderer e papaparse come librerie candidate
- [Source: epics.md#Story 6.6] — Acceptance criteria BDD
- [Source: prd.md#FR40] — Export report certificabili PDF/CSV con metodologia
- [Source: prd.md#NFR26] — CSV UTF-8 con separatori configurabili

## Dev Agent Record

### Agent Model Used



### Debug Log References

### Completion Notes List

### File List
