# Story 6.4: Aggregazione Emissioni e Report

Status: done

## Story

As a **Fleet Manager**,
I want **aggregare le emissioni e generare report con doppio calcolo per periodo e aggregazione**,
So that **posso analizzare l'impatto ambientale della flotta a diversi livelli di dettaglio**.

## Acceptance Criteria

1. Le emissioni sono aggregate per veicolo, carlist, tipo carburante e periodo temporale (FR37)
2. Il report include doppio calcolo (teorico + reale) con delta per ogni aggregazione (FR38)
3. La generazione di report completa in meno di 3 secondi per 500 veicoli con 3 anni di storico (NFR2)
4. I grafici utilizzano Recharts via shadcn/ui Charts (FA-4)
5. I dati sono formattati in locale IT con unita di misura appropriate (kgCO2e, g/km, litri)

## Tasks / Subtasks

- [ ] Task 1: Creare report-service con logica di aggregazione (AC: #1, #2, #3)
  - [ ] 1.1 Creare `src/lib/services/report-service.ts` con funzione `getAggregatedEmissions(prisma, params)` dove params include: tenantId (automatico da Prisma extension), dateRange (startDate, endDate), aggregationLevel (enum: `VEHICLE`, `CARLIST`, `FUEL_TYPE`, `PERIOD`), periodGranularity (enum: `MONTHLY`, `QUARTERLY`, `YEARLY`), carlistId (opzionale per filtrare su una carlist specifica)
  - [ ] 1.2 Implementare query di aggregazione che raccoglie per ogni gruppo: totale km percorsi, totale litri riforniti, emissioni teoriche (somma gCO2e/km x km per veicolo), emissioni reali (somma litri x fattore emissione per tipo carburante), delta assoluto (reale - teorico) e delta percentuale
  - [ ] 1.3 Per aggregazione `VEHICLE`: raggruppare per singolo veicolo, ritornare marca/modello/targa con i totali
  - [ ] 1.4 Per aggregazione `CARLIST`: raggruppare per carlist, ritornare nome carlist con i totali dei veicoli appartenenti
  - [ ] 1.5 Per aggregazione `FUEL_TYPE`: raggruppare per tipo carburante, ritornare tipo con totali litri e emissioni
  - [ ] 1.6 Per aggregazione `PERIOD`: raggruppare per intervallo temporale (mese/trimestre/anno), ritornare serie temporale ordinata
  - [ ] 1.7 Implementare funzione `getEmissionTimeSeries(prisma, params)` che ritorna dati per grafico a linee: emissioni teoriche e reali per periodo, con delta
  - [ ] 1.8 Implementare funzione `getEmissionBreakdown(prisma, params)` che ritorna dati per grafico a barre: distribuzione emissioni per carburante o carlist
  - [ ] 1.9 Ottimizzare le query con indici composti su (tenantId, date) e (tenantId, fuelType) per rispettare NFR2 (< 3s per 500 veicoli x 3 anni). Considerare pre-aggregazione mensile se necessario
  - [ ] 1.10 Ogni funzione ritorna tipo `ReportAggregation` tipizzato, mai `any`
- [ ] Task 2: Creare schema Zod per parametri report (AC: #1)
  - [ ] 2.1 Creare `src/lib/schemas/report.ts` con `reportParamsSchema`: dateRange (oggetto con startDate e endDate, entrambe Date obbligatorie), aggregationLevel (enum z.nativeEnum), periodGranularity (enum opzionale, default MONTHLY), carlistId (string opzionale)
  - [ ] 2.2 Aggiungere validazione: startDate < endDate, range massimo 5 anni, aggregationLevel valido
  - [ ] 2.3 Creare `reportFilterSchema` per filtri UI: search (string opzionale), fuelType (enum opzionale), sortBy (string opzionale), sortOrder (asc/desc)
- [ ] Task 3: Creare tipi TypeScript per report (AC: #1, #2)
  - [ ] 3.1 Creare `src/types/report.ts` con i tipi: `AggregationLevel`, `PeriodGranularity`, `ReportParams`, `EmissionAggregation` (label, theoreticalEmissions, realEmissions, deltaAbsolute, deltaPercentage, totalKm, totalFuel), `EmissionTimeSeries` (period, theoreticalEmissions, realEmissions, delta), `EmissionBreakdown` (category, value, percentage), `ReportResult` (aggregations, timeSeries, breakdown, metadata con totali generali)
- [ ] Task 4: Creare Server Action per generazione report (AC: #1, #2, #3)
  - [ ] 4.1 Creare `src/app/(dashboard)/emissions/actions/generate-report.ts` — Server Action che: valida input con Zod reportParamsSchema, verifica RBAC (Admin o FM sul tenant), chiama report-service, ritorna ActionResult<ReportResult>
  - [ ] 4.2 Loggare con Pino (info level) la generazione report con durata esecuzione per monitorare NFR2
  - [ ] 4.3 Gestire errori: nessun dato nel periodo → messaggio specifico, timeout → errore con suggerimento di ridurre il range
- [ ] Task 5: Creare pagina report emissioni (AC: #1, #4, #5)
  - [ ] 5.1 Creare `src/app/(dashboard)/emissions/page.tsx` — React Server Component che carica i parametri iniziali (ultimo mese, aggregazione per veicolo) e renderizza la pagina report
  - [ ] 5.2 Creare `src/app/(dashboard)/emissions/loading.tsx` — skeleton loading con placeholder per filtri, grafici e tabella
  - [ ] 5.3 Creare `src/app/(dashboard)/emissions/error.tsx` — error boundary con messaggio user-friendly e bottone retry
- [ ] Task 6: Creare componenti filtri e selettori report (AC: #1, #5)
  - [ ] 6.1 Creare `src/app/(dashboard)/emissions/components/EmissionReportFilters.tsx` — componente client con: DateRangePicker per periodo, Select per livello aggregazione (veicolo/carlist/carburante/periodo), Select per granularita periodo (mese/trimestre/anno), Select opzionale per carlist, bottone "Genera Report"
  - [ ] 6.2 Usare shadcn/ui Select, DatePicker (composto con Calendar + Popover), Button
  - [ ] 6.3 Implementare stato locale con useState per i filtri, submit chiama Server Action con useActionState (React 19) e pending state su bottone
  - [ ] 6.4 Layout filtri: griglia responsive — 4 colonne su desktop, 2 su tablet, 1 su mobile
- [ ] Task 7: Implementare grafici Recharts (AC: #2, #4, #5)
  - [ ] 7.1 Installare dipendenze: `npx shadcn@latest add chart` per componenti chart shadcn/ui (wrappano Recharts)
  - [ ] 7.2 Creare `src/app/(dashboard)/emissions/components/EmissionTimeSeriesChart.tsx` — grafico a linee (LineChart) con due serie: emissioni teoriche (linea tratteggiata, colore secondario) e reali (linea solida, colore primario teal). Asse X = periodo, Asse Y = kgCO2e. Tooltip con valori formattati locale IT. Responsive
  - [ ] 7.3 Creare `src/app/(dashboard)/emissions/components/EmissionBreakdownChart.tsx` — grafico a barre (BarChart) con barre raggruppate teorico/reale per ogni categoria. Palette colori dal design system Greenfleet. Legend. Responsive
  - [ ] 7.4 Creare `src/app/(dashboard)/emissions/components/EmissionAreaChart.tsx` — grafico ad area (AreaChart) per visualizzazione trend cumulativo emissioni nel tempo. Area con opacita gradient. Responsive
  - [ ] 7.5 Ogni grafico usa il componente `ChartContainer` di shadcn/ui Charts per tema e responsive. Configurare `chartConfig` con colori e label in italiano
  - [ ] 7.6 Implementare stato vuoto (EmptyState) quando non ci sono dati per il periodo selezionato
- [ ] Task 8: Creare tabella dati aggregati (AC: #1, #2, #5)
  - [ ] 8.1 Creare `src/app/(dashboard)/emissions/components/EmissionAggregationTable.tsx` — DataTable con TanStack Table + shadcn/ui DataTable. Colonne: gruppo (veicolo/carlist/carburante/periodo), emissioni teoriche (kgCO2e), emissioni reali (kgCO2e), delta assoluto (kgCO2e), delta % (con colore: verde se reale < teorico, rosso altrimenti), km totali, litri totali
  - [ ] 8.2 Sorting su tutte le colonne, default per emissioni reali DESC
  - [ ] 8.3 Riga totale in fondo alla tabella con somme/medie
  - [ ] 8.4 Formattazione numeri in locale IT: migliaia con punto (1.234), decimali con virgola (1.234,56), kgCO2e con 2 decimali, percentuali con 1 decimale e segno (+/-)
  - [ ] 8.5 Il componente DeltaBar inline nella colonna delta per visualizzazione rapida teorico vs reale
- [ ] Task 9: Creare componente dashboard emissioni composito (AC: #1, #2, #4, #5)
  - [ ] 9.1 Creare `src/app/(dashboard)/emissions/components/EmissionDashboard.tsx` — componente che compone: filtri in alto, KPI cards (emissioni totali teoriche, reali, delta, km totali) sotto i filtri, grafici in griglia 2 colonne (time series + breakdown), tabella dati sotto i grafici
  - [ ] 9.2 KPI cards usano il componente KPICard con valore formattato, unita di misura, e icona
  - [ ] 9.3 Layout responsive: 2 colonne grafici su desktop, 1 colonna su tablet/mobile
  - [ ] 9.4 Sezione grafici e tabella si aggiornano al submit dei filtri senza reload pagina (client-side state update dopo Server Action)
- [ ] Task 10: Formattazione locale IT e unita di misura (AC: #5)
  - [ ] 10.1 Creare o estendere `src/lib/utils/number.ts` con funzioni: `formatEmission(value: number): string` (ritorna "1.234,56 kgCO2e"), `formatKm(value: number): string` (ritorna "12.345 km"), `formatFuel(value: number): string` (ritorna "1.234,5 L"), `formatPercentage(value: number): string` (ritorna "+5,2%" o "-3,1%"), `formatDelta(value: number): string` (ritorna delta con segno e colore semantico)
  - [ ] 10.2 Usare `Intl.NumberFormat('it-IT', ...)` per tutte le formattazioni numeriche
  - [ ] 10.3 Usare `Intl.DateTimeFormat('it-IT', ...)` per le date nei grafici e nella tabella

## Dev Notes

### Architettura report-service

Il `report-service.ts` e il componente centrale della reportistica emissioni. Riceve il Prisma client (gia filtrato per tenant via extension) e non deve mai accedere direttamente alla sessione o al request. Le query di aggregazione devono essere ottimizzate per il target di performance NFR2.

```typescript
// src/lib/services/report-service.ts

import type { PrismaClient } from "../../generated/prisma"
import type { ReportParams, ReportResult, EmissionAggregation, EmissionTimeSeries } from "@/types/report"

export async function getAggregatedEmissions(
  prisma: PrismaClient,
  params: ReportParams
): Promise<ReportResult> {
  const { dateRange, aggregationLevel, periodGranularity } = params

  // Query ottimizzata con groupBy Prisma
  // Per aggregazione VEHICLE:
  //   SELECT vehicleId, SUM(km), SUM(fuel), SUM(theoretical), SUM(real)
  //   FROM ... WHERE date BETWEEN start AND end
  //   GROUP BY vehicleId
  // Ogni aggregation include il calcolo delta = reale - teorico

  // ... implementazione
}

export async function getEmissionTimeSeries(
  prisma: PrismaClient,
  params: ReportParams
): Promise<EmissionTimeSeries[]> {
  // Serie temporale per grafici a linee
  // Raggruppamento per mese/trimestre/anno in base a periodGranularity
}

export async function getEmissionBreakdown(
  prisma: PrismaClient,
  params: ReportParams
): Promise<EmissionBreakdown[]> {
  // Distribuzione per categoria (carburante, carlist)
  // Include percentuale sul totale
}
```

### Tipi Report

```typescript
// src/types/report.ts

export enum AggregationLevel {
  VEHICLE = "VEHICLE",
  CARLIST = "CARLIST",
  FUEL_TYPE = "FUEL_TYPE",
  PERIOD = "PERIOD",
}

export enum PeriodGranularity {
  MONTHLY = "MONTHLY",
  QUARTERLY = "QUARTERLY",
  YEARLY = "YEARLY",
}

export type ReportParams = {
  dateRange: { startDate: Date; endDate: Date }
  aggregationLevel: AggregationLevel
  periodGranularity?: PeriodGranularity
  carlistId?: string
}

export type EmissionAggregation = {
  label: string
  id: string
  theoreticalEmissions: number   // kgCO2e
  realEmissions: number          // kgCO2e
  deltaAbsolute: number          // kgCO2e (reale - teorico)
  deltaPercentage: number        // % ((reale - teorico) / teorico * 100)
  totalKm: number
  totalFuel: number              // litri
}

export type EmissionTimeSeries = {
  period: string                 // "2026-01", "2026-Q1", "2026"
  periodLabel: string            // "Gen 2026", "Q1 2026", "2026"
  theoreticalEmissions: number
  realEmissions: number
  delta: number
}

export type EmissionBreakdown = {
  category: string
  categoryId: string
  value: number                  // kgCO2e
  percentage: number
}

export type ReportResult = {
  aggregations: EmissionAggregation[]
  timeSeries: EmissionTimeSeries[]
  breakdown: EmissionBreakdown[]
  metadata: {
    totalTheoreticalEmissions: number
    totalRealEmissions: number
    totalDeltaAbsolute: number
    totalDeltaPercentage: number
    totalKm: number
    totalFuel: number
    vehicleCount: number
    dateRange: { startDate: Date; endDate: Date }
    generatedAt: Date
  }
}
```

### Configurazione Recharts via shadcn/ui Charts

```typescript
// Esempio configurazione chart con shadcn/ui
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend } from "@/components/ui/chart"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts"

const chartConfig = {
  theoretical: {
    label: "Emissioni Teoriche",
    color: "hsl(var(--chart-2))",   // colore secondario
  },
  real: {
    label: "Emissioni Reali",
    color: "hsl(168, 76%, 28%)",    // teal 600 primary Greenfleet
  },
} satisfies ChartConfig

// Nel componente:
<ChartContainer config={chartConfig}>
  <LineChart data={timeSeries}>
    <CartesianGrid strokeDasharray="3 3" />
    <XAxis dataKey="periodLabel" />
    <YAxis tickFormatter={(v) => formatEmission(v)} />
    <ChartTooltip content={<ChartTooltipContent />} />
    <ChartLegend />
    <Line type="monotone" dataKey="theoreticalEmissions" stroke="var(--color-theoretical)" strokeDasharray="5 5" />
    <Line type="monotone" dataKey="realEmissions" stroke="var(--color-real)" />
  </LineChart>
</ChartContainer>
```

### Ottimizzazione Performance (NFR2)

Per garantire report < 3s con 500 veicoli x 3 anni di storico:

1. **Indici composti:** Assicurarsi che esistano indici su `(tenantId, date)` per rifornimenti e rilevazioni km
2. **Query aggregate:** Usare `prisma.groupBy()` o raw query SQL con `SUM`, `GROUP BY` invece di caricare tutti i record e aggregare in memoria
3. **Pre-aggregazione (se necessario):** Se le query restano lente, considerare una tabella `EmissionMonthlySummary` pre-calcolata, aggiornata via trigger o job schedulato
4. **Paginazione report:** Per aggregazione VEHICLE con flotte grandi, paginare i risultati nella tabella (50 veicoli per pagina)
5. **Misurazione:** Loggare tempo esecuzione di ogni query report con Pino per monitorare e ottimizzare

### Struttura File Target

```
src/
├── app/
│   └── (dashboard)/
│       └── emissions/
│           ├── page.tsx                           # Pagina report emissioni (RSC)
│           ├── loading.tsx                        # Skeleton loading
│           ├── error.tsx                          # Error boundary
│           ├── actions/
│           │   └── generate-report.ts             # Server Action generazione report
│           └── components/
│               ├── EmissionDashboard.tsx           # Composizione dashboard completa
│               ├── EmissionReportFilters.tsx       # Filtri e selettori
│               ├── EmissionTimeSeriesChart.tsx     # Grafico linee trend
│               ├── EmissionBreakdownChart.tsx      # Grafico barre distribuzione
│               ├── EmissionAreaChart.tsx           # Grafico area cumulativo
│               └── EmissionAggregationTable.tsx    # Tabella dati aggregati
├── lib/
│   ├── schemas/
│   │   └── report.ts                              # Zod schema parametri report
│   ├── services/
│   │   └── report-service.ts                      # Business logic aggregazione
│   └── utils/
│       └── number.ts                              # Formattazione numeri locale IT
└── types/
    └── report.ts                                  # Tipi TypeScript report
```

### Decisioni Architetturali Rilevanti

- **DA-1 Multi-Tenant:** tenantId filtrato automaticamente via Prisma extension su tutte le query report
- **DA-4 Validazione Zod:** Schema Zod per parametri report condiviso tra filtri UI e Server Action
- **DA-6 Caching:** Considerare `use cache` per report con parametri identici in un breve lasso di tempo
- **AC-1 Pattern API Ibrido:** Server Actions per generazione report. Route Handlers per export (Story 6.6)
- **AC-2 Error Handling:** ActionResult<ReportResult> dalla Server Action
- **FA-1 State Management:** RSC per caricamento iniziale, useState per filtri, useActionState per submit
- **FA-4 Charts:** Recharts via shadcn/ui Charts — obbligatorio, non usare librerie alternative
- **FA-5 DataTable:** TanStack Table + shadcn/ui DataTable per tabella aggregazioni

### Dipendenze da Story Precedenti

- **Story 1.1:** Scaffold progetto, Better Auth, middleware, ActionResult<T>, struttura directory
- **Story 1.2:** Prisma client extension per auto-filter tenantId
- **Story 1.4:** Permissions helper (hasRole, canAccess) — solo FM e Admin accedono ai report
- **Story 3.3:** TenantVehicle model (veicoli operativi del tenant)
- **Story 3.8:** Carlist model (per aggregazione per carlist)
- **Story 5.1:** FuelRecord model (rifornimenti per calcolo emissioni reali)
- **Story 5.3:** KmReading model (rilevazioni km per calcolo emissioni teoriche)
- **Story 6.1:** EmissionFactor model (fattori emissione per tipo carburante)
- **Story 6.2:** emission-calculator.ts (logica calcolo emissioni teoriche e reali per singolo veicolo)

### Anti-Pattern da Evitare

- NON caricare tutti i record in memoria e aggregare con JavaScript — usare query aggregate SQL/Prisma
- NON calcolare le emissioni on-the-fly per ogni richiesta report — il calcolo base e gia in emission-calculator.ts, il report-service aggrega i risultati
- NON usare librerie di charting diverse da Recharts (via shadcn/ui Charts) — decisione architetturale FA-4
- NON hardcodare formati numerici — usare sempre Intl.NumberFormat('it-IT')
- NON ignorare il pending state durante la generazione report — mostrare spinner/skeleton
- NON creare Server Actions dentro page.tsx — metterle in `actions/` directory
- NON fare business logic nei componenti — delegare a report-service.ts
- NON passare tenantId come parametro — e gia nel Prisma client via extension

### References

- [Source: architecture.md#DA-1] — Multi-tenant con tenantId pervasivo
- [Source: architecture.md#FA-4] — Recharts via shadcn/ui Charts
- [Source: architecture.md#AC-1] — Server Actions per mutations
- [Source: architecture.md#Structure Patterns] — Feature-based dentro App Router, emissions/ route
- [Source: architecture.md#Project Structure] — emissions/ directory con actions/ e components/
- [Source: epics.md#Story 6.4] — Acceptance criteria BDD
- [Source: prd.md#FR37] — Aggregazione emissioni per veicolo/carlist/carburante/periodo
- [Source: prd.md#FR38] — Report emissioni con doppio calcolo
- [Source: prd.md#NFR2] — Report < 3s per 500 veicoli x 3 anni
- [Source: ux-design-specification.md] — DeltaBar component, formattazione locale IT

## Dev Agent Record

### Agent Model Used



### Debug Log References

### Completion Notes List

### File List
