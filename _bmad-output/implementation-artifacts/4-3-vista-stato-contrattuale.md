# Story 4.3: Vista Stato Contrattuale

Status: done

## Story

As a **Fleet Manager**,
I want **visualizzare lo stato contrattuale di tutti i veicoli del mio tenant**,
So that **posso monitorare scadenze, rinnovi e situazioni contrattuali critiche**.

## Acceptance Criteria

1. La vista mostra tutti i veicoli con il contratto attivo corrente e la scadenza (FR24)
2. I contratti in scadenza entro 30/60/90 giorni sono evidenziati con StatusBadge warning
3. I veicoli senza contratto attivo sono evidenziati con StatusBadge destructive
4. La vista supporta filtri per tipo contratto, stato e scadenza
5. Il FM puo cliccare su un veicolo per vedere il dettaglio contrattuale completo
6. La DataTable include sorting, paginazione e ricerca

## Tasks / Subtasks

- [ ] Task 1: Creare servizio per aggregazione dati stato contrattuale (AC: #1, #2, #3)
  - [ ] 1.1 In `src/lib/services/contract-service.ts`, creare funzione `getContractStatusOverview(prisma, filters?)` che ritorna la lista veicoli con stato contrattuale aggregato
  - [ ] 1.2 La query deve joinare Vehicle + Contract (ultimo ACTIVE per veicolo) e calcolare:
    - `vehicle`: dati veicolo (id, targa, marca, modello)
    - `activeContract`: contratto attivo (tipo, startDate, endDate, fornitore/societa) oppure `null` se nessun contratto attivo
    - `expiryStatus`: enum calcolato (`EXPIRED | EXPIRING_30 | EXPIRING_60 | EXPIRING_90 | OK | NO_CONTRACT`)
    - `daysToExpiry`: numero giorni alla scadenza (null se Proprietario senza endDate o se nessun contratto)
  - [ ] 1.3 La logica di `expiryStatus` si basa su `endDate` del contratto attivo:
    - `NO_CONTRACT`: nessun contratto ACTIVE
    - `EXPIRED`: endDate < oggi
    - `EXPIRING_30`: endDate entro 30 giorni
    - `EXPIRING_60`: endDate entro 60 giorni
    - `EXPIRING_90`: endDate entro 90 giorni
    - `OK`: endDate oltre 90 giorni o contratto Proprietario senza endDate
  - [ ] 1.4 Supportare filtri opzionali: `contractType` (ContractType[]), `expiryStatus` (ExpiryStatus[]), `search` (stringa per targa/marca/modello)
  - [ ] 1.5 Supportare paginazione con `PaginatedResult<ContractStatusRow>` e sorting per colonna
  - [ ] 1.6 Definire tipo `ContractStatusRow` e enum `ExpiryStatus` in `src/types/domain.ts`
- [ ] Task 2: Creare pagina stato contrattuale (AC: #1, #5, #6)
  - [ ] 2.1 Creare `src/app/(dashboard)/contracts/status/page.tsx` — Server Component che carica i dati aggregati e renderizza la DataTable
  - [ ] 2.2 Titolo pagina "Stato Contrattuale", breadcrumb `Dashboard > Contratti > Stato`
  - [ ] 2.3 Creare `src/app/(dashboard)/contracts/status/loading.tsx` — skeleton DataTable
  - [ ] 2.4 Creare `src/app/(dashboard)/contracts/status/error.tsx` — error boundary con retry
  - [ ] 2.5 Aggiungere link "Stato contrattuale" nella sidebar sotto la sezione Contratti
- [ ] Task 3: Creare componente ContractStatusTable (AC: #1, #2, #3, #5, #6)
  - [ ] 3.1 Creare `src/app/(dashboard)/contracts/components/ContractStatusTable.tsx` — componente client (`"use client"`) con TanStack Table + shadcn/ui DataTable
  - [ ] 3.2 Colonne della DataTable:
    - **Veicolo**: targa (bold, mono uppercase) + marca modello sotto in `text-muted-foreground`
    - **Tipo Contratto**: badge colorato con il tipo (o "-" se nessun contratto)
    - **Fornitore/Societa**: nome fornitore o societa leasing (o "-" se Proprietario o nessun contratto)
    - **Scadenza**: data formattata `dd MMM yyyy` (o "-" se Proprietario o nessun contratto)
    - **Giorni alla scadenza**: numero giorni con colore condizionale (rosso < 30, arancio < 60, giallo < 90, verde > 90)
    - **Stato**: StatusBadge con variante basata su `expiryStatus`
  - [ ] 3.3 StatusBadge mapping:
    - `NO_CONTRACT` → variant "destructive", label "Senza contratto"
    - `EXPIRED` → variant "destructive", label "Scaduto"
    - `EXPIRING_30` → variant "warning", label "Scade entro 30gg"
    - `EXPIRING_60` → variant "warning", label "Scade entro 60gg"
    - `EXPIRING_90` → variant "warning", label "Scade entro 90gg"
    - `OK` → variant "success", label "Attivo"
  - [ ] 3.4 Click su riga: naviga a `/vehicles/[id]` (tab contratti) per il dettaglio contrattuale completo
  - [ ] 3.5 Sorting abilitato su tutte le colonne. Default sort: `expiryStatus` (piu critici prima)
  - [ ] 3.6 Paginazione default 50 righe
  - [ ] 3.7 Search con debounce 300ms su targa, marca, modello
- [ ] Task 4: Implementare filtri per la vista (AC: #4)
  - [ ] 4.1 Creare `src/app/(dashboard)/contracts/components/ContractStatusFilters.tsx` — componente client con filtri sopra la DataTable
  - [ ] 4.2 Filtro "Tipo contratto": shadcn/ui `Select` multi-select con opzioni dai 4 tipi ContractType + "Tutti"
  - [ ] 4.3 Filtro "Stato scadenza": shadcn/ui `Select` multi-select con opzioni: Senza contratto, Scaduto, Scade entro 30gg, Scade entro 60gg, Scade entro 90gg, Attivo, Tutti
  - [ ] 4.4 I filtri attivi sono visualizzati come chip removibili sotto la barra filtri (pattern da ux-design-specification)
  - [ ] 4.5 Filtri applicati lato client (TanStack Table column filters) per dataset fino a ~500 veicoli, o lato server via search params se necessario per performance
  - [ ] 4.6 Bottone "Cancella filtri" per reset di tutti i filtri
- [ ] Task 5: Creare KPI riassuntivi stato contrattuale (AC: #1, #2, #3)
  - [ ] 5.1 Sopra la DataTable, mostrare 4 KPICard compatte con:
    - Totale veicoli (numero)
    - Con contratto attivo (numero, percentuale)
    - In scadenza (entro 90gg) (numero, variant warning)
    - Senza contratto (numero, variant destructive)
  - [ ] 5.2 Usare il componente `KPICard` da `src/components/data-display/KPICard.tsx` in variante compact
  - [ ] 5.3 I KPI si aggiornano quando i filtri cambiano
  - [ ] 5.4 Layout: grid 4 colonne desktop, 2 colonne tablet, 1 colonna mobile (`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4`)
- [ ] Task 6: Aggiungere navigazione e link alla vista (AC: #5)
  - [ ] 6.1 Nella sidebar, aggiungere link "Stato contrattuale" sotto il gruppo "Contratti" (icona: `FileCheck` da lucide-react)
  - [ ] 6.2 Nella pagina lista contratti `/contracts/page.tsx`, aggiungere bottone/link "Vista stato" che naviga a `/contracts/status`
  - [ ] 6.3 Nella pagina dettaglio veicolo, il tab "Contratti" mostra un link "Vedi stato contrattuale flotta" in fondo alla ContractTimeline

## Dev Notes

### Decisioni Architetturali Rilevanti

- **FA-5 TanStack Table:** DataTable con sorting, filtering e paginazione. Componente shadcn/ui DataTable gia disponibile nel progetto
- **FA-2 Data Fetching:** Server Component per caricamento iniziale dati. I filtri possono operare lato client per dataset piccoli (< 500 veicoli per tenant come da NFR14)
- **AC-2 Error Handling:** ActionResult<T> per le query service con gestione errori tipizzata
- **StatusBadge component:** Componente custom Greenfleet in `src/components/data-display/StatusBadge.tsx` per uniformita stati in tutta l'app

### Tipo ContractStatusRow

```typescript
// src/types/domain.ts

export enum ExpiryStatus {
  NO_CONTRACT = "NO_CONTRACT",
  EXPIRED = "EXPIRED",
  EXPIRING_30 = "EXPIRING_30",
  EXPIRING_60 = "EXPIRING_60",
  EXPIRING_90 = "EXPIRING_90",
  OK = "OK",
}

export type ContractStatusRow = {
  vehicle: {
    id: string
    licensePlate: string
    make: string
    model: string
    trim?: string
  }
  activeContract: {
    id: string
    type: ContractType
    startDate: Date | null
    endDate: Date | null
    supplier: string | null
    leasingCompany: string | null
    monthlyRate: number | null
    dailyRate: number | null
    purchasePrice: number | null
  } | null
  expiryStatus: ExpiryStatus
  daysToExpiry: number | null
}
```

### Query Aggregata per Stato Contrattuale

```typescript
// src/lib/services/contract-service.ts

export async function getContractStatusOverview(
  prisma: PrismaClient,
  filters?: {
    contractType?: ContractType[]
    expiryStatus?: ExpiryStatus[]
    search?: string
    page?: number
    pageSize?: number
    sortBy?: string
    sortDir?: "asc" | "desc"
  }
): Promise<PaginatedResult<ContractStatusRow>> {

  // Carica tutti i veicoli del tenant con il loro contratto attivo (se esiste)
  const vehicles = await prisma.vehicle.findMany({
    where: {
      // tenantId automatico via Prisma extension
      ...(filters?.search && {
        OR: [
          { licensePlate: { contains: filters.search } },
          { make: { contains: filters.search } },
          { model: { contains: filters.search } },
        ],
      }),
    },
    include: {
      contracts: {
        where: { status: "ACTIVE" },
        take: 1,
        orderBy: { createdAt: "desc" },
      },
    },
  })

  // Calcola expiryStatus per ogni veicolo
  const rows: ContractStatusRow[] = vehicles.map((vehicle) => {
    const activeContract = vehicle.contracts[0] ?? null
    const { expiryStatus, daysToExpiry } = calculateExpiryStatus(activeContract)
    return {
      vehicle: {
        id: vehicle.id,
        licensePlate: vehicle.licensePlate,
        make: vehicle.make,
        model: vehicle.model,
        trim: vehicle.trim,
      },
      activeContract: activeContract ? {
        id: activeContract.id,
        type: activeContract.type,
        startDate: activeContract.startDate,
        endDate: activeContract.endDate,
        supplier: activeContract.supplier,
        leasingCompany: activeContract.leasingCompany,
        monthlyRate: activeContract.monthlyRate?.toNumber() ?? null,
        dailyRate: activeContract.dailyRate?.toNumber() ?? null,
        purchasePrice: activeContract.purchasePrice?.toNumber() ?? null,
      } : null,
      expiryStatus,
      daysToExpiry,
    }
  })

  // Applica filtri post-query
  // ... paginazione, sorting ...

  return { data: paginatedRows, pagination: { page, pageSize, totalCount, totalPages } }
}

function calculateExpiryStatus(contract: Contract | null): {
  expiryStatus: ExpiryStatus
  daysToExpiry: number | null
} {
  if (!contract) return { expiryStatus: ExpiryStatus.NO_CONTRACT, daysToExpiry: null }
  if (!contract.endDate) return { expiryStatus: ExpiryStatus.OK, daysToExpiry: null } // Proprietario

  const today = new Date()
  const diffMs = contract.endDate.getTime() - today.getTime()
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays < 0) return { expiryStatus: ExpiryStatus.EXPIRED, daysToExpiry: diffDays }
  if (diffDays <= 30) return { expiryStatus: ExpiryStatus.EXPIRING_30, daysToExpiry: diffDays }
  if (diffDays <= 60) return { expiryStatus: ExpiryStatus.EXPIRING_60, daysToExpiry: diffDays }
  if (diffDays <= 90) return { expiryStatus: ExpiryStatus.EXPIRING_90, daysToExpiry: diffDays }
  return { expiryStatus: ExpiryStatus.OK, daysToExpiry: diffDays }
}
```

### StatusBadge Mapping Visuale

```tsx
// Mapping expiryStatus → StatusBadge props
const expiryStatusConfig: Record<ExpiryStatus, { variant: string; label: string }> = {
  NO_CONTRACT: { variant: "destructive", label: "Senza contratto" },
  EXPIRED: { variant: "destructive", label: "Scaduto" },
  EXPIRING_30: { variant: "warning", label: "Scade entro 30gg" },
  EXPIRING_60: { variant: "warning", label: "Scade entro 60gg" },
  EXPIRING_90: { variant: "warning", label: "Scade entro 90gg" },
  OK: { variant: "success", label: "Attivo" },
}
```

### Layout KPI + DataTable

```tsx
<div className="space-y-6">
  {/* KPI riassuntivi */}
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
    <KPICard variant="compact" title="Totale veicoli" value={totalVehicles} />
    <KPICard variant="compact" title="Con contratto" value={withContract} suffix={`(${pctWithContract}%)`} />
    <KPICard variant="compact" title="In scadenza" value={expiring} className="border-warning" />
    <KPICard variant="compact" title="Senza contratto" value={noContract} className="border-destructive" />
  </div>

  {/* Filtri */}
  <ContractStatusFilters
    onFilterChange={setFilters}
    activeFilters={filters}
  />

  {/* DataTable */}
  <ContractStatusTable data={rows} />
</div>
```

### Formattazione Date e Numeri

- Date: `Intl.DateTimeFormat("it-IT", { day: "2-digit", month: "short", year: "numeric" })` → `06 feb 2026`
- Importi: `Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" })` → `1.234,56 EUR`
- Giorni alla scadenza: numero intero con segno (negativo = scaduto)
- Targhe: maiuscolo monospace (`font-mono uppercase`)

### Convenzioni Naming Applicate

| Elemento | Convenzione | File |
|---|---|---|
| Service | kebab-case.ts in `services/` | `src/lib/services/contract-service.ts` (esteso) |
| React Component | PascalCase.tsx | `ContractStatusTable.tsx`, `ContractStatusFilters.tsx` |
| Pagina | page.tsx nella route | `src/app/(dashboard)/contracts/status/page.tsx` |
| Tipo | PascalCase | `ContractStatusRow`, `ExpiryStatus` |

### Struttura File Target

```
src/
├── types/
│   └── domain.ts                        # ExpiryStatus enum, ContractStatusRow type
├── lib/services/
│   └── contract-service.ts              # Esteso: getContractStatusOverview, calculateExpiryStatus
├── app/(dashboard)/contracts/
│   ├── status/
│   │   ├── page.tsx                     # Vista stato contrattuale (Server Component)
│   │   ├── loading.tsx                  # Skeleton DataTable + KPI
│   │   └── error.tsx                    # Error boundary
│   └── components/
│       ├── ContractStatusTable.tsx       # DataTable stato contrattuale
│       └── ContractStatusFilters.tsx     # Filtri tipo/stato/scadenza
└── components/
    └── data-display/
        ├── StatusBadge.tsx              # Gia esistente (se Story 3.x implementata)
        └── KPICard.tsx                  # Gia esistente (se Story 7.x implementata, altrimenti crearlo)
```

### Dipendenze da Story Precedenti

- **Story 4.1:** Modello Prisma Contract con STI, enum ContractType/ContractStatus, ContractTable
- **Story 4.2:** Campo `closedAt`, logica successione, ContractTimeline
- **Story 3.3:** Modello Vehicle con veicoli operativi e targa nel tenant
- **Story 1.2:** Multi-tenant con tenantId e Prisma extension
- **Componenti opzionali:** `StatusBadge` (Story 3.x) e `KPICard` (Story 7.x) — se non ancora implementati, crearli come versioni minimali in questa story

### Performance (NFR1)

La query aggregata deve completare in meno di 1 secondo (p95). Con il limite NFR14 di 500 veicoli per tenant, il caricamento di tutti i veicoli con il contratto attivo e fattibile in una singola query con include. Se necessario, aggiungere indice su `contracts(vehicleId, status)` per ottimizzare la subquery.

### Anti-Pattern da Evitare

- NON fare N+1 query (una per veicolo per trovare il contratto) — usare `include` o join
- NON calcolare expiryStatus nel frontend — calcolarlo nel service per coerenza
- NON hardcodare le soglie 30/60/90 — definirle come costanti in `src/lib/utils/constants.ts`
- NON filtrare manualmente per tenantId — il Prisma client extension lo fa automaticamente
- NON creare una pagina separata per ogni tipo di filtro — usare filtri componibili nella stessa vista
- NON mostrare "null" per campi assenti — usare "-" come fallback

### References

- [Source: architecture.md#FA-5] — TanStack Table + shadcn/ui DataTable
- [Source: architecture.md#FA-2] — Server Components per data fetching
- [Source: architecture.md#DA-2] — Single Table Inheritance per contratti
- [Source: epics.md#Story 4.3] — Acceptance criteria BDD
- [Source: prd.md#FR24] — Vista stato contrattuale complessiva
- [Source: prd.md#NFR1] — Azioni < 1s p95
- [Source: prd.md#NFR14] — 20 tenant x 500 veicoli
- [Source: ux-design-specification.md#StatusBadge] — Badge stato con varianti warning/destructive/success
- [Source: ux-design-specification.md#DataTable Pattern] — Sorting, filtri chip, search debounce 300ms, paginazione 50 righe
- [Source: ux-design-specification.md#KPICard] — Variante compact per KPI riassuntivi

## Dev Agent Record

### Agent Model Used



### Debug Log References

### Completion Notes List

### File List
