# Story 3.9: Vista Stato Flotta Complessiva

Status: done

## Story

As a **Fleet Manager**,
I want **visualizzare lo stato complessivo di tutti i veicoli, contratti e dipendenti del mio tenant**,
So that **posso avere una panoramica immediata della situazione della mia flotta**.

## Acceptance Criteria

1. Visualizza tutti i veicoli con stato corrente: attivo/inattivo, assegnato/libero (FR45)
2. Visualizza lo stato contrattuale di ogni veicolo (contratto attivo, tipo, scadenza)
3. Visualizza i dipendenti con lo stato di assegnazione (assegnato a veicolo / non assegnato)
4. La vista supporta filtri, sorting e ricerca
5. Gli stati sono rappresentati con StatusBadge coerente con il design system
6. La vista mostra EmptyState appropriato quando non ci sono dati

## Tasks / Subtasks

- [ ] Task 1: Creare fleet overview service per aggregazione dati (AC: #1, #2, #3)
  - [ ] 1.1 Creare `src/lib/services/fleet-overview-service.ts` con funzione `getFleetOverview(prisma, filters)` che aggrega dati da veicoli, contratti e dipendenti in un'unica query ottimizzata
  - [ ] 1.2 Per ogni veicolo ritornare: id, targa, marca/modello, stato (attivo/inattivo), assegnazione (dipendente assegnato o "Libero" o "Pool"), contratto attivo (tipo, scadenza) o "Nessun contratto", documenti scaduti/in scadenza (conteggio)
  - [ ] 1.3 Creare funzione `getEmployeeOverview(prisma, filters)` che ritorna dipendenti con stato assegnazione: nome, stato (attivo/inattivo), veicolo assegnato (targa + marca/modello) o "Non assegnato"
  - [ ] 1.4 Creare funzione `getFleetSummaryKPIs(prisma)` che ritorna KPI riassuntivi: totale veicoli, veicoli attivi, veicoli assegnati, veicoli liberi, contratti attivi, contratti in scadenza (30gg), documenti scaduti, dipendenti attivi, dipendenti non assegnati
  - [ ] 1.5 Ottimizzare le query con Prisma `include` e `select` per evitare N+1 queries — caricare relazioni in una sola query
  - [ ] 1.6 La risposta per veicoli deve essere PaginatedResult<FleetVehicleOverview> per supportare flotte grandi
- [ ] Task 2: Creare tipi TypeScript per la fleet overview (AC: #1, #2, #3)
  - [ ] 2.1 Creare `src/types/fleet-overview.ts` con tipo `FleetVehicleOverview`: { id, plate, make, model, status, assignee, activeContract, expiringDocumentsCount }
  - [ ] 2.2 Creare tipo `FleetEmployeeOverview`: { id, name, status, assignedVehicle }
  - [ ] 2.3 Creare tipo `FleetSummaryKPIs`: { totalVehicles, activeVehicles, assignedVehicles, freeVehicles, activeContracts, expiringContracts, expiredDocuments, activeEmployees, unassignedEmployees }
  - [ ] 2.4 Creare tipo `VehicleStatus` enum o union: "attivo" | "inattivo"
  - [ ] 2.5 Creare tipo `AssignmentStatus` enum o union: "assegnato" | "libero" | "pool"
- [ ] Task 3: Creare schema Zod per filtri (AC: #4)
  - [ ] 3.1 Creare `src/lib/schemas/fleet-overview.ts` con `fleetOverviewFilterSchema`: search (string opzionale — ricerca per targa, marca, modello, dipendente), vehicleStatus (attivo/inattivo/tutti), assignmentStatus (assegnato/libero/pool/tutti), contractStatus (con contratto/senza contratto/in scadenza/tutti), carlistId (opzionale), sortBy (plate | make | status | assignee | contractExpiry), sortOrder (asc | desc), page, pageSize
  - [ ] 3.2 Creare `employeeOverviewFilterSchema`: search (string opzionale — ricerca per nome), assignmentStatus (assegnato/non assegnato/tutti), status (attivo/inattivo/tutti), sortBy (name | status | vehicle), sortOrder (asc | desc), page, pageSize
- [ ] Task 4: Creare pagina vista stato flotta (AC: #1, #2, #3, #4, #5, #6)
  - [ ] 4.1 Creare `src/app/(dashboard)/fleet/page.tsx` — pagina panoramica flotta come React Server Component. Contiene: barra KPI riassuntivi in alto, tabs per "Veicoli" e "Dipendenti"
  - [ ] 4.2 La pagina carica i KPI riassuntivi tramite `getFleetSummaryKPIs` e li mostra come card compatte in una griglia
  - [ ] 4.3 Creare `src/app/(dashboard)/fleet/loading.tsx` — skeleton con cards KPI placeholder + tabella skeleton
  - [ ] 4.4 Creare `src/app/(dashboard)/fleet/error.tsx` — error boundary con messaggio user-friendly + bottone retry
  - [ ] 4.5 La performance della pagina deve rispettare NFR1 (< 1 secondo per azioni standard)
- [ ] Task 5: Creare componente KPI summary cards (AC: #1, #5)
  - [ ] 5.1 Creare `src/app/(dashboard)/fleet/components/FleetKPISummary.tsx` — griglia di card KPI compatte: Veicoli Attivi (n/totale), Veicoli Assegnati (n), Veicoli Liberi (n), Contratti Attivi (n), Documenti Scaduti (n, con StatusBadge destructive se > 0), Dipendenti Attivi (n)
  - [ ] 5.2 Ogni card usa shadcn/ui Card con layout compatto: valore numerico prominente + label
  - [ ] 5.3 I conteggi critici (documenti scaduti, contratti in scadenza) sono evidenziati con colore semantico (destructive/warning)
- [ ] Task 6: Creare DataTable veicoli con stato aggregato (AC: #1, #2, #4, #5)
  - [ ] 6.1 Creare `src/app/(dashboard)/fleet/components/FleetVehicleTable.tsx` — DataTable con TanStack Table + shadcn/ui per vista veicoli: colonne targa (mono uppercase), marca/modello, stato veicolo (StatusBadge: attivo=default, inattivo=secondary), assegnazione (nome dipendente o StatusBadge "Libero"/"Pool"), contratto (tipo + scadenza con StatusBadge warning se entro 30gg, destructive se scaduto, "—" se nessuno), documenti (conteggio scaduti/in scadenza con badge), azioni (vai a dettaglio veicolo)
  - [ ] 6.2 Implementare sorting su tutte le colonne
  - [ ] 6.3 Implementare filtri come chip sopra la tabella: stato veicolo (Select), assegnazione (Select), stato contratto (Select), carlist (CarlistFilter da story 3.8)
  - [ ] 6.4 Implementare ricerca globale con debounce 300ms (cerca per targa, marca, modello, dipendente)
  - [ ] 6.5 Paginazione 50 righe default
  - [ ] 6.6 Cliccando su una riga, navigare al dettaglio veicolo `vehicles/[id]`
- [ ] Task 7: Creare DataTable dipendenti con stato assegnazione (AC: #3, #4, #5)
  - [ ] 7.1 Creare `src/app/(dashboard)/fleet/components/FleetEmployeeTable.tsx` — DataTable con TanStack Table + shadcn/ui per vista dipendenti: colonne nome, stato (StatusBadge: attivo=default, inattivo=secondary), veicolo assegnato (targa + marca/modello, o StatusBadge "Non assegnato"), azioni (vai a dettaglio dipendente)
  - [ ] 7.2 Implementare sorting su tutte le colonne
  - [ ] 7.3 Implementare filtri: stato (attivo/inattivo), assegnazione (assegnato/non assegnato)
  - [ ] 7.4 Implementare ricerca per nome con debounce 300ms
  - [ ] 7.5 Paginazione 50 righe default
- [ ] Task 8: Implementare StatusBadge e EmptyState coerenti (AC: #5, #6)
  - [ ] 8.1 Verificare che `src/components/data-display/StatusBadge.tsx` supporti tutte le varianti necessarie per la fleet overview. Se non esiste ancora, crearlo come componente shared. Varianti: default (Attivo, Assegnato, Valido), secondary (Inattivo), warning (In scadenza), destructive (Scaduto, Libero senza contratto), outline (Pool, Non assegnato)
  - [ ] 8.2 Creare mappa coerente di stati e varianti StatusBadge per la fleet overview:
    - Veicolo attivo → default "Attivo"
    - Veicolo inattivo → secondary "Inattivo"
    - Veicolo assegnato → mostra nome dipendente (nessun badge)
    - Veicolo libero → outline "Libero"
    - Veicolo pool → outline "Pool"
    - Contratto attivo → default con tipo (es. "Leasing")
    - Contratto in scadenza → warning "Scade dd/mm"
    - Contratto scaduto → destructive "Scaduto"
    - Nessun contratto → testo "—"
    - Documenti scaduti → destructive badge con conteggio
    - Dipendente attivo → default "Attivo"
    - Dipendente inattivo → secondary "Inattivo"
    - Dipendente assegnato → mostra targa veicolo
    - Dipendente non assegnato → outline "Non assegnato"
  - [ ] 8.3 Verificare che `src/components/data-display/EmptyState.tsx` esista come componente shared. Se non esiste, crearlo. Varianti: action (con CTA primario), info (solo messaggio)
  - [ ] 8.4 Configurare EmptyState per fleet overview: variant "info" con messaggio "Nessun veicolo nella flotta" + suggerimento "Aggiungi veicoli dal catalogo per iniziare" + link a `/vehicles/new`
  - [ ] 8.5 Configurare EmptyState per tab dipendenti: variant "info" con messaggio "Nessun dipendente registrato" + link a creazione dipendente
- [ ] Task 9: Aggiungere navigazione nella sidebar (AC: #1)
  - [ ] 9.1 Aggiungere voce "Stato Flotta" nella sidebar sotto la sezione flotta, con icona appropriata (LayoutDashboard o ClipboardList)
  - [ ] 9.2 La voce e visibile solo per Admin e Fleet Manager (non per Driver)
  - [ ] 9.3 Aggiungere breadcrumb "Dashboard > Stato Flotta"

## Dev Notes

### Tipo FleetVehicleOverview

```typescript
// src/types/fleet-overview.ts

type VehicleStatus = "attivo" | "inattivo"
type AssignmentStatus = "assegnato" | "libero" | "pool"

type FleetVehicleOverview = {
  id: string
  plate: string
  make: string
  model: string
  trim?: string
  vehicleStatus: VehicleStatus
  assignmentStatus: AssignmentStatus
  assigneeName: string | null       // nome dipendente o null
  activeContract: {
    id: string
    type: string                     // Proprietario, BreveTer, LungoTer, LeasingFin
    expiryDate: Date | null
    isExpiring: boolean              // scade entro 30gg
    isExpired: boolean
  } | null
  expiringDocumentsCount: number     // documenti scaduti + in scadenza
  expiredDocumentsCount: number      // solo scaduti
}

type FleetEmployeeOverview = {
  id: string
  name: string
  status: "attivo" | "inattivo"
  assignedVehicle: {
    id: string
    plate: string
    make: string
    model: string
  } | null
}

type FleetSummaryKPIs = {
  totalVehicles: number
  activeVehicles: number
  assignedVehicles: number
  freeVehicles: number
  poolVehicles: number
  activeContracts: number
  expiringContracts: number          // entro 30gg
  expiredDocuments: number
  activeEmployees: number
  unassignedEmployees: number
}
```

### Query Ottimizzata — Veicoli con Relazioni

```typescript
// fleet-overview-service.ts — getFleetOverview
const vehicles = await prisma.tenantVehicle.findMany({
  where: {
    // filtri applicati dinamicamente
    ...(filters.vehicleStatus && { isActive: filters.vehicleStatus === "attivo" }),
    ...(filters.search && {
      OR: [
        { plate: { contains: filters.search } },
        { catalogVehicle: { make: { contains: filters.search } } },
        { catalogVehicle: { model: { contains: filters.search } } },
        { assignee: { name: { contains: filters.search } } },
      ]
    }),
    ...(filters.carlistId && {
      carlists: { some: { carlistId: filters.carlistId } }
    }),
  },
  include: {
    catalogVehicle: {
      select: { make: true, model: true, trim: true }
    },
    assignee: {
      select: { id: true, name: true }
    },
    contracts: {
      where: { isActive: true },
      select: { id: true, type: true, endDate: true },
      take: 1,
      orderBy: { endDate: "desc" }
    },
    documents: {
      where: {
        expiryDate: { lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) }
      },
      select: { id: true, expiryDate: true }
    }
  },
  orderBy: buildSortOrder(filters.sortBy, filters.sortOrder),
  skip: (filters.page - 1) * filters.pageSize,
  take: filters.pageSize,
})
```

### KPI Summary — Query Aggregata

```typescript
// Usare Prisma groupBy e count per KPI efficienti
const [vehicleStats, contractStats, employeeStats] = await Promise.all([
  prisma.tenantVehicle.groupBy({
    by: ["isActive"],
    _count: true,
  }),
  prisma.contract.count({
    where: { isActive: true }
  }),
  prisma.employee.groupBy({
    by: ["isActive"],
    _count: true,
  }),
])
```

### StatusBadge — Varianti Unificate

Il componente StatusBadge deve supportare un set coerente di varianti usabili in tutta l'applicazione. La fleet overview e il primo consumatore significativo di tutte le varianti.

```typescript
// StatusBadge variants
type StatusBadgeVariant = "default" | "secondary" | "outline" | "warning" | "destructive"

// Esempio utilizzo nella FleetVehicleTable
<StatusBadge variant="default">Attivo</StatusBadge>
<StatusBadge variant="secondary">Inattivo</StatusBadge>
<StatusBadge variant="outline">Libero</StatusBadge>
<StatusBadge variant="outline">Pool</StatusBadge>
<StatusBadge variant="warning">Scade 15/03</StatusBadge>
<StatusBadge variant="destructive">Scaduto</StatusBadge>
```

### EmptyState — Pattern Componente

```typescript
// EmptyState component
type EmptyStateProps = {
  variant: "action" | "info" | "permission"
  title: string
  description: string
  action?: {
    label: string
    href: string
  }
  icon?: React.ReactNode
}

// Esempio nella fleet overview
<EmptyState
  variant="info"
  title="Nessun veicolo nella flotta"
  description="Aggiungi veicoli dal catalogo per iniziare a monitorare la tua flotta."
  action={{ label: "Aggiungi veicolo", href: "/vehicles/new" }}
/>
```

### Struttura File Target

```
src/
├── app/
│   └── (dashboard)/
│       └── fleet/
│           ├── page.tsx                    # Panoramica flotta (RSC)
│           ├── loading.tsx                 # Skeleton
│           ├── error.tsx                   # Error boundary
│           └── components/
│               ├── FleetKPISummary.tsx     # Griglia KPI cards
│               ├── FleetVehicleTable.tsx   # DataTable veicoli con stato aggregato
│               └── FleetEmployeeTable.tsx  # DataTable dipendenti
├── components/
│   └── data-display/
│       ├── StatusBadge.tsx                # Componente shared (creare se non esiste)
│       └── EmptyState.tsx                 # Componente shared (creare se non esiste)
├── lib/
│   ├── schemas/
│   │   └── fleet-overview.ts
│   └── services/
│       └── fleet-overview-service.ts
└── types/
    └── fleet-overview.ts
```

### Decisioni Architetturali Rilevanti

- **DA-1 Multi-Tenant:** Tutte le query filtrate automaticamente per tenantId via Prisma extension
- **DA-4 Validazione Zod:** Schema Zod per filtri (fleetOverviewFilterSchema, employeeOverviewFilterSchema)
- **FA-1 State Management:** RSC per read — la pagina fleet e interamente server-rendered con filtri come URL search params
- **FA-2 Data Fetching:** Server Components con query Prisma diretta via service, streaming SSR
- **FA-5 DataTable:** TanStack Table + shadcn/ui DataTable per entrambe le tabelle (veicoli e dipendenti)
- **AC-2 Error Handling:** Error boundary per errori imprevisti, feedback inline per filtri non validi
- **AS-2 RBAC:** Pagina visibile solo ad Admin e Fleet Manager — Driver non ha accesso alla vista flotta complessiva

### Dipendenze da Story Precedenti

- **Story 1.1:** Scaffold progetto, middleware auth, struttura directory
- **Story 1.2:** Prisma client extension per auto-filter tenantId
- **Story 1.4:** Permissions helper per RBAC check (FM e Admin)
- **Story 3.1:** Model Employee (dipendenti)
- **Story 3.3:** Model TenantVehicle (veicoli operativi), pagina dettaglio veicolo
- **Story 3.4:** Assegnazione dipendenti a veicoli (relazione)
- **Story 3.5:** Pool pseudo-driver (stato "pool" per veicoli condivisi)
- **Story 3.7:** Model VehicleDocument (per conteggio documenti scaduti)
- **Story 3.8:** Carlist e CarlistFilter (per filtro per carlist)
- **Epic 4 (opzionale):** Se le story contratti sono completate, la colonna contratto mostra dati reali. Se non ancora implementate, la colonna mostra "—" con graceful degradation

### Performance Notes

- La pagina deve caricare in < 1 secondo (NFR1). Per tenant con 500 veicoli, le query devono essere ottimizzate con:
  - Indici su tenantId, isActive, plate nelle tabelle veicoli
  - Prisma `select` per caricare solo i campi necessari
  - Query parallele con `Promise.all` per KPI + lista veicoli + lista dipendenti
  - Paginazione server-side (50 righe default) — mai caricare tutti i veicoli in una sola query
- I filtri vengono passati come URL search params per supportare deep linking e back/forward del browser

### Anti-Pattern da Evitare

- NON caricare tutti i veicoli/dipendenti senza paginazione — usare sempre PaginatedResult
- NON fare N+1 queries (es. caricare contratto per ogni veicolo separatamente) — usare Prisma `include` in una sola query
- NON calcolare i KPI lato client — calcolarli lato server nel service con query aggregate
- NON duplicare la logica StatusBadge in ogni componente — usare il componente shared `StatusBadge.tsx`
- NON permettere al Driver di accedere a questa pagina — il middleware e la sidebar devono nasconderla
- NON hardcodare i colori dei badge — usare le varianti del design system (default, secondary, warning, destructive, outline)
- NON creare Server Actions per questa pagina — e una vista di sola lettura, i dati vengono caricati direttamente nei RSC
- NON fare business logic nei componenti — delegare a `fleet-overview-service.ts`
- NON passare tenantId come parametro — estrarre dalla sessione

### Formattazione e UX

- Targhe formattate in maiuscolo monospace (font-mono uppercase)
- Date scadenza contratto in formato locale IT: `dd MMM yyyy` (es. "15 mar 2026")
- Numeri KPI formattati in locale IT con separatore migliaia: `1.234`
- Tabs "Veicoli" e "Dipendenti" con conteggio tra parentesi: "Veicoli (127)" / "Dipendenti (45)"
- Filtri come chip rimovibili sopra le tabelle per dare feedback visivo sui filtri attivi
- Ricerca globale con placeholder contestuale: "Cerca per targa, marca, modello..."
- Cliccando su riga veicolo/dipendente si naviga al dettaglio

### References

- [Source: architecture.md#DA-1] — Multi-tenant con tenantId pervasivo
- [Source: architecture.md#FA-2] — Server Components per data fetching
- [Source: architecture.md#FA-5] — TanStack Table + shadcn/ui DataTable
- [Source: architecture.md#Structure Patterns] — Feature-based dentro App Router
- [Source: architecture.md#Format Patterns] — PaginatedResult<T>, date/number formatting
- [Source: epics.md#Story 3.9] — Acceptance criteria BDD
- [Source: prd.md#FR45] — Vista stato globale veicoli/contratti/dipendenti
- [Source: prd.md#NFR1] — Performance < 1 secondo per azioni standard
- [Source: ux-design-specification.md] — StatusBadge, EmptyState, DataTable patterns, filtri come chip

## Dev Agent Record

### Agent Model Used



### Debug Log References

### Completion Notes List

### File List

