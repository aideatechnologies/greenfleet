# Story 7.1: Dashboard Fleet Manager

Status: done

## Story

As a **Fleet Manager**,
I want **visualizzare una dashboard con KPI principali della mia flotta**,
So that **posso monitorare a colpo d'occhio emissioni, trend, progresso target e notifiche**.

## Acceptance Criteria

1. La dashboard mostra KPI principali tramite KPICard: emissioni correnti (mese), trend vs mese precedente, numero veicoli attivi, km totali (FR42)
2. Ogni KPICard mostra trend arrow (freccia su/giu con colore semantico) e sparkline 12 mesi
3. Il progresso verso il target emissioni e visibile tramite componente ProgressTarget con milestone trimestrali
4. Il DeltaBar hero mostra emissioni teoriche vs reali della flotta con delta percentuale e colore semantico
5. Le notifiche includono: contratti in scadenza (30/60/90gg), documenti in scadenza, anomalie rifornimenti
6. La dashboard carica con KPI aggiornati in meno di 2 secondi (NFR3)
7. La dashboard e responsive: desktop (griglia 3 KPI + grafici affiancati), tablet (griglia 2 colonne), mobile (stack verticale)

## Tasks / Subtasks

- [ ] Task 1: Pagina Dashboard Fleet Manager (AC: #1, #6)
  - [ ] 1.1 Creare `src/app/(dashboard)/page.tsx` come Server Component che carica i dati KPI tramite service layer
  - [ ] 1.2 Implementare role-based routing: se ruolo FM/Admin, mostrare dashboard FM; se ruolo Driver, redirect a dashboard Driver
  - [ ] 1.3 Creare `src/app/(dashboard)/loading.tsx` con skeleton layout che replica la struttura della dashboard (3 card placeholder + grafici placeholder)
  - [ ] 1.4 Creare `src/app/(dashboard)/error.tsx` con messaggio user-friendly e bottone retry
- [ ] Task 2: Componente KPICard (AC: #1, #2)
  - [ ] 2.1 Creare `src/components/data-display/KPICard.tsx` con varianti: `default` (con sparkline), `compact` (senza sparkline), `hero` (piu grande)
  - [ ] 2.2 Implementare props: `value` (numero formattato), `label`, `trend` (percentuale + direzione), `sparklineData` (array 12 punti), `icon` (Lucide icon), `variant`
  - [ ] 2.3 Implementare trend arrow: freccia su verde (`success`) per trend positivo, freccia giu rossa (`destructive`) per negativo, freccia neutra (`muted`) per ±2%
  - [ ] 2.4 Integrare sparkline tramite Recharts (LineChart minimal, nessun asse, solo linea + area) dentro la card
  - [ ] 2.5 Implementare stati: Loading (skeleton con placeholder numerico), Populated (valore + trend), No data (trattino "--" con tooltip), Error (icona warning)
  - [ ] 2.6 Aggiungere accessibilita: `role="region"`, `aria-label` descrittivo con valore, trend e contesto
  - [ ] 2.7 Formattare numeri in locale IT (1.234,56) con `Intl.NumberFormat` e `font-variant-numeric: tabular-nums`
- [ ] Task 3: Calcolo KPI Emissioni (AC: #1)
  - [ ] 3.1 Creare `src/lib/services/dashboard-service.ts` con funzione `getDashboardKPIs(tenantId: string, period: Date)` che ritorna: emissioni mese corrente, emissioni mese precedente, veicoli attivi, km totali
  - [ ] 3.2 Calcolo emissioni mese corrente: somma emissioni reali (quantita carburante x fattore emissione) per tutti i rifornimenti del mese nel tenant
  - [ ] 3.3 Calcolo trend: `((emissioniMeseCorrente - emissioniMesePrecedente) / emissioniMesePrecedente) * 100`
  - [ ] 3.4 Query ottimizzata con indici su `tenantId` + `date` per performance < 2s
- [ ] Task 4: Trend e Sparkline 12 mesi (AC: #2)
  - [ ] 4.1 Creare funzione `getEmissionsTrend(tenantId: string, months: number)` in dashboard-service che ritorna array di {month, value} per gli ultimi N mesi
  - [ ] 4.2 Aggregare emissioni reali per mese con query GROUP BY month
  - [ ] 4.3 Passare i dati trend come `sparklineData` al componente KPICard
- [ ] Task 5: Integrazione ProgressTarget (AC: #3)
  - [ ] 5.1 Creare `src/components/data-display/ProgressTarget.tsx` con varianti `full` (con milestones trimestrali) e `compact` (solo barra + percentuale)
  - [ ] 5.2 Implementare props: `targetValue`, `currentValue`, `unit` (tCO2e), `milestones` (array Q1-Q4 con stato), `status` (on-track/at-risk/off-track)
  - [ ] 5.3 Calcolo status: on-track (verde, <= 100% proiezione lineare), at-risk (arancione, 100-115%), off-track (rosso, > 115%)
  - [ ] 5.4 Milestone dots: checkmark per trimestri completati, dot pieno per corrente, dot vuoto per futuri
  - [ ] 5.5 Stato "No target": testo muted "Nessun target configurato" con link "Imposta target"
  - [ ] 5.6 Accessibilita: `role="progressbar"`, `aria-valuenow`, `aria-valuemin`, `aria-valuemax`, `aria-label` descrittivo
  - [ ] 5.7 Creare funzione `getTargetProgress(tenantId: string)` in dashboard-service che ritorna target configurato + emissioni cumulate YTD
- [ ] Task 6: DeltaBar Hero (AC: #4)
  - [ ] 6.1 Creare `src/components/data-display/DeltaBar.tsx` con varianti: `inline` (compatto per righe tabella), `full` (con labels e descrizione per dashboard), `mini` (solo percentuale + freccia)
  - [ ] 6.2 Implementare props: `theoretical` (valore teorico), `actual` (valore reale), `unit`, `variant`, `showLabels`
  - [ ] 6.3 Implementare due barre orizzontali con Tailwind CSS (nessuna libreria chart): larghezza proporzionale al valore massimo tra i due
  - [ ] 6.4 Calcolo delta: `((actual - theoretical) / theoretical) * 100`. Positivo = reale sopra teorico (`destructive`), negativo = sotto (`success`), neutro ±2% (`muted`)
  - [ ] 6.5 Etichetta narrativa sotto le barre: "Reale sopra il teorico di X%" o "Reale sotto il teorico di X%"
  - [ ] 6.6 Accessibilita: `aria-label` descrittivo con valori e delta. Barre con `role="meter"`
  - [ ] 6.7 Creare funzione `getFleetDelta(tenantId: string, period: Date)` in dashboard-service che ritorna emissioni teoriche e reali aggregate per la flotta
- [ ] Task 7: Pannello Notifiche (AC: #5)
  - [ ] 7.1 Creare `src/app/(dashboard)/components/NotificationPanel.tsx` con lista notifiche raggruppate per tipo
  - [ ] 7.2 Query contratti in scadenza: contratti con `endDate` entro 30/60/90 giorni dal today, con StatusBadge warning/destructive
  - [ ] 7.3 Query documenti in scadenza: documenti veicolo con `expiryDate` entro 30/60 giorni, con StatusBadge
  - [ ] 7.4 Query anomalie rifornimenti: rifornimenti con consumo fuori range rispetto alla media del veicolo (±30%)
  - [ ] 7.5 Ogni notifica e cliccabile e naviga al dettaglio (contratto, documento, rifornimento)
  - [ ] 7.6 Contatore totale notifiche visibile anche nel header
- [ ] Task 8: Layout Responsive Dashboard (AC: #7)
  - [ ] 8.1 Desktop (>= 1280px): griglia 3 KPI cards in riga (hero + 2 default), sotto: DeltaBar full-width, sotto: ProgressTarget + grafico area emissioni affiancati, sotto: notifiche
  - [ ] 8.2 Tablet (768-1279px): KPI cards griglia 2 colonne, grafici full-width stacked, notifiche full-width
  - [ ] 8.3 Mobile (< 768px): tutte le card stacked in colonna singola, ordine: KPI hero, KPI secondari, DeltaBar, ProgressTarget, notifiche
  - [ ] 8.4 Usare Tailwind responsive utilities (`md:`, `lg:`, `xl:`) senza breakpoint custom
- [ ] Task 9: Ottimizzazione Performance < 2s (AC: #6)
  - [ ] 9.1 Implementare dashboard come React Server Component con async data fetching
  - [ ] 9.2 Utilizzare `use cache` (Next.js 16) per cachare i dati KPI con revalidazione a 5 minuti
  - [ ] 9.3 Streaming SSR: wrappare sezioni con `<Suspense>` per rendering progressivo (KPI prima, grafici poi, notifiche ultime)
  - [ ] 9.4 Verificare che le query Prisma abbiano indici appropriati su `tenantId`, `date`, `vehicleId`
  - [ ] 9.5 Misurare tempo di caricamento con `performance.now()` e loggare con Pino se > 2s

## Dev Notes

### Stack Tecnologico e Versioni

- **Next.js 16.1**: React Server Components, `use cache`, Suspense streaming
- **Recharts**: Via shadcn/ui Charts per sparkline e grafico area emissioni
- **Tailwind CSS 4.x**: Layout responsive, CSS variables per tematizzazione
- **shadcn/ui**: Card, Progress, Tooltip, Skeleton come base per componenti custom

### Decisioni Architetturali Rilevanti

- **FA-1 State Management**: RSC per read, nessun client state per la dashboard. I dati sono fetched server-side
- **FA-2 Data Fetching**: Server Components async con Prisma query diretta tramite service layer
- **FA-4 Charts**: Recharts via shadcn/ui Charts per sparkline e grafici
- **DA-6 Caching**: `use cache` per KPI con revalidazione a 5 minuti, sufficiente per la scala attuale
- **AC-2 Error Handling**: Error boundary dedicata per la dashboard con retry

### Struttura Componenti Dashboard

```
src/
├── app/(dashboard)/
│   ├── page.tsx                    # Dashboard FM (RSC, role-based)
│   ├── loading.tsx                 # Skeleton dashboard
│   ├── error.tsx                   # Error boundary
│   └── components/
│       └── NotificationPanel.tsx   # Pannello notifiche
├── components/data-display/
│   ├── KPICard.tsx                 # Hero metric + trend + sparkline
│   ├── DeltaBar.tsx                # Barra comparativa teorico vs reale
│   └── ProgressTarget.tsx          # Progress bar con milestone
└── lib/services/
    └── dashboard-service.ts        # Business logic KPI, trend, delta, target
```

### Palette Colori per Dashboard

| Elemento | Token CSS | Uso |
|---|---|---|
| Trend positivo (emissioni in calo) | `--success` Emerald 500 | Freccia giu, testo percentuale |
| Trend negativo (emissioni in aumento) | `--destructive` Red 500 | Freccia su, testo percentuale |
| Emissioni teoriche (grafico) | Teal 400 `hsl(168, 65%, 45%)` | Barra/linea teorico |
| Emissioni reali (grafico) | Slate 500 `hsl(215, 16%, 47%)` | Barra/linea reale |
| Delta positivo (reale < teorico) | `--success` | Sotto il teorico = bene |
| Delta negativo (reale > teorico) | `--destructive` | Sopra il teorico = attenzione |
| Progress on-track | `--success` | Barra progress |
| Progress at-risk | `--warning` Amber 500 | Barra progress |
| Progress off-track | `--destructive` | Barra progress |

### KPICard — Props Interface

```typescript
interface KPICardProps {
  label: string
  value: string | number
  unit?: string
  icon?: LucideIcon
  trend?: {
    value: number      // percentuale, es. -8.0
    direction: "up" | "down" | "neutral"
    label?: string     // "vs mese precedente"
  }
  sparklineData?: number[]  // array 12 punti per sparkline
  variant?: "default" | "compact" | "hero"
  state?: "loading" | "populated" | "no-data" | "error"
}
```

### DeltaBar — Props Interface

```typescript
interface DeltaBarProps {
  theoretical: number
  actual: number
  unit?: string          // "tCO2e"
  variant?: "inline" | "full" | "mini"
  showLabels?: boolean
}
```

### ProgressTarget — Props Interface

```typescript
interface ProgressTargetProps {
  targetValue: number
  currentValue: number
  unit?: string          // "tCO2e"
  variant?: "full" | "compact"
  milestones?: {
    label: string        // "Q1", "Q2", etc.
    status: "completed" | "current" | "pending"
  }[]
  status?: "on-track" | "at-risk" | "off-track" | "no-target"
}
```

### Formattazione Numeri Locale IT

```typescript
// Utility per formattazione numeri
const formatNumber = (value: number, decimals = 0) =>
  new Intl.NumberFormat('it-IT', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)

// Emissioni: "158 tCO2e" o "12.400 gCO2e"
// Percentuale: "+9,0%" o "-8,0%"
// Km: "18.400"
```

### Performance Budget

- Dashboard load completa: < 2s (NFR3)
- KPI cards (sopra la piega): < 500ms (prima priorita streaming)
- Grafici e notifiche: < 2s (seconda priorita streaming)
- Query singola KPI: < 200ms con indici appropriati

### Anti-Pattern da Evitare

- NON usare client-side fetching (useEffect + fetch) per i dati KPI — usare RSC
- NON calcolare emissioni nel componente — delegare a dashboard-service.ts
- NON hardcodare colori — usare CSS variables (`--success`, `--destructive`, etc.)
- NON creare un unico query monolitico — separare queries per sezione per abilitare streaming
- NON mostrare spinner centrato come loading — usare skeleton layout

### Dipendenze da altre Story

- **Epic 5 (Rifornimenti & Km)**: I dati di rifornimenti e rilevazioni km devono esistere per calcolare le emissioni
- **Epic 6 (Calcolo Emissioni)**: Il servizio di calcolo emissioni (emission-calculator.ts) deve essere disponibile
- **Story 6.3 (Target Emissioni)**: I target configurati devono esistere per ProgressTarget
- **Story 7.3 (Design System)**: I componenti custom (KPICard, DeltaBar, ProgressTarget) possono essere sviluppati in parallelo o come parte di questa story

### References

- [Source: architecture.md#FA-4] — Recharts via shadcn/ui Charts
- [Source: architecture.md#DA-6] — `use cache` per caching
- [Source: architecture.md#FA-2] — Server Components per data fetching
- [Source: ux-design-specification.md#KPICard] — Anatomia e specifiche componente
- [Source: ux-design-specification.md#DeltaBar] — Anatomia e specifiche componente
- [Source: ux-design-specification.md#ProgressTarget] — Anatomia e specifiche componente
- [Source: ux-design-specification.md#Dashboard Fleet Manager] — Layout e contenuto
- [Source: epics.md#Story 7.1] — Acceptance criteria BDD
- [Source: prd.md#FR42] — KPI dashboard Fleet Manager
- [Source: prd.md#NFR3] — Dashboard < 2s
