# Story 6.5: Drill-Down e Progresso Target

Status: done

## Story

As a **Fleet Manager**,
I want **effettuare drill-down dai report aggregati al dettaglio e visualizzare il progresso verso il target**,
So that **posso identificare i veicoli o le carlist che contribuiscono maggiormente alle emissioni**.

## Acceptance Criteria

1. Il sistema mostra il dettaglio per veicolo o carlist con emissioni individuali (FR41)
2. Il FM puo visualizzare il progresso verso il target configurato (FR39)
3. Il drill-down e progressivo: flotta > carlist > veicolo
4. Ogni livello mostra il contributo percentuale al totale
5. Il componente ProgressTarget mostra la posizione attuale rispetto al target con milestone

## Tasks / Subtasks

- [ ] Task 1: Estendere report-service con funzioni drill-down (AC: #1, #3, #4)
  - [ ] 1.1 Aggiungere funzione `getFleetOverview(prisma, dateRange)` in `src/lib/services/report-service.ts` — ritorna emissioni aggregate a livello flotta con breakdown per carlist. Ogni carlist include: nome, emissioni teoriche/reali, delta, km totali, numero veicoli, percentuale contributo sul totale flotta
  - [ ] 1.2 Aggiungere funzione `getCarlistDetail(prisma, carlistId, dateRange)` — ritorna emissioni aggregate per singola carlist con breakdown per veicolo. Ogni veicolo include: targa, marca/modello, emissioni teoriche/reali, delta, km percorsi, percentuale contributo sulla carlist
  - [ ] 1.3 Aggiungere funzione `getVehicleDetail(prisma, vehicleId, dateRange)` — ritorna dettaglio emissioni singolo veicolo: serie temporale mensile emissioni teoriche/reali, dettaglio rifornimenti nel periodo, dettaglio rilevazioni km, DeltaBar data per visualizzazione
  - [ ] 1.4 Ogni funzione calcola `contributionPercentage` come: (emissioni reali del sotto-elemento / emissioni reali totali del livello padre) * 100
  - [ ] 1.5 Ordinare i risultati per emissioni reali DESC di default (i maggiori contributori in cima)
- [ ] Task 2: Creare funzioni progresso target nel report-service (AC: #2, #5)
  - [ ] 2.1 Aggiungere funzione `getTargetProgress(prisma, params)` in `src/lib/services/report-service.ts` dove params include: scope (FLEET o CARLIST), scopeId (carlistId se CARLIST), dateRange. La funzione carica il target configurato (da Story 6.3) e calcola: emissioni correnti nel periodo, target nel periodo, percentuale raggiungimento, proiezione a fine periodo basata sul trend corrente
  - [ ] 2.2 Implementare calcolo `projectedEmissions`: basato sulla media mensile corrente, proiettare le emissioni per i mesi rimanenti nel periodo target
  - [ ] 2.3 Implementare calcolo milestone: suddividere il target in milestone intermedie (25%, 50%, 75%, 100%) con date corrispondenti e stato (raggiunto/in_corso/futuro)
  - [ ] 2.4 Ritornare tipo `TargetProgress` con: target configurato, emissioni correnti, percentuale raggiungimento, proiezione, milestones, status (on_track/at_risk/off_track)
- [ ] Task 3: Creare tipi TypeScript per drill-down e progresso (AC: #1, #2, #4)
  - [ ] 3.1 Aggiungere in `src/types/report.ts` i tipi: `DrillDownLevel` (enum: FLEET, CARLIST, VEHICLE), `DrillDownItem` (id, label, subtitle, theoreticalEmissions, realEmissions, delta, deltaPercentage, totalKm, contributionPercentage, childCount), `DrillDownResult` (level, parentLabel, items, totalEmissions)
  - [ ] 3.2 Aggiungere tipi `TargetProgress` (targetValue, currentEmissions, percentageAchieved, projectedEmissions, projectedPercentage, milestones, status), `Milestone` (label, percentage, targetDate, status), `TargetStatus` (enum: ON_TRACK, AT_RISK, OFF_TRACK)
  - [ ] 3.3 Aggiungere tipo `VehicleEmissionDetail` (vehicleId, plate, makeModel, monthlySeries, fuelRecords, kmReadings, deltaBarData)
- [ ] Task 4: Creare Server Actions per drill-down (AC: #1, #3)
  - [ ] 4.1 Creare `src/app/(dashboard)/emissions/actions/drill-down.ts` con Server Action `drillDown(level, id, dateRange)` — in base al livello chiama la funzione appropriata del report-service. Valida input con Zod, verifica RBAC (Admin o FM), ritorna ActionResult<DrillDownResult>
  - [ ] 4.2 Creare `src/app/(dashboard)/emissions/actions/get-target-progress.ts` con Server Action `getTargetProgressAction(scope, scopeId, dateRange)` — chiama report-service, ritorna ActionResult<TargetProgress>
- [ ] Task 5: Creare componente navigazione drill-down (AC: #1, #3, #4)
  - [ ] 5.1 Creare `src/app/(dashboard)/emissions/components/DrillDownNavigator.tsx` — componente client che gestisce lo stato della navigazione drill-down. Mantiene uno stack di livelli (breadcrumb): [Flotta] > [Carlist X] > [Veicolo Y]. Cliccando su un breadcrumb si torna al livello corrispondente
  - [ ] 5.2 Implementare breadcrumb drill-down con shadcn/ui Breadcrumb: ogni livello cliccabile, livello corrente evidenziato, icone per tipo livello (Building2 per flotta, List per carlist, Car per veicolo)
  - [ ] 5.3 Implementare transizione tra livelli con loading skeleton durante il caricamento dei dati del nuovo livello
  - [ ] 5.4 Mantenere i parametri dateRange invariati durante il drill-down (ereditati dal report padre)
- [ ] Task 6: Creare componente lista drill-down con contributo percentuale (AC: #1, #4)
  - [ ] 6.1 Creare `src/app/(dashboard)/emissions/components/DrillDownList.tsx` — DataTable con TanStack Table che mostra gli elementi del livello corrente. Colonne: nome/label, emissioni reali (kgCO2e), emissioni teoriche (kgCO2e), delta (con DeltaBar inline), km totali, contributo % (barra di progresso orizzontale + percentuale)
  - [ ] 6.2 La colonna contributo percentuale mostra una barra orizzontale proporzionale (shadcn/ui Progress) con la percentuale a fianco, colorata dal design system (teal per valori normali, amber per contributi > 20%, red per > 35%)
  - [ ] 6.3 Ogni riga e cliccabile: al click su una carlist si drilla al livello VEHICLE per quella carlist, al click su un veicolo si drilla al dettaglio veicolo
  - [ ] 6.4 Sorting su tutte le colonne, default per emissioni reali DESC
  - [ ] 6.5 Formattazione numeri in locale IT coerente con Story 6.4
  - [ ] 6.6 Implementare EmptyState quando non ci sono dati per il livello corrente
- [ ] Task 7: Creare componente dettaglio veicolo emissioni (AC: #1)
  - [ ] 7.1 Creare `src/app/(dashboard)/emissions/components/VehicleEmissionDetail.tsx` — vista dettaglio per il livello piu basso del drill-down. Mostra: header con VehicleHeader (targa, marca/modello, immagine se disponibile), KPI cards (emissioni teoriche, reali, delta, km totali nel periodo)
  - [ ] 7.2 Grafico a linee mensile con emissioni teoriche vs reali (riutilizzo EmissionTimeSeriesChart da Story 6.4 con dati filtrati per singolo veicolo)
  - [ ] 7.3 DeltaBar hero che mostra il confronto teorico vs reale per il veicolo nel periodo
  - [ ] 7.4 Tabella rifornimenti nel periodo: data, tipo carburante, quantita litri, importo, km. Formattazione locale IT
  - [ ] 7.5 Tabella rilevazioni km nel periodo: data, km, fonte (rifornimento o dedicata)
- [ ] Task 8: Implementare componente ProgressTarget (AC: #2, #5)
  - [ ] 8.1 Creare `src/components/data-display/ProgressTarget.tsx` — componente riutilizzabile (shared, non feature-specific) che visualizza il progresso verso un target. Riceve come props: targetValue, currentValue, projectedValue, milestones, status, label, unit
  - [ ] 8.2 Implementare barra di progresso orizzontale con shadcn/ui Progress come base, estesa con: marker milestone posizionati sulla barra (cerchietti con tooltip), area colorata per progresso corrente (verde se on_track, amber se at_risk, rosso se off_track), linea tratteggiata per proiezione
  - [ ] 8.3 Sotto la barra mostrare: valore corrente / target (es. "1.234 / 2.000 kgCO2e"), percentuale raggiungimento, status testuale ("In linea col target" / "A rischio" / "Fuori target")
  - [ ] 8.4 Milestone labels sopra la barra con date e stato (checkmark verde se raggiunto, cerchio vuoto se futuro)
  - [ ] 8.5 Varianti: `default` (barra completa con milestone), `compact` (solo barra e percentuale, senza milestone — per uso in cards o tabelle)
  - [ ] 8.6 Responsive: su mobile la barra occupa tutta la larghezza, milestone labels stackati verticalmente
- [ ] Task 9: Integrare ProgressTarget nel report e drill-down (AC: #2, #5)
  - [ ] 9.1 Aggiungere sezione ProgressTarget nella pagina report emissioni (EmissionDashboard da Story 6.4) sotto i KPI cards, visibile solo se esiste un target configurato per la flotta
  - [ ] 9.2 Nel drill-down livello CARLIST: mostrare ProgressTarget compatto se la carlist ha un target configurato
  - [ ] 9.3 Caricare i dati target progress tramite la Server Action get-target-progress.ts
  - [ ] 9.4 Mostrare messaggio informativo se nessun target e configurato: "Nessun target emissioni configurato. Configura un target in Impostazioni."
- [ ] Task 10: Integrare drill-down interattivo nei grafici (AC: #1, #3)
  - [ ] 10.1 Aggiungere click handler al grafico BarChart di EmissionBreakdownChart (Story 6.4): cliccando su una barra si attiva il drill-down per quella categoria
  - [ ] 10.2 Aggiungere cursor pointer e highlight on-hover sulle barre cliccabili
  - [ ] 10.3 Coordinare il click sul grafico con il DrillDownNavigator per aggiornare lo stack di navigazione

## Dev Notes

### Architettura Drill-Down

Il drill-down segue un pattern a stack di navigazione. Il componente `DrillDownNavigator` mantiene lo stato corrente del livello visualizzato e la storia di navigazione. Il flusso e:

```
[Flotta]  ──click carlist──>  [Carlist X]  ──click veicolo──>  [Veicolo Y]
   ^                              ^                                  |
   |                              |                                  |
   └──────── breadcrumb click ────┘──────── breadcrumb click ────────┘
```

Ogni livello carica i dati on-demand tramite Server Action. I parametri dateRange sono condivisi e invariati tra i livelli.

### Tipi Drill-Down

```typescript
// Da aggiungere in src/types/report.ts

export enum DrillDownLevel {
  FLEET = "FLEET",
  CARLIST = "CARLIST",
  VEHICLE = "VEHICLE",
}

export type DrillDownItem = {
  id: string
  label: string               // Nome carlist o targa+marca/modello
  subtitle?: string           // Sottotitolo opzionale (es. "12 veicoli" per carlist)
  theoreticalEmissions: number
  realEmissions: number
  delta: number
  deltaPercentage: number
  totalKm: number
  contributionPercentage: number  // % contributo sul totale del livello padre
  childCount?: number             // Numero sotto-elementi (veicoli nella carlist)
}

export type DrillDownResult = {
  level: DrillDownLevel
  parentLabel: string             // "Flotta Greenfleet Demo" o "Carlist Commerciali"
  parentId?: string
  items: DrillDownItem[]
  totalEmissions: number          // Totale emissioni reali del livello
  totalTheoreticalEmissions: number
}

export type TargetStatus = "ON_TRACK" | "AT_RISK" | "OFF_TRACK"

export type Milestone = {
  label: string                   // "25%", "50%", "75%", "100%"
  percentage: number
  targetDate: Date
  status: "achieved" | "in_progress" | "future"
}

export type TargetProgress = {
  targetValue: number             // kgCO2e target
  currentEmissions: number        // kgCO2e attuali
  percentageAchieved: number      // (current / target) * 100
  projectedEmissions: number      // Proiezione a fine periodo
  projectedPercentage: number
  milestones: Milestone[]
  status: TargetStatus
  scope: "FLEET" | "CARLIST"
  scopeLabel: string
  dateRange: { startDate: Date; endDate: Date }
}
```

### Calcolo Contributo Percentuale

```typescript
// Nel report-service.ts
function calculateContributions(items: DrillDownItem[], totalEmissions: number): DrillDownItem[] {
  return items.map(item => ({
    ...item,
    contributionPercentage: totalEmissions > 0
      ? (item.realEmissions / totalEmissions) * 100
      : 0,
  }))
}
```

### Calcolo Proiezione Target

```typescript
// Nel report-service.ts
function calculateProjection(
  currentEmissions: number,
  dateRange: { startDate: Date; endDate: Date },
  now: Date
): number {
  const totalMonths = differenceInMonths(dateRange.endDate, dateRange.startDate)
  const elapsedMonths = differenceInMonths(now, dateRange.startDate)

  if (elapsedMonths <= 0) return 0

  const monthlyAverage = currentEmissions / elapsedMonths
  return monthlyAverage * totalMonths
}

// Status determination
function determineTargetStatus(
  percentageAchieved: number,
  projectedPercentage: number
): TargetStatus {
  // Target emissioni: vogliamo stare SOTTO il target
  // percentageAchieved < 80% del periodo trascorso → ON_TRACK
  // percentageAchieved 80-100% → AT_RISK
  // percentageAchieved > 100% o proiezione > 110% → OFF_TRACK
  if (projectedPercentage > 110 || percentageAchieved > 100) return "OFF_TRACK"
  if (projectedPercentage > 90 || percentageAchieved > 80) return "AT_RISK"
  return "ON_TRACK"
}
```

### Componente ProgressTarget — Specifiche Visive

```typescript
// src/components/data-display/ProgressTarget.tsx
// Componente shared riutilizzabile

type ProgressTargetProps = {
  targetValue: number
  currentValue: number
  projectedValue?: number
  milestones?: Milestone[]
  status: TargetStatus
  label: string               // es. "Target Emissioni Flotta 2026"
  unit: string                // es. "kgCO2e"
  variant?: "default" | "compact"
}

// Colori status:
// ON_TRACK  → hsl(142, 76%, 36%) — green-600
// AT_RISK   → hsl(38, 92%, 50%)  — amber-500
// OFF_TRACK → hsl(0, 84%, 60%)   — red-500

// La barra Progress e sovrascritta con colore status
// La proiezione e mostrata come segmento tratteggiato oltre il valore corrente
```

### Struttura File Target

```
src/
├── app/
│   └── (dashboard)/
│       └── emissions/
│           ├── actions/
│           │   ├── generate-report.ts            # Esistente da Story 6.4
│           │   ├── drill-down.ts                 # NUOVO: Server Action drill-down
│           │   └── get-target-progress.ts        # NUOVO: Server Action progresso target
│           └── components/
│               ├── EmissionDashboard.tsx          # Esistente da Story 6.4 — aggiungere ProgressTarget
│               ├── EmissionBreakdownChart.tsx     # Esistente da Story 6.4 — aggiungere click handler
│               ├── DrillDownNavigator.tsx         # NUOVO: Navigazione drill-down con breadcrumb
│               ├── DrillDownList.tsx              # NUOVO: DataTable drill-down con contributo %
│               └── VehicleEmissionDetail.tsx      # NUOVO: Dettaglio emissioni singolo veicolo
├── components/
│   └── data-display/
│       └── ProgressTarget.tsx                    # NUOVO: Componente shared progresso target
├── lib/
│   └── services/
│       └── report-service.ts                     # Esistente da Story 6.4 — estendere con drill-down e target progress
└── types/
    └── report.ts                                 # Esistente da Story 6.4 — aggiungere tipi drill-down e target
```

### Decisioni Architetturali Rilevanti

- **DA-1 Multi-Tenant:** tenantId filtrato automaticamente via Prisma extension su tutte le query drill-down
- **AC-1 Pattern API Ibrido:** Server Actions per drill-down e target progress
- **AC-2 Error Handling:** ActionResult<DrillDownResult> e ActionResult<TargetProgress>
- **FA-1 State Management:** useState per stack navigazione drill-down, useActionState per loading
- **FA-4 Charts:** Click handler sui grafici Recharts per drill-down interattivo
- **FA-5 DataTable:** TanStack Table per DrillDownList con sorting e click-through

### Dipendenze da Story Precedenti

- **Story 1.1:** Scaffold progetto, Better Auth, middleware, ActionResult<T>
- **Story 1.2:** Prisma client extension per auto-filter tenantId
- **Story 1.4:** Permissions helper (hasRole, canAccess)
- **Story 3.3:** TenantVehicle model (veicoli operativi — per livello VEHICLE)
- **Story 3.8:** Carlist model (raggruppamenti veicoli — per livello CARLIST)
- **Story 5.1:** FuelRecord model (rifornimenti — per dettaglio veicolo)
- **Story 5.3:** KmReading model (rilevazioni km — per dettaglio veicolo)
- **Story 6.2:** emission-calculator.ts (calcolo emissioni per veicolo)
- **Story 6.3:** EmissionTarget model (target configurati per flotta/carlist)
- **Story 6.4:** report-service.ts, EmissionDashboard, EmissionBreakdownChart, tipi report, formattazione numeri locale IT

### Anti-Pattern da Evitare

- NON caricare tutti i livelli drill-down in anticipo — caricare on-demand al click
- NON duplicare logica di calcolo emissioni — riutilizzare emission-calculator.ts e report-service.ts
- NON navigare via URL params per il drill-down — gestire lo stato lato client per fluidita
- NON hardcodare le soglie di TargetStatus — renderle configurabili o almeno centralizzate in costanti
- NON dimenticare il caso "nessun target configurato" — mostrare messaggio informativo, non errore
- NON creare Server Actions dentro page.tsx — metterle in `actions/` directory
- NON fare business logic nei componenti — delegare a report-service.ts
- NON usare `any` — tipi espliciti per ogni livello di drill-down

### Formattazione e UX

- Breadcrumb drill-down con icone: Building2 (flotta), List (carlist), Car (veicolo)
- Transizioni tra livelli con skeleton loading (nessun flash bianco)
- Contributo percentuale con barra colorata (teal/amber/red in base alla soglia)
- ProgressTarget con colori semantici per status (verde/amber/rosso)
- Click su barre dei grafici per drill-down: cursor pointer + highlight on-hover
- Tutti i numeri formattati in locale IT con unita di misura (kgCO2e, km, L, %)

### References

- [Source: architecture.md#DA-1] — Multi-tenant con tenantId pervasivo
- [Source: architecture.md#FA-4] — Recharts via shadcn/ui Charts
- [Source: architecture.md#FA-1] — State management: useState per UI locale
- [Source: architecture.md#Structure Patterns] — emissions/ directory
- [Source: epics.md#Story 6.5] — Acceptance criteria BDD
- [Source: prd.md#FR39] — Progresso verso target configurato
- [Source: prd.md#FR41] — Drill-down da aggregato a dettaglio per veicolo/carlist
- [Source: ux-design-specification.md] — ProgressTarget component, DeltaBar component, VehicleHeader component

## Dev Agent Record

### Agent Model Used



### Debug Log References

### Completion Notes List

### File List
