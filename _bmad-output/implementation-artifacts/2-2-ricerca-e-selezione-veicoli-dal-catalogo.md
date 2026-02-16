# Story 2.2: Ricerca e Selezione Veicoli dal Catalogo

Status: done

## Story

As a **Admin**,
I want **cercare e selezionare veicoli dal catalogo InfocarData**,
So that **posso trovare rapidamente i veicoli da aggiungere al catalogo globale Greenfleet**.

## Acceptance Criteria

1. I risultati di ricerca vengono visualizzati in una DataTable con sorting, filtri e paginazione (FR3)
2. La ricerca completa in meno di 1 secondo per il 95esimo percentile (NFR1)
3. Il search ha debounce 300ms
4. L'Admin puo selezionare un veicolo per visualizzarne il dettaglio completo
5. I dati sono formattati con numeri in locale IT (1.234,56), emissioni con unita g/km

## Tasks / Subtasks

- [ ] Task 1: Creare la pagina catalogo con DataTable (AC: #1, #3)
  - [ ] 1.1 Installare `@tanstack/react-table` se non gia presente
  - [ ] 1.2 Aggiungere componenti shadcn/ui necessari: `table`, `data-table`, `input`, `select`, `badge`, `skeleton`, `dropdown-menu`, `pagination` (verificare quelli gia installati)
  - [ ] 1.3 Creare `src/app/(dashboard)/vehicles/catalog/page.tsx` — Server Component che effettua la query iniziale paginata al catalogo (prima pagina, 50 righe default) e passa i dati al componente DataTable
  - [ ] 1.4 Creare `src/app/(dashboard)/vehicles/catalog/loading.tsx` — skeleton della DataTable (header + righe placeholder)
  - [ ] 1.5 Creare `src/app/(dashboard)/vehicles/catalog/error.tsx` — error boundary con messaggio user-friendly e bottone retry
  - [ ] 1.6 Creare `src/app/(dashboard)/vehicles/catalog/components/CatalogDataTable.tsx` — Client Component con TanStack Table + shadcn/ui DataTable. Colonne: Marca, Modello, Allestimento, Carrozzeria, Normativa, Tipo Carburante, Emissioni CO2 (g/km), Potenza (kW), Azioni. Sorting su tutte le colonne. Paginazione con navigazione pagine (page size selector: 25, 50, 100). Stato corrente dei filtri sincronizzato con URL search params
  - [ ] 1.7 Creare `src/app/(dashboard)/vehicles/catalog/components/CatalogSearchBar.tsx` — Client Component con input di ricerca testuale full-text (cerca su marca, modello, allestimento). Debounce 300ms implementato con `useDeferredValue` o `setTimeout`/`useEffect`. Il valore di ricerca viene scritto come URL search param `q` (navigazione con `useRouter().replace()` per non inquinare la history)
  - [ ] 1.8 Creare `src/app/(dashboard)/vehicles/catalog/components/CatalogFilters.tsx` — Client Component con filtri a select/combobox: Marca (lista distinta dal DB), Tipo Carburante (enum FuelType), Normativa (lista distinta dal DB). I filtri vengono sincronizzati come URL search params (`marca`, `carburante`, `normativa`). I filtri attivi sono visualizzati come chip rimovibili sopra la tabella

- [ ] Task 2: Implementare la ricerca server-side con Prisma (AC: #1, #2)
  - [ ] 2.1 Creare `src/app/(dashboard)/vehicles/catalog/actions/search-catalog.ts` — Server Action che accetta `{ q?: string, marca?: string, carburante?: string, normativa?: string, page: number, pageSize: number, sortBy?: string, sortDir?: 'asc' | 'desc' }`. Valida input con Zod schema. Ritorna `ActionResult<PaginatedResult<CatalogVehicle>>`. Performance target: < 1s p95
  - [ ] 2.2 Creare `src/lib/schemas/catalog-search.ts` — Zod schema per i parametri di ricerca catalogo: `q` (string opzionale, max 200 char), `marca` (string opzionale), `carburante` (enum FuelType opzionale), `normativa` (string opzionale), `page` (number, min 1, default 1), `pageSize` (number, enum [25, 50, 100], default 50), `sortBy` (string opzionale, whitelist colonne ammesse), `sortDir` (enum ['asc', 'desc'], default 'asc')
  - [ ] 2.3 Creare `src/lib/services/catalog-service.ts` — Funzione `searchCatalog(params)` che costruisce la query Prisma: usa `contains` (LIKE) per ricerca testuale su marca + modello + allestimento, `where` per filtri esatti (marca, carburante, normativa), `orderBy` per sorting dinamico, `skip`/`take` per paginazione. Include i motori nella query con `include: { engines: true }`. Ritorna `PaginatedResult<CatalogVehicle>` con `totalCount` calcolato con `count()` separata. La query sul catalogo NON applica filtro tenantId (il catalogo e globale)
  - [ ] 2.4 Verificare che esistano indici appropriati nel Prisma schema per le colonne di ricerca: marca, modello, normativa, fuelType nei motori. Se mancano, creare una migrazione per aggiungerli

- [ ] Task 3: Implementare i filtri: marca, modello, tipo carburante, normativa (AC: #1)
  - [ ] 3.1 Creare `src/app/(dashboard)/vehicles/catalog/actions/get-filter-options.ts` — Server Action che ritorna le opzioni distinte per i filtri dal catalogo: `{ marche: string[], normative: string[], carburanti: FuelType[] }`. Usa `findMany` con `distinct` su Prisma. Cacheable con `use cache` (Next.js 16)
  - [ ] 3.2 Integrare le opzioni filtri nel componente `CatalogFilters.tsx` — caricamento opzioni al mount della pagina tramite dati passati dal Server Component parent. Le opzioni sono statiche (catalogo globale) e raramente cambiano

- [ ] Task 4: Implementare il debounced search con URL params (AC: #3)
  - [ ] 4.1 In `CatalogSearchBar.tsx`, implementare debounce 300ms: l'utente digita → dopo 300ms di inattivita → aggiornamento URL search param `q` → la pagina Server Component si ri-renderizza con i nuovi risultati. Usare `useSearchParams()` + `useRouter().replace()` + `useTransition()` per pending state
  - [ ] 4.2 Mostrare indicatore di caricamento durante la ricerca (spinner inline nell'input o skeleton nella tabella via `isPending` da `useTransition`)
  - [ ] 4.3 Se il campo ricerca viene svuotato, rimuovere il param `q` dall'URL e mostrare tutti i risultati (paginati)

- [ ] Task 5: Creare la pagina dettaglio veicolo catalogo (AC: #4)
  - [ ] 5.1 Creare `src/app/(dashboard)/vehicles/catalog/[id]/page.tsx` — Server Component che carica il veicolo dal catalogo per ID con tutti i dati relazionati (motori). Mostra il dettaglio completo del veicolo: identificazione (marca, modello, allestimento, carrozzeria), dati tecnici (normativa, anno inizio/fine produzione), motori (lista con tipo combustibile, cilindrata, potenza kW/CV, emissioni CO2 g/km WLTP e NEDC, consumi l/100km), capacita serbatoio, flag ibrido. Placeholder per immagine veicolo (VehicleHeader sara implementato in Story 2.3)
  - [ ] 5.2 Creare `src/app/(dashboard)/vehicles/catalog/[id]/loading.tsx` — skeleton del dettaglio veicolo
  - [ ] 5.3 Creare `src/app/(dashboard)/vehicles/catalog/[id]/error.tsx` — error boundary
  - [ ] 5.4 Creare `src/app/(dashboard)/vehicles/catalog/components/CatalogVehicleDetail.tsx` — componente presentazionale che riceve i dati veicolo e li visualizza in layout a 2 colonne (desktop): colonna sinistra dati identificazione + tecnici, colonna destra motori + emissioni. Utilizza Card shadcn/ui per raggruppare le sezioni
  - [ ] 5.5 Creare `src/app/(dashboard)/vehicles/catalog/components/EngineCard.tsx` — componente per visualizzare i dati di un singolo motore: tipo combustibile (con badge colorato), cilindrata cc, potenza kW (CV), emissioni CO2 g/km (WLTP, NEDC se disponibile), consumi l/100km. Formattazione numeri locale IT
  - [ ] 5.6 Nella DataTable, la colonna Azioni include un link/button "Dettaglio" che naviga a `/vehicles/catalog/[id]`. Anche il click sulla riga naviga al dettaglio

- [ ] Task 6: Formattare i numeri locale IT con unita emissioni (AC: #5)
  - [ ] 6.1 Creare `src/lib/utils/format.ts` (o estendere se gia esistente) — helper functions: `formatNumber(value: number, decimals?: number): string` che usa `Intl.NumberFormat('it-IT', { minimumFractionDigits, maximumFractionDigits })` per formattare numeri con separatore migliaia punto e decimale virgola (es. 1.234,56). `formatEmissions(gKm: number): string` che formatta come `"123,4 g/km"`. `formatPower(kw: number): string` che formatta come `"110 kW"`. `formatConsumption(l100km: number): string` che formatta come `"5,6 l/100km"`. `formatDisplacement(cc: number): string` che formatta come `"1.598 cc"`
  - [ ] 6.2 Usare le helper functions in tutti i componenti della DataTable e del dettaglio veicolo. Mai formattare inline con `.toLocaleString()` — usare sempre le funzioni centralizzate
  - [ ] 6.3 Aggiungere la classe CSS `tabular-nums` (Tailwind) ai valori numerici nelle tabelle per allineamento visivo consistente

- [ ] Task 7: Implementare la paginazione con PaginatedResult<T> (AC: #1)
  - [ ] 7.1 Verificare che il type `PaginatedResult<T>` esista in `src/types/pagination.ts` (creato in Story 1.1). Se non esiste, crearlo con: `{ data: T[], pagination: { page: number, pageSize: number, totalCount: number, totalPages: number } }`
  - [ ] 7.2 In `CatalogDataTable.tsx`, implementare la UI di paginazione: mostrare "Pagina X di Y" e "Z risultati totali", bottoni Precedente/Successiva, selector page size (25/50/100). I cambiamenti di pagina e pageSize aggiornano i URL search params `page` e `pageSize`
  - [ ] 7.3 Nel `catalog-service.ts`, la paginazione server-side usa `skip: (page - 1) * pageSize` e `take: pageSize`. Il `totalCount` viene calcolato con una query `count()` separata con gli stessi filtri della query principale. `totalPages` = `Math.ceil(totalCount / pageSize)`
  - [ ] 7.4 Quando si cambia un filtro o il testo di ricerca, la pagina torna a 1 automaticamente (reset param `page` nell'URL)

## Dev Notes

### Stack Tecnologico Rilevante

- **TanStack Table**: Libreria headless per tabelle — gestisce sorting, filtering, pagination lato client (ma in questo caso la logica e server-side). Usare il paradigma "server-side" di TanStack Table: la tabella riceve dati gia paginati/filtrati/sortati dal server, e notifica il server quando l'utente cambia stato
- **shadcn/ui DataTable**: Componente base che integra TanStack Table con componenti UI shadcn. Seguire la guida ufficiale shadcn/ui per la struttura DataTable
- **URL Search Params**: Pattern raccomandato da Next.js per stato di ricerca/filtro. Permette URL condivisibili, back/forward del browser funzionanti, e Server Components che leggono i params direttamente

### Decisioni Architetturali Rilevanti

- **FA-5 TanStack Table + shadcn/ui DataTable**: Tabelle headless con sorting, filtering, pagination
- **FA-1 State Management**: Stato filtri/ricerca in URL search params (non client state). RSC per read
- **FA-2 Data Fetching**: Server Components per caricamento pagine con Prisma query diretta
- **AC-1 Pattern API Ibrido**: Server Actions per la ricerca (anche se e un read, la Server Action gestisce validazione input e paginazione complessa)
- **AC-2 Error Handling**: ActionResult<T> per ogni Server Action
- **DA-6 Caching**: `use cache` per opzioni filtri (marche, normative, carburanti) — dati globali che cambiano raramente

### PaginatedResult<T> Pattern

```typescript
type PaginatedResult<T> = {
  data: T[]
  pagination: {
    page: number      // 1-based
    pageSize: number
    totalCount: number
    totalPages: number
  }
}
```

### Formattazione Numeri Locale IT

```typescript
// Esempio implementazione formatNumber
function formatNumber(value: number, decimals: number = 0): string {
  return new Intl.NumberFormat('it-IT', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

// Esempio output:
// formatNumber(1234.5, 1)   → "1.234,5"
// formatEmissions(123.4)     → "123,4 g/km"
// formatPower(110)           → "110 kW"
// formatConsumption(5.6)     → "5,6 l/100km"
// formatDisplacement(1598)   → "1.598 cc"
```

### Debounce 300ms Pattern

```typescript
// Pattern con useTransition + setTimeout
const [isPending, startTransition] = useTransition()
const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout>()

function handleSearchChange(value: string) {
  clearTimeout(timeoutId)
  const id = setTimeout(() => {
    startTransition(() => {
      router.replace(`?${createQueryString('q', value)}`)
    })
  }, 300)
  setTimeoutId(id)
}
```

### Catalogo e Globale (Non Tenant-Filtered)

Il catalogo veicoli InfocarData e una risorsa globale condivisa tra tutti i tenant. Le query al catalogo NON devono applicare il filtro `tenantId` automatico del Prisma client extension. Usare il Prisma client base (senza extension tenant) oppure bypassare l'extension per le query al catalogo. Questo e l'unico caso nell'applicazione dove il filtro tenant non si applica.

### Colonne DataTable Catalogo

| Colonna | Campo | Sortable | Formato |
|---|---|---|---|
| Marca | `marca` | Si | Testo |
| Modello | `modello` | Si | Testo |
| Allestimento | `allestimento` | Si | Testo |
| Carrozzeria | `carrozzeria` | Si | Testo |
| Normativa | `normativa` | Si | Badge |
| Carburante | `engines[0].fuelType` | Si | Badge colorato |
| CO2 g/km | `engines[0].co2GKm` | Si | `formatEmissions()` + tabular-nums |
| Potenza kW | `engines[0].powerKw` | Si | `formatPower()` + tabular-nums |

### Route Structure

```
src/app/(dashboard)/vehicles/catalog/
├── page.tsx                    # Lista catalogo (Server Component)
├── loading.tsx                 # Skeleton DataTable
├── error.tsx                   # Error boundary
├── [id]/
│   ├── page.tsx                # Dettaglio veicolo catalogo
│   ├── loading.tsx             # Skeleton dettaglio
│   └── error.tsx               # Error boundary
├── actions/
│   ├── search-catalog.ts       # Server Action ricerca
│   └── get-filter-options.ts   # Server Action opzioni filtri
└── components/
    ├── CatalogDataTable.tsx     # DataTable TanStack + shadcn/ui
    ├── CatalogSearchBar.tsx     # Input ricerca con debounce
    ├── CatalogFilters.tsx       # Filtri select/combobox
    ├── CatalogVehicleDetail.tsx # Dettaglio veicolo presentazionale
    └── EngineCard.tsx           # Card dati motore
```

### Naming Conventions

| Elemento | Convenzione | Esempio |
|---|---|---|
| Route directory | kebab-case | `vehicles/catalog/` |
| React Components | PascalCase.tsx | `CatalogDataTable.tsx` |
| Server Actions | kebab-case.ts in `actions/` | `search-catalog.ts` |
| Zod schemas | kebab-case.ts in `src/lib/schemas/` | `catalog-search.ts` |
| Service functions | camelCase | `searchCatalog()` |
| Utility functions | camelCase | `formatNumber()`, `formatEmissions()` |

### Dipendenza da Story 2.1

Questa story dipende dalla Story 2.1 (Schema Catalogo e Import Dati InfocarData) che definisce lo schema Prisma del catalogo veicoli (tabelle Vehicle, Engine e relazioni). I modelli Prisma per il catalogo devono gia esistere. Se la Story 2.1 non e ancora completata, questa story puo essere sviluppata con dati seed di test nel catalogo.

### Anti-Pattern da Evitare

- NON usare state client (useState) per filtri/ricerca — usare URL search params
- NON paginare lato client — sempre paginazione server-side con skip/take
- NON costruire query SQL raw — usare Prisma query builder
- NON formattare numeri inline con `.toLocaleString()` — usare le helper functions centralizzate
- NON applicare filtro tenantId sulle query al catalogo globale
- NON creare Server Actions dentro page.tsx — metterle in `actions/` directory
- NON usare `any` in TypeScript — usare tipi espliciti

### References

- [Source: architecture.md#FA-5] — TanStack Table + shadcn/ui DataTable
- [Source: architecture.md#Format Patterns] — PaginatedResult<T>, date/time, null handling
- [Source: architecture.md#Structure Patterns] — Feature-based directory structure
- [Source: architecture.md#Naming Patterns] — Convenzioni naming complete
- [Source: epics.md#Story 2.2] — Acceptance criteria BDD
- [Source: prd.md#FR3] — Ricerca e selezione veicoli dal catalogo InfocarData
- [Source: prd.md#NFR1] — Azioni < 1s per il 95esimo percentile
- [Source: ux-design-specification.md] — DataTable patterns, search debounce 300ms, formattazione numeri locale IT

## Dev Agent Record

### Agent Model Used



### Debug Log References

### Completion Notes List

### File List

