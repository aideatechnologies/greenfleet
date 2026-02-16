---
stepsCompleted: ['step-01-init', 'step-02-context', 'step-03-starter', 'step-04-decisions', 'step-05-patterns', 'step-06-structure', 'step-07-validation', 'step-08-complete']
lastStep: 8
status: 'complete'
completedAt: '2026-02-06'
inputDocuments: ['_bmad-output/planning-artifacts/prd.md']
workflowType: 'architecture'
project_name: 'Greenfleet'
user_name: 'Federico'
date: '2026-02-06'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**
45 FR in 10 aree di capability. L'architettura deve supportare: CRUD multi-entita con relazioni complesse (veicolo→motori 1:N, veicolo→contratti polimorfici, veicolo→carlist N:M), un motore di calcolo emissioni dual-mode (teorico + reale), integrazione con servizi esterni (InfocarData per dati tecnici, Codall per immagini), e un sistema di import/export multi-formato (CSV, XML, PDF).

**Non-Functional Requirements:**
27 NFR in 5 categorie che guidano le decisioni architetturali:
- **Performance:** Azioni < 1s (p95), report aggregati < 3s per 500 veicoli/3 anni, import < 30s per 10k righe
- **Sicurezza:** Zero data leak tra tenant, TLS 1.2+, cifratura at rest, audit trail, GDPR, RBAC enforcement API-level, RLS SQL Server
- **Scalabilita:** 20 tenant x 500 veicoli (10k veicoli totali), crescita lineare dati, scaling orizzontale container
- **Affidabilita:** 99.5% uptime business hours, RPO 1h, RTO 4h, calcoli deterministici, graceful degradation
- **Integrazione:** InfocarData batch, Codall con fallback, XML eterogenei, CSV UTF-8, API-first REST

**Scale & Complexity:**

- Dominio primario: Full-stack web SaaS (API-first + frontend)
- Livello complessita: Alto
- Componenti architetturali stimati: 8-12 (API layer, business logic, data access, calcolo emissioni, import/export, integrazione esterna, autenticazione/autorizzazione, tenant management, audit, reporting, UI)

### Technical Constraints & Dependencies

- **Database:** SQL Server (singola istanza, multi-tenant logico con tenant_id)
- **Runtime:** Docker container
- **Isolamento:** Row-Level Security come seconda linea di difesa oltre al filtro applicativo
- **Fonte dati veicoli:** InfocarData (banca dati Quattroruote) - import batch, non real-time
- **Immagini veicoli:** Codall API (ANNOXX+MESEXX+CODALL → immagine generata)
- **Contratti polimorfici:** 4 tipi con campi specifici, nesting temporale (matrioska)
- **Multi-engine:** Veicoli con 1:N motori (ibridi, bi-fuel), ciascuno con tipo combustibile e emissioni CO2

### Cross-Cutting Concerns Identified

1. **Multi-tenancy isolation:** Permea ogni query, API, report, export. Enforcement a livello applicativo + database (RLS)
2. **RBAC enforcement:** 3 ruoli con logica "FM = Admin sul proprio tenant". Enforcement a livello API, non solo UI
3. **Audit trail:** Tracciamento modifiche su dati emission-impacting (km, rifornimenti, fattori emissione, dati tecnici)
4. **Feature toggle:** Abilitazione/disabilitazione moduli per tenant, controllo a livello API e UI
5. **Import/Export pipeline:** CSV, XML (fatture), PDF (report certificabili) - formati eterogenei con configurazione
6. **Calcolo emissioni:** Logica di business core, deve essere deterministica e riproducibile, usata da report e dashboard

## Starter Template Evaluation

### Dominio Tecnologico Primario

Full-stack Web SaaS — applicazione multi-tenant con API REST, frontend ricco, calcolo emissioni, integrazione servizi esterni.

### Preferenze Tecniche

- **Framework:** Next.js fullstack (TypeScript)
- **Database:** SQL Server con Prisma ORM
- **Auth:** Better Auth (successore di Auth.js/NextAuth) — con RBAC e multi-tenant nativi
- **UI Components:** shadcn/ui (Radix UI + Tailwind CSS)
- **Deploy:** Self-hosted Docker
- **Team:** Sviluppatore singolo

### Versioni Correnti Verificate (feb 2026)

| Tecnologia | Versione | Note |
|---|---|---|
| Next.js | 16.1 (stable, dic 2025) | App Router default, Cache Components, PPR, Turbopack stable |
| Prisma | 7.x (stable) | Driver adapter obbligatorio — `@prisma/adapter-mssql` |
| Better Auth | latest | Successore ufficiale di Auth.js/NextAuth. Multi-tenant, RBAC, credentials provider built-in |
| shadcn/ui | latest | Componenti copiabili Radix + Tailwind, supporto Tailwind v4 |
| React | 19.x | Incluso con Next.js 16, Server Components |
| TypeScript | 5.x | Configurazione first-class in Next.js 16 |
| Tailwind CSS | 4.x | CSS variables, dark mode nativo |

### Starter Options Considerati

1. **`create-next-app@16`** (ufficiale Vercel) — starter minimalista, massima flessibilita per aggiungere stack custom (Prisma SQL Server, Better Auth, shadcn/ui). Nessun lock-in su scelte ORM/auth.
2. **T3 Stack (`create-t3-app`)** — opinionato (tRPC + NextAuth + Prisma + Tailwind). Scartato: impone NextAuth (superato da Better Auth), tRPC aggiunge complessita non necessaria per un progetto con API REST, non supporta SQL Server out-of-the-box.
3. **Starter shadcn/ui** (`npx shadcn@latest init` su progetto esistente) — non e un full scaffold ma un init di componenti UI. Va combinato con create-next-app.

### Starter Selezionato: `create-next-app@16` + shadcn/ui init

**Motivazione:**
- Starter ufficiale Vercel con massima manutenzione e stabilita
- Configurazione minimalista che lascia liberta su auth (Better Auth), ORM (Prisma + SQL Server), state management
- shadcn/ui si aggiunge come layer separato con `npx shadcn@latest init`
- Per un progetto con requisiti specifici (SQL Server multi-tenant, RBAC, calcolo emissioni), uno starter minimale e preferibile a boilerplate opinionati

**Comandi di Inizializzazione:**

```bash
# 1. Scaffold Next.js
npx create-next-app@16 greenfleet --typescript --tailwind --eslint --app --src-dir --import-alias="@/*" --turbopack

# 2. Inizializza shadcn/ui
cd greenfleet
npx shadcn@latest init

# 3. Installa Prisma + SQL Server adapter
npm install @prisma/client @prisma/adapter-mssql
npm install prisma --save-dev
npx prisma init --datasource-provider sqlserver --output ../generated/prisma

# 4. Installa Better Auth
npm install better-auth @better-auth/prisma
```

### Decisioni Architetturali Fornite dallo Starter

**Language & Runtime:**
- TypeScript 5.x strict mode
- Node.js 20+ runtime
- React 19 con Server Components

**Styling & UI:**
- Tailwind CSS 4.x con CSS variables per tematizzazione
- shadcn/ui: componenti copiabili (Table, Form, Card, Dialog, Combobox, Data Table)
- Radix UI underneath per accessibilita (ARIA, keyboard navigation)
- Dark mode nativo via Tailwind dark variant

**Build Tooling:**
- Turbopack (dev server, stable in 16.1)
- Ottimizzazione automatica (code splitting, tree shaking, image optimization)

**Code Organization:**
- `src/` directory con App Router (`src/app/`)
- File-based routing con layouts, loading states, error boundaries
- Import alias `@/*` per path assoluti

**Development Experience:**
- Hot Module Replacement via Turbopack
- TypeScript checking integrato
- ESLint con regole Next.js
- `next dev --inspect` per debugging

### Principi UX

Interfaccia originale ma funzionale e facile da capire:
- **Tema custom Greenfleet** — palette dedicata (toni green/teal per identita "fleet + sostenibilita"), personalizzabile via CSS variables e tool come tweakcn o Shadcn Theme Generator
- **Layout chiaro** — sidebar navigation per moduli, breadcrumb per contesto tenant/veicolo
- **Dashboard visivamente ricca** — grafici emissioni con contrasto colore, KPI cards prominenti
- **Componenti shadcn estesi** — primitivi (Table, Form, Card, Dialog) personalizzati nell'aspetto senza sacrificare usabilita
- **Dark mode** — supportato nativamente

**Nota:** L'inizializzazione del progetto con questi comandi sara la prima story di implementazione.

## Core Architectural Decisions

### Decision Priority Analysis

**Decisioni Critiche (bloccano l'implementazione):**
- Multi-tenant data model con `tenantId` pervasivo
- Better Auth con organization plugin per RBAC + tenant isolation
- Prisma middleware per filtro automatico tenant
- RLS SQL Server come seconda linea di difesa

**Decisioni Importanti (danno forma all'architettura):**
- Single Table Inheritance per contratti polimorfici
- Server Actions per mutations + Route Handlers per endpoints esterni
- React Server Components come pattern primario di data fetching
- Result pattern per error handling tipizzato

**Decisioni Differite (post-MVP):**
- Redis caching (Next.js built-in sufficiente per scala iniziale)
- CI/CD pipeline (deploy manuale inizialmente)
- API documentation (nessun client esterno)
- Monitoring avanzato (Pino logging sufficiente)

### Data Architecture

**DA-1: Modello Multi-Tenant**
- Decisione: `tenantId` su ogni entita (tranne lookup globali come carlist InfocarData)
- Implementazione: Prisma client extension che inietta automaticamente `WHERE tenantId = ?` su ogni query e `tenantId = ?` su ogni insert
- Rationale: Pattern piu semplice e sicuro per multi-tenancy logica su singola istanza SQL Server
- Affects: Ogni model Prisma, ogni API, ogni report

**DA-2: Contratti Polimorfici — Single Table Inheritance**
- Decisione: Tabella unica `Contract` con colonna discriminante `type` (Proprietario | BreveTer | LungoTer | LeasingFin) e campi nullable per attributi specifici di ciascun tipo
- Rationale: Prisma non supporta ereditarieta nativa. STI evita join complessi e mantiene la relazione `Vehicle → Contract` semplice. I campi nullable sono accettabili dato il numero limitato di tipi (4)
- Affects: Schema Prisma, CRUD contratti, report contratti

**DA-3: Multi-Engine (Veicolo → Motori 1:N)**
- Decisione: Tabella `Engine` separata con FK a `Vehicle`. Ogni motore ha `fuelType`, `co2GKm`, `consumptionL100Km`, `nucmot` (codice motore InfocarData)
- Rationale: Relazione 1:N naturale per veicoli ibridi/bi-fuel. Dati tecnici per motore vengono da InfocarData
- Affects: Schema Prisma, import InfocarData, calcolo emissioni

**DA-4: Validazione — Zod**
- Decisione: Schema Zod condivisi tra frontend (form validation) e backend (Server Action input validation)
- Versione: Zod 3.x
- Rationale: Type-safe, integrazione nativa con React Hook Form e shadcn/ui Form, riutilizzo schema client/server
- Affects: Ogni form, ogni Server Action, ogni Route Handler

**DA-5: Migrazioni — Prisma Migrate**
- Decisione: Prisma Migrate per DDL versionato con generazione automatica SQL
- Rationale: Incluso con Prisma, workflow standard, versionamento migrazioni in git
- Affects: Schema evolution, deployment pipeline

**DA-6: Caching — Next.js Built-in**
- Decisione: `use cache` (Cache Components, Next.js 16) per dati letti frequentemente (catalogo veicoli, lookup combustibili, fattori emissione). Nessun Redis inizialmente
- Rationale: 10k veicoli totali non richiedono cache distribuita. Next.js 16 offre caching granulare lato server. Scalabile a Redis post-MVP se necessario
- Affects: Performance read, complessita infrastruttura

### Authentication & Security

**AS-1: Autenticazione — Better Auth Credentials**
- Decisione: Better Auth con credentials provider (email + password). Nessun OAuth social
- Rationale: B2B SaaS aziendale — utenti creati da Admin/FM, non self-registration. Credentials e il pattern piu semplice e appropriato
- Affects: Login flow, user management, session handling

**AS-2: RBAC — Better Auth Organization Plugin**
- Decisione: Better Auth organization plugin. Organization = Tenant. 3 ruoli: Admin (cross-tenant), Fleet Manager (admin sul proprio tenant), Driver (read + write rifornimenti/km proprio veicolo)
- Rationale: Plugin nativo Better Auth per organizations con members e roles. Elimina necessita di RBAC custom. FM = admin role nell'organization
- Affects: Ogni API, middleware, UI condizionale, data access

**AS-3: Tenant Isolation nell'Auth**
- Decisione: `tenantId` estratto dalla sessione Better Auth (organization corrente) e iniettato nel Prisma client extension ad ogni request
- Rationale: Single source of truth per il tenant context. La sessione autenticata e l'unico modo per determinare il tenant
- Affects: Middleware Next.js, Prisma client, ogni data access

**AS-4: Row-Level Security SQL Server**
- Decisione: RLS come seconda linea di difesa. Policy SQL Server che filtra per `tenantId` usando `SESSION_CONTEXT`. Impostato dal connection middleware prima di ogni request
- Rationale: Defense in depth — se il filtro applicativo Prisma viene bypassato per bug, RLS previene data leak tra tenant. Requisito NFR esplicito
- Affects: Schema SQL Server, connection middleware, performance (impatto minimo su indici con tenantId)

**AS-5: API Security — Next.js Middleware**
- Decisione: Middleware Next.js per verifica sessione Better Auth su ogni route protetta. Estrazione tenant + ruolo dalla sessione. CSRF protection built-in con Server Actions
- Rationale: Singolo punto di enforcement per autenticazione. RBAC enforcement a livello di singola Server Action/Route Handler per granularita
- Affects: Routing, middleware chain, ogni endpoint protetto

### API & Communication Patterns

**AC-1: Pattern API Ibrido**
- Decisione: Server Actions per mutations (CRUD, insert rifornimenti, import) + Route Handlers solo per endpoints esterni (export PDF, webhook, Codall proxy)
- Rationale: Server Actions = type-safe, zero boilerplate, progressive enhancement. Route Handlers solo dove serve HTTP semantics esplicito (download file, integrazione esterna)
- Affects: Ogni operazione CRUD, import/export, integrazioni

**AC-2: Error Handling — Result Pattern**
- Decisione: Server Actions ritornano `{ success: true, data } | { success: false, error, code }` con codici errore tipizzati (enum). Error boundaries Next.js per errori imprevisti. Zod validation errors mappati su campi form
- Rationale: Type-safe, nessuna eccezione non gestita, errori prevedibili lato client. Pattern consolidato in Next.js + React 19
- Affects: Ogni Server Action, ogni form, error UI

**AC-3: API Documentation — Differita**
- Decisione: Nessuna documentazione API per MVP. Solo commenti TypeScript inline
- Rationale: Nessun client esterno, sviluppatore singolo. TypeScript e la documentazione vivente
- Affects: Nessuno per MVP

### Frontend Architecture

**FA-1: State Management — Minimal Client State**
- Decisione: React Server Components per read, Server Actions per write. Stato UI locale con `useState`/`useContext` (sidebar, filtri, modal). Nessun Zustand/Redux
- Rationale: RSC elimina la necessita di state management globale per dati server. Lo stato UI rimanente e locale e semplice. Overengineering evitato
- Affects: Ogni componente, data flow, bundle size

**FA-2: Data Fetching — Server Components**
- Decisione: Server Components per caricamento pagine (async component con Prisma query diretta). `useActionState` (React 19) per form submissions con pending state
- Rationale: Pattern nativo Next.js 16 + React 19. Zero client-side fetching per read, massima performance (streaming SSR)
- Affects: Ogni pagina, loading states, SEO

**FA-3: Forms — React Hook Form + Zod + shadcn/ui Form**
- Decisione: React Hook Form per gestione form state, Zod per validazione, shadcn/ui Form per componenti UI accessibili
- Rationale: Stack consolidato, type-safe end-to-end, validazione condivisa client/server, error handling integrato
- Affects: Ogni form (veicoli, contratti, rifornimenti, rilevazioni km, utenti)

**FA-4: Charts — Recharts via shadcn/ui Charts**
- Decisione: Recharts tramite componenti chart shadcn/ui per dashboard emissioni, trend, comparazioni
- Rationale: Integrato nel tema shadcn/ui, responsive, customizzabile. Sufficiente per grafici emissioni (bar, line, area, pie)
- Affects: Dashboard, report emissioni, KPI

**FA-5: Tabelle Dati — TanStack Table + shadcn/ui DataTable**
- Decisione: TanStack Table (headless) con shadcn/ui DataTable per sorting, filtering, pagination
- Rationale: Componente shadcn/ui gia disponibile, headless per massima flessibilita, performante con dataset fino a migliaia di righe
- Affects: Liste veicoli, rifornimenti, contratti, utenti, audit log

### Infrastructure & Deployment

**ID-1: Docker Setup — docker-compose**
- Decisione: docker-compose con 2 servizi: `app` (Next.js standalone build) + `db` (SQL Server, solo dev/staging). Produzione: istanza SQL Server dedicata
- Rationale: Sviluppo locale semplificato, ambiente riproducibile. Next.js standalone output per immagine Docker leggera
- Affects: Dev environment, deployment, onboarding

**ID-2: CI/CD — Differita**
- Decisione: Deploy manuale con `docker build` + `docker push/run`. GitHub Actions aggiungibile post-MVP
- Rationale: Sviluppatore singolo, complessita CI/CD non giustificata per MVP. Manual deploy con Docker e sufficiente
- Affects: Deployment workflow

**ID-3: Environment Configuration — .env Files**
- Decisione: `.env.local` (dev), `.env.production` (prod) con Next.js built-in env support. Variabili: `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `CODALL_API_URL`
- Rationale: Standard Next.js, nessun servizio esterno di secret management necessario per scala attuale
- Affects: Ogni servizio che necessita configurazione

**ID-4: Logging — Pino**
- Decisione: `console.log` in dev, Pino in prod per logging strutturato JSON
- Rationale: Pino e il logger Node.js piu performante, output JSON leggibile da Docker logs. Nessun servizio esterno inizialmente
- Affects: Debugging, monitoring, error tracking

**ID-5: Backup & Recovery**
- Decisione: SQL Server backup automatizzato via script schedulato (cron/task scheduler) per RPO 1h come da NFR. Backup su volume Docker o storage esterno
- Rationale: Requisito NFR esplicito (RPO 1h, RTO 4h). Script SQL Server nativo, nessun tool esterno
- Affects: Disaster recovery, data safety

### Decision Impact Analysis

**Sequenza di Implementazione:**
1. Scaffold progetto (create-next-app + shadcn/ui + Prisma + Better Auth)
2. Schema Prisma con modello multi-tenant + RLS SQL Server
3. Better Auth setup con organization plugin + RBAC
4. Middleware auth + tenant injection nel Prisma client
5. CRUD base (veicoli, motori, contratti) con Server Actions
6. Import InfocarData + Codall integration
7. Calcolo emissioni (teorico + reale)
8. Dashboard + report con Recharts
9. Import/Export (CSV, XML, PDF)
10. Feature toggle, audit trail, polish

**Dipendenze Cross-Component:**
- Better Auth organizations → tenantId injection → Prisma middleware → ogni query
- Zod schemas → React Hook Form validation → Server Action validation (condivisi)
- shadcn/ui tema → ogni componente UI → dark mode → CSS variables
- Prisma schema → Server Actions → Server Components → UI (data flow verticale)
- RLS SQL Server → richiede tenantId gia implementato a livello applicativo

## Implementation Patterns & Consistency Rules

### Pattern Categories Defined

**Punti di conflitto potenziali identificati:** 25+ aree dove agenti AI potrebbero fare scelte divergenti. I pattern seguenti eliminano l'ambiguita.

### Naming Patterns

**Database (Prisma Schema → SQL Server):**

| Elemento | Convenzione | Esempio |
|---|---|---|
| Model Prisma | PascalCase singolare | `Vehicle`, `Contract`, `Engine` |
| Campo Prisma | camelCase | `tenantId`, `fuelType`, `co2GKm` |
| Tabella SQL Server | @map PascalCase plurale | `@@map("Vehicles")`, `@@map("Contracts")` |
| Colonna SQL Server | @map snake_case | `@map("tenant_id")`, `@map("fuel_type")` |
| FK | `{entity}Id` in Prisma | `vehicleId`, `tenantId` |
| Indice | `idx_{table}_{columns}` | `idx_vehicles_tenant_id` |
| Enum | PascalCase | `FuelType`, `ContractType`, `UserRole` |

**File System:**

| Elemento | Convenzione | Esempio |
|---|---|---|
| Route directories | kebab-case | `src/app/vehicles/`, `src/app/fuel-records/` |
| React Components | PascalCase.tsx | `VehicleCard.tsx`, `EmissionChart.tsx` |
| Non-component files | kebab-case.ts | `emission-calculator.ts`, `tenant-context.ts` |
| Server Actions | kebab-case.ts in `actions/` | `src/app/vehicles/actions/create-vehicle.ts` |
| Zod schemas | kebab-case.ts in `schemas/` | `src/lib/schemas/vehicle.ts` |
| Test files | co-locati `.test.ts` | `emission-calculator.test.ts` |

**Codice TypeScript/React:**

| Elemento | Convenzione | Esempio |
|---|---|---|
| Componenti | PascalCase | `VehicleCard`, `DashboardLayout` |
| Funzioni | camelCase | `calculateEmissions`, `getVehicleById` |
| Variabili/costanti | camelCase | `tenantId`, `fuelRecords` |
| Costanti globali | UPPER_SNAKE_CASE | `MAX_IMPORT_ROWS`, `DEFAULT_PAGE_SIZE` |
| Tipi/Interfacce | PascalCase con prefisso semantico | `Vehicle` (model), `CreateVehicleInput` (input), `VehicleWithEngines` (query result) |
| Enum values | PascalCase | `FuelType.Diesel`, `ContractType.Leasing` |

### Structure Patterns

**Organizzazione progetto — Feature-based dentro App Router:**

```
src/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Route group: pagine non autenticate
│   │   ├── login/
│   │   └── layout.tsx
│   ├── (dashboard)/              # Route group: pagine autenticate
│   │   ├── vehicles/
│   │   │   ├── page.tsx          # Lista veicoli
│   │   │   ├── [id]/
│   │   │   │   ├── page.tsx      # Dettaglio veicolo
│   │   │   │   └── edit/
│   │   │   ├── new/
│   │   │   ├── actions/          # Server Actions per veicoli
│   │   │   └── components/       # Componenti specifici veicoli
│   │   ├── contracts/
│   │   ├── fuel-records/
│   │   ├── emissions/
│   │   ├── import/
│   │   ├── settings/
│   │   └── layout.tsx            # Dashboard layout (sidebar + header)
│   ├── api/                      # Route Handlers (solo endpoints esterni)
│   │   ├── export/
│   │   └── webhooks/
│   ├── layout.tsx                # Root layout
│   └── middleware.ts             # Auth + tenant middleware
├── components/                   # Componenti shared (non specifici di feature)
│   ├── ui/                       # shadcn/ui components (auto-generated)
│   ├── layout/                   # Sidebar, Header, Breadcrumb
│   ├── forms/                    # Form components riutilizzabili
│   └── data-display/             # Table, KPICard, Chart wrappers
├── lib/                          # Logica condivisa
│   ├── auth/                     # Better Auth config + helpers
│   ├── db/                       # Prisma client + tenant extension
│   ├── schemas/                  # Zod schemas (condivisi client/server)
│   ├── services/                 # Business logic (calcolo emissioni, import)
│   ├── integrations/             # InfocarData, Codall clients
│   └── utils/                    # Utility pure functions
├── types/                        # Type definitions globali
└── generated/                    # Prisma generated client
    └── prisma/
```

**Regole struttura:**
- Ogni feature ha le sue `actions/` e `components/` dentro la route directory
- Componenti usati da 2+ feature → `src/components/`
- Business logic mai nei componenti → sempre in `src/lib/services/`
- Zod schemas sempre in `src/lib/schemas/` (condivisi)
- Test co-locati accanto al file testato (`.test.ts`)

### Format Patterns

**Server Action Result Type:**

```typescript
type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; code: ErrorCode }

enum ErrorCode {
  VALIDATION = "VALIDATION",
  NOT_FOUND = "NOT_FOUND",
  UNAUTHORIZED = "UNAUTHORIZED",
  FORBIDDEN = "FORBIDDEN",
  CONFLICT = "CONFLICT",
  INTERNAL = "INTERNAL",
}
```

**Date/Time:**
- Database: `DateTime` Prisma (mapped a `datetime2` SQL Server)
- JSON/API: ISO 8601 string (`2026-02-06T14:30:00.000Z`)
- UI: Formato locale italiano (`06/02/2026 14:30`) via `Intl.DateTimeFormat`
- Timezone: UTC in database, conversione a locale solo in UI

**Null handling:**
- Database: `null` per campi opzionali (Prisma `?`)
- API response: campo omesso se `undefined`, `null` esplicito se campo esiste ma vuoto
- UI: fallback a `"-"` o testo placeholder, mai mostrare "null"

**Paginazione:**

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

### Communication Patterns

**Audit Events:**

```typescript
// Naming: entity.action in lowercase
type AuditAction =
  | "vehicle.created" | "vehicle.updated" | "vehicle.deleted"
  | "fuel_record.created" | "fuel_record.updated"
  | "km_reading.created" | "km_reading.updated"
  | "emission_factor.updated"
  | "contract.created" | "contract.updated"

type AuditEntry = {
  action: AuditAction
  entityType: string
  entityId: string
  tenantId: string
  userId: string
  timestamp: Date
  changes: { field: string; old: unknown; new: unknown }[]
}
```

**Logging livelli:**
- `error` — errori che richiedono intervento (DB down, auth failure)
- `warn` — situazioni anomale gestite (Codall fallback, import riga skipped)
- `info` — operazioni significative (login, import completato, report generato)
- `debug` — dettagli per troubleshooting (solo dev)

### Process Patterns

**Loading States (Next.js):**
- Ogni route con data fetching ha un `loading.tsx` con skeleton shadcn/ui
- Form submissions: `useActionState` con stato `pending` → spinner inline su button
- Convenzione: skeleton matching della struttura pagina (non spinner generico)

**Error Boundaries:**
- Ogni route ha un `error.tsx` con messaggio user-friendly + bottone retry
- Form errors: inline sotto i campi (Zod field errors) + toast per errori server
- Global: `src/app/error.tsx` come catch-all

**Validazione timing:**
1. Client-side (immediata): Zod schema via React Hook Form — feedback real-time
2. Server-side (sempre): Stesso Zod schema nella Server Action — mai fidarsi del client
3. Database (constraint): Prisma schema constraints + RLS

**Tenant Context Injection Flow:**

```
Request → Middleware (auth check) → Extract tenantId from session
  → Set in Prisma client extension → Automatic WHERE tenantId = ?
  → Set in SQL Server SESSION_CONTEXT → RLS enforcement
```

### Enforcement Guidelines

**Ogni agente AI DEVE:**
1. Usare le naming conventions definite — mai inventare convenzioni alternative
2. Mettere business logic in `src/lib/services/`, mai nei componenti o nelle actions
3. Validare con Zod sia client-side che server-side, usando lo stesso schema
4. Ritornare `ActionResult<T>` da ogni Server Action
5. Includere `tenantId` filtering automatico (via Prisma extension) — mai filtrare manualmente
6. Creare `loading.tsx` e `error.tsx` per ogni nuova route con data fetching
7. Usare componenti shadcn/ui per UI — mai HTML/CSS raw per elementi interattivi
8. Scrivere audit entries per ogni modifica a dati emission-impacting

**Anti-pattern da evitare:**
- Fetch diretta al database nei componenti (usare services)
- `tenantId` passato come parametro URL (estrarre sempre dalla sessione)
- Validazione solo client-side senza Zod server-side
- Componenti UI custom quando esiste l'equivalente shadcn/ui
- `any` in TypeScript — usare tipi espliciti o `unknown` con type guard
- Console.log per audit — usare il sistema audit strutturato

## Project Structure & Boundaries

### Complete Project Directory Structure

```
greenfleet/
├── .env.example                    # Template variabili ambiente
├── .env.local                      # Dev environment (gitignored)
├── .env.production                 # Prod environment (gitignored)
├── .eslintrc.json                  # ESLint config (Next.js)
├── .gitignore
├── components.json                 # shadcn/ui config
├── docker-compose.yml              # Dev: app + SQL Server
├── docker-compose.prod.yml         # Prod: solo app (DB esterno)
├── Dockerfile                      # Multi-stage build Next.js standalone
├── next.config.ts                  # Next.js 16 config
├── package.json
├── postcss.config.mjs              # PostCSS per Tailwind
├── prisma/
│   ├── schema.prisma               # Schema database completo
│   ├── migrations/                 # Prisma Migrate history
│   ├── seed.ts                     # Seed dati dev (tenant demo, utenti, veicoli)
│   └── sql/
│       └── rls-policies.sql        # Row-Level Security policies SQL Server
├── tsconfig.json
├── public/
│   ├── favicon.ico
│   └── images/                     # Asset statici (logo, placeholder veicolo)
└── src/
    ├── app/
    │   ├── globals.css              # Tailwind imports + tema custom Greenfleet
    │   ├── layout.tsx               # Root layout (providers, fonts, metadata)
    │   ├── not-found.tsx            # 404 globale
    │   ├── error.tsx                # Error boundary globale
    │   │
    │   ├── (auth)/                  # Route group: non autenticato
    │   │   ├── layout.tsx           # Layout centrato (no sidebar)
    │   │   ├── login/
    │   │   │   └── page.tsx         # Login form
    │   │   └── forgot-password/
    │   │       └── page.tsx
    │   │
    │   ├── (dashboard)/             # Route group: autenticato
    │   │   ├── layout.tsx           # Dashboard layout (sidebar + header + breadcrumb)
    │   │   ├── page.tsx             # Dashboard home (redirect o overview)
    │   │   │
    │   │   ├── vehicles/            # FR: Gestione Veicoli + Motori
    │   │   │   ├── page.tsx         # Lista veicoli (DataTable, filtri, search)
    │   │   │   ├── loading.tsx
    │   │   │   ├── error.tsx
    │   │   │   ├── new/
    │   │   │   │   └── page.tsx     # Form creazione veicolo
    │   │   │   ├── [id]/
    │   │   │   │   ├── page.tsx     # Dettaglio veicolo (tabs: dati, motori, contratti, km, rifornimenti)
    │   │   │   │   ├── loading.tsx
    │   │   │   │   └── edit/
    │   │   │   │       └── page.tsx # Form modifica veicolo
    │   │   │   ├── actions/
    │   │   │   │   ├── create-vehicle.ts
    │   │   │   │   ├── update-vehicle.ts
    │   │   │   │   ├── delete-vehicle.ts
    │   │   │   │   └── manage-engines.ts
    │   │   │   └── components/
    │   │   │       ├── VehicleTable.tsx
    │   │   │       ├── VehicleForm.tsx
    │   │   │       ├── VehicleDetail.tsx
    │   │   │       ├── EngineList.tsx
    │   │   │       ├── EngineForm.tsx
    │   │   │       └── VehicleImageCard.tsx
    │   │   │
    │   │   ├── contracts/           # FR: Gestione Contratti
    │   │   │   ├── page.tsx
    │   │   │   ├── loading.tsx
    │   │   │   ├── new/
    │   │   │   │   └── page.tsx
    │   │   │   ├── [id]/
    │   │   │   │   ├── page.tsx
    │   │   │   │   └── edit/
    │   │   │   │       └── page.tsx
    │   │   │   ├── actions/
    │   │   │   │   ├── create-contract.ts
    │   │   │   │   ├── update-contract.ts
    │   │   │   │   └── delete-contract.ts
    │   │   │   └── components/
    │   │   │       ├── ContractTable.tsx
    │   │   │       ├── ContractForm.tsx
    │   │   │       └── ContractTimeline.tsx
    │   │   │
    │   │   ├── fuel-records/        # FR: Gestione Rifornimenti
    │   │   │   ├── page.tsx
    │   │   │   ├── loading.tsx
    │   │   │   ├── new/
    │   │   │   │   └── page.tsx
    │   │   │   ├── [id]/
    │   │   │   │   └── edit/
    │   │   │   │       └── page.tsx
    │   │   │   ├── actions/
    │   │   │   │   ├── create-fuel-record.ts
    │   │   │   │   ├── update-fuel-record.ts
    │   │   │   │   └── delete-fuel-record.ts
    │   │   │   └── components/
    │   │   │       ├── FuelRecordTable.tsx
    │   │   │       └── FuelRecordForm.tsx
    │   │   │
    │   │   ├── km-readings/         # FR: Rilevazioni Km
    │   │   │   ├── page.tsx
    │   │   │   ├── loading.tsx
    │   │   │   ├── new/
    │   │   │   │   └── page.tsx
    │   │   │   ├── actions/
    │   │   │   │   ├── create-km-reading.ts
    │   │   │   │   └── update-km-reading.ts
    │   │   │   └── components/
    │   │   │       ├── KmReadingTable.tsx
    │   │   │       └── KmReadingForm.tsx
    │   │   │
    │   │   ├── emissions/           # FR: Calcolo Emissioni + Dashboard
    │   │   │   ├── page.tsx         # Dashboard emissioni
    │   │   │   ├── loading.tsx
    │   │   │   ├── report/
    │   │   │   │   └── page.tsx     # Report dettagliato
    │   │   │   ├── actions/
    │   │   │   │   └── generate-report.ts
    │   │   │   └── components/
    │   │   │       ├── EmissionDashboard.tsx
    │   │   │       ├── EmissionChart.tsx
    │   │   │       ├── EmissionKPICards.tsx
    │   │   │       ├── TheoreticalVsRealChart.tsx
    │   │   │       └── EmissionReportFilters.tsx
    │   │   │
    │   │   ├── import/              # FR: Import/Export
    │   │   │   ├── page.tsx
    │   │   │   ├── actions/
    │   │   │   │   ├── import-csv.ts
    │   │   │   │   ├── import-xml-invoices.ts
    │   │   │   │   └── import-infocardata.ts
    │   │   │   └── components/
    │   │   │       ├── ImportUploader.tsx
    │   │   │       ├── ImportPreview.tsx
    │   │   │       └── ImportHistory.tsx
    │   │   │
    │   │   ├── carlist/             # FR: Gestione Car List
    │   │   │   ├── page.tsx
    │   │   │   ├── actions/
    │   │   │   │   └── manage-carlist.ts
    │   │   │   └── components/
    │   │   │       └── CarlistManager.tsx
    │   │   │
    │   │   └── settings/            # FR: Gestione Utenti, Tenant, Config
    │   │       ├── page.tsx
    │   │       ├── users/
    │   │       │   ├── page.tsx
    │   │       │   ├── new/
    │   │       │   │   └── page.tsx
    │   │       │   └── actions/
    │   │       │       ├── create-user.ts
    │   │       │       ├── update-user.ts
    │   │       │       └── delete-user.ts
    │   │       ├── tenant/
    │   │       │   ├── page.tsx
    │   │       │   └── actions/
    │   │       │       └── update-tenant.ts
    │   │       ├── emission-factors/
    │   │       │   ├── page.tsx
    │   │       │   └── actions/
    │   │       │       └── update-emission-factors.ts
    │   │       ├── audit-log/
    │   │       │   └── page.tsx
    │   │       └── components/
    │   │           ├── UserTable.tsx
    │   │           ├── UserForm.tsx
    │   │           ├── TenantSettingsForm.tsx
    │   │           ├── FeatureTogglePanel.tsx
    │   │           └── AuditLogTable.tsx
    │   │
    │   └── api/                     # Route Handlers (solo endpoints esterni)
    │       ├── export/
    │       │   ├── pdf/
    │       │   │   └── route.ts
    │       │   └── csv/
    │       │       └── route.ts
    │       ├── webhooks/
    │       │   └── infocardata/
    │       │       └── route.ts
    │       ├── images/
    │       │   └── vehicle/
    │       │       └── [codall]/
    │       │           └── route.ts
    │       └── auth/
    │           └── [...all]/
    │               └── route.ts     # Better Auth catch-all handler
    │
    ├── components/                  # Componenti shared cross-feature
    │   ├── ui/                      # shadcn/ui (auto-generated, non modificare)
    │   │   ├── button.tsx
    │   │   ├── card.tsx
    │   │   ├── data-table.tsx
    │   │   ├── dialog.tsx
    │   │   ├── form.tsx
    │   │   ├── input.tsx
    │   │   ├── select.tsx
    │   │   ├── table.tsx
    │   │   ├── toast.tsx
    │   │   ├── chart.tsx
    │   │   └── ...
    │   ├── layout/
    │   │   ├── Sidebar.tsx
    │   │   ├── Header.tsx
    │   │   ├── Breadcrumb.tsx
    │   │   └── ThemeProvider.tsx
    │   ├── forms/
    │   │   ├── VehicleSelector.tsx
    │   │   ├── DateRangePicker.tsx
    │   │   └── ConfirmDialog.tsx
    │   └── data-display/
    │       ├── KPICard.tsx
    │       ├── EmptyState.tsx
    │       ├── StatusBadge.tsx
    │       └── TenantBadge.tsx
    │
    ├── lib/                         # Logica condivisa
    │   ├── auth/
    │   │   ├── auth.ts              # Better Auth config (server-side)
    │   │   ├── auth-client.ts       # Better Auth client (client-side)
    │   │   └── permissions.ts       # Helper: hasRole(), canAccess(), isTenantAdmin()
    │   ├── db/
    │   │   ├── client.ts            # Prisma client con tenant extension
    │   │   ├── tenant-extension.ts  # Prisma extension per auto-filter tenantId
    │   │   └── rls-context.ts       # Helper: set SESSION_CONTEXT per RLS
    │   ├── schemas/
    │   │   ├── vehicle.ts
    │   │   ├── engine.ts
    │   │   ├── contract.ts
    │   │   ├── fuel-record.ts
    │   │   ├── km-reading.ts
    │   │   ├── user.ts
    │   │   ├── emission-factor.ts
    │   │   └── common.ts            # Paginazione, filtri, date range
    │   ├── services/
    │   │   ├── emission-calculator.ts
    │   │   ├── emission-calculator.test.ts
    │   │   ├── vehicle-service.ts
    │   │   ├── contract-service.ts
    │   │   ├── fuel-record-service.ts
    │   │   ├── km-reading-service.ts
    │   │   ├── user-service.ts
    │   │   ├── tenant-service.ts
    │   │   ├── audit-service.ts
    │   │   ├── report-service.ts
    │   │   └── import-service.ts
    │   ├── integrations/
    │   │   ├── infocardata/
    │   │   │   ├── client.ts
    │   │   │   ├── mapper.ts
    │   │   │   └── types.ts
    │   │   └── codall/
    │   │       ├── client.ts
    │   │       └── fallback.ts
    │   └── utils/
    │       ├── date.ts
    │       ├── number.ts
    │       ├── pagination.ts
    │       └── constants.ts
    │
    ├── types/
    │   ├── index.ts
    │   ├── action-result.ts         # ActionResult<T>, ErrorCode
    │   ├── audit.ts                 # AuditAction, AuditEntry
    │   ├── pagination.ts            # PaginatedResult<T>
    │   └── domain.ts                # FuelType, ContractType, UserRole
    │
    ├── middleware.ts                # Next.js middleware (auth + tenant + route protection)
    │
    └── generated/
        └── prisma/                  # Prisma generated client (gitignored)
```

### Architectural Boundaries

**API Boundaries:**
- `src/middleware.ts` — porta d'ingresso: auth check, tenant extraction, route protection
- `src/app/(dashboard)/**/actions/` — Server Actions: unico punto di accesso per mutations. Validano input (Zod), controllano permessi (RBAC), delegano a services
- `src/app/api/` — Route Handlers: solo per download file (PDF/CSV), proxy immagini, webhook. Non per CRUD

**Component Boundaries:**
- `src/app/(dashboard)/**/components/` — componenti feature-specific, usati solo nella propria route
- `src/components/` — componenti shared, usati da 2+ feature
- `src/components/ui/` — shadcn/ui primitivi, non modificati direttamente (rigenerabili)

**Service Boundaries:**
- `src/lib/services/` — tutta la business logic. I services ricevono il Prisma client (gia filtrato per tenant) e ritornano dati tipizzati
- Services non accedono mai a request/session — il tenant context e gia nel Prisma client
- Services non importano mai componenti React

**Data Boundaries:**
- `src/lib/db/client.ts` — unico punto di creazione Prisma client con tenant extension
- `prisma/schema.prisma` — source of truth per modello dati
- `prisma/sql/rls-policies.sql` — RLS policies applicate fuori da Prisma (SQL diretto)
- `src/lib/schemas/` — validazione Zod al boundary input (mai nel service layer)

### Requirements to Structure Mapping

| Area Funzionale (PRD) | Route | Services | Schemas |
|---|---|---|---|
| Gestione Veicoli | `vehicles/` | `vehicle-service.ts` | `vehicle.ts`, `engine.ts` |
| Gestione Motori | `vehicles/[id]/` (tab) | `vehicle-service.ts` | `engine.ts` |
| Gestione Contratti | `contracts/` | `contract-service.ts` | `contract.ts` |
| Rifornimenti | `fuel-records/` | `fuel-record-service.ts` | `fuel-record.ts` |
| Rilevazioni Km | `km-readings/` | `km-reading-service.ts` | `km-reading.ts` |
| Calcolo Emissioni | `emissions/` | `emission-calculator.ts` | — |
| Dashboard & Report | `emissions/`, `emissions/report/` | `report-service.ts` | `common.ts` |
| Import/Export | `import/`, `api/export/` | `import-service.ts` | — |
| Gestione Utenti | `settings/users/` | `user-service.ts` | `user.ts` |
| Config Tenant | `settings/tenant/` | `tenant-service.ts` | — |
| Car List | `carlist/` | — (CRUD semplice) | — |
| Audit Trail | `settings/audit-log/` | `audit-service.ts` | — |

**Cross-Cutting Concerns → Location:**

| Concern | Files |
|---|---|
| Multi-tenancy | `middleware.ts`, `lib/db/tenant-extension.ts`, `prisma/sql/rls-policies.sql` |
| RBAC | `lib/auth/permissions.ts`, `middleware.ts`, ogni `actions/*.ts` |
| Audit Trail | `lib/services/audit-service.ts`, chiamato dai services emission-impacting |
| Feature Toggle | `lib/services/tenant-service.ts`, `settings/tenant/` |
| Validazione | `lib/schemas/*.ts` (condivisi), usati in `actions/` e `components/` |

### Integration Points

**Data Flow principale:**

```
UI Component (RSC) → Prisma query (via service, auto-filtered by tenant) → SQL Server
UI Component (Client) → Server Action → Zod validation → Service → Prisma → SQL Server
                                                       → Audit Service → AuditEntry
```

**Integrazioni esterne:**

| Integrazione | Punto di ingresso | Flow |
|---|---|---|
| InfocarData | `lib/integrations/infocardata/` | Import batch → mapper → vehicle/engine upsert |
| Codall | `api/images/vehicle/[codall]/route.ts` | Proxy con cache → URL immagine generata |
| Export PDF | `api/export/pdf/route.ts` | report-service → PDF generation → download |
| Export CSV | `api/export/csv/route.ts` | Query filtrata → CSV stream → download |

### Development Workflow

**Dev Server:** `npm run dev` → Turbopack + SQL Server via docker-compose
**Build:** `npm run build` → Next.js standalone output → `docker build`
**Deploy:** `docker-compose -f docker-compose.prod.yml up` → app container + DB esterno
**Migrations:** `npx prisma migrate dev` (dev) / `npx prisma migrate deploy` (prod)
**Seed:** `npx prisma db seed` → tenant demo + utenti + veicoli di esempio

## Architecture Validation Results

### Coherence Validation

**Decision Compatibility:** OK
Tutte le tecnologie scelte sono compatibili tra loro. Next.js 16.1 + React 19 + TypeScript 5.x (bundle ufficiale), Prisma 7.x + @prisma/adapter-mssql (GA), Better Auth + @better-auth/prisma (adapter ufficiale), shadcn/ui + Tailwind CSS 4.x + Radix UI (combinazione nativa). Un rischio minore identificato: Better Auth Prisma adapter + SQL Server e una combinazione meno testata rispetto a PostgreSQL — da validare nella prima story.

**Pattern Consistency:** OK
Naming conventions coerenti tra database (PascalCase model / camelCase fields), file system (kebab-case / PascalCase components), codice TypeScript (camelCase / PascalCase). ActionResult<T> allineato con Server Actions. Zod schema sharing coerente con validazione client/server. Audit events con naming consistente (entity.action lowercase).

**Structure Alignment:** OK
Struttura feature-based dentro App Router allineata con le decisioni. Boundaries chiari tra layers (route → action → service → db). Nessun cross-layer leak. Integration points ben definiti per InfocarData, Codall, export.

### Requirements Coverage Validation

**Copertura Funzionale (45 FR in 10 aree):** COMPLETA
Tutte le 10 aree funzionali mappate a route, services e schemas specifici. Nessun FR senza supporto architetturale.

**Copertura Non-Funzionale (27 NFR):** COMPLETA
- Performance: RSC streaming, Next.js caching, Prisma optimized queries
- Sicurezza: tenantId pervasivo + Prisma extension + RLS SQL Server + middleware auth
- Scalabilita: architettura sufficiente per 20 tenant x 500 veicoli
- Affidabilita: Docker standalone, backup script, error boundaries, graceful degradation
- Integrazione: InfocarData batch mapper, Codall con fallback, import CSV/XML

### Implementation Readiness Validation

**Decision Completeness:** OK — 20 decisioni documentate con versioni, rationale e affects
**Structure Completeness:** OK — ~100 file/directory espliciti con mapping requisiti
**Pattern Completeness:** OK — naming, structure, format, communication, process patterns definiti con esempi

### Gap Analysis Results

**Gap Importanti (da risolvere nelle prime story, non bloccanti):**
1. Libreria PDF generation per export report certificabili — candidati: `@react-pdf/renderer` o `puppeteer`
2. Libreria XML parsing per import fatture — candidato: `fast-xml-parser`
3. Testing framework — candidato: Vitest + @testing-library/react
4. Libreria export CSV — candidato: `papaparse`

**Gap Minori (post-MVP):**
5. Strategia i18n (app italiano-only per MVP)
6. Rate limiting API (basso rischio con B2B)
7. Health check endpoint per monitoring Docker
8. Strategy caching immagini Codall (TTL, storage)

### Architecture Completeness Checklist

**Requirements Analysis**
- [x] Contesto progetto analizzato (45 FR, 27 NFR)
- [x] Scala e complessita valutate (10k veicoli, 20 tenant)
- [x] Vincoli tecnici identificati (SQL Server, Docker, InfocarData, Codall)
- [x] Cross-cutting concerns mappati (6 concerns)

**Architectural Decisions**
- [x] 20 decisioni documentate con versioni e rationale
- [x] Stack tecnologico completo (Next.js 16 + Prisma 7 + Better Auth + shadcn/ui)
- [x] Pattern integrazione definiti (InfocarData, Codall, import/export)
- [x] Considerazioni performance indirizzate (caching, RSC, streaming)

**Implementation Patterns**
- [x] Naming conventions stabilite (database, file, codice)
- [x] Structure patterns definiti (feature-based App Router)
- [x] Communication patterns specificati (audit events, logging)
- [x] Process patterns documentati (loading, errors, validation, tenant injection)

**Project Structure**
- [x] Directory structure completa (~100 file/directory espliciti)
- [x] Component boundaries stabiliti (API, component, service, data)
- [x] Integration points mappati (4 integrazioni esterne)
- [x] Requirements → structure mapping completo (10 aree → location)

### Architecture Readiness Assessment

**Status Generale:** PRONTA PER IMPLEMENTAZIONE

**Livello Confidenza:** Alto

**Punti di Forza:**
- Stack moderno e coerente, tutte le versioni verificate (feb 2026)
- Multi-tenancy indirizzata a 3 livelli (applicativo Prisma extension, middleware, RLS SQL Server)
- RBAC nativo tramite Better Auth organization plugin
- Patterns chiari e enforceable per agenti AI
- Struttura progetto dettagliata con mapping requisiti esplicito
- Calcolo emissioni dual-mode isolato in service testabile

**Aree per Miglioramento Futuro:**
- Redis caching se la scala supera i 10k veicoli
- CI/CD pipeline (GitHub Actions) quando il team cresce
- API documentation se servono client esterni
- Monitoring/observability avanzata (OpenTelemetry)
- i18n se il prodotto si espande oltre il mercato italiano

### Implementation Handoff

**Linee guida per agenti AI:**
- Seguire tutte le decisioni architetturali esattamente come documentate
- Usare i pattern di implementazione in modo consistente su tutti i componenti
- Rispettare la struttura progetto e i boundaries definiti
- Consultare questo documento per ogni domanda architetturale

**Prima Priorita di Implementazione:**
1. `npx create-next-app@16 greenfleet --typescript --tailwind --eslint --app --src-dir --import-alias="@/*" --turbopack`
2. `npx shadcn@latest init`
3. Setup Prisma + SQL Server + Better Auth
4. Middleware auth + tenant injection
5. Prima entita CRUD (Vehicle) come proof of concept dello stack completo
