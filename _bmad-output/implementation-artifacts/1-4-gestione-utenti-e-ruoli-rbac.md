# Story 1.4: Gestione Utenti e Ruoli RBAC

Status: done

## Story

As a **Admin**,
I want **creare e gestire utenti con ruoli Admin, Fleet Manager o Driver su qualsiasi tenant**,
So that **ogni utente abbia l'accesso appropriato alle funzionalita della piattaforma**.

## Acceptance Criteria

1. L'Admin puo creare un utente specificando ruolo (Admin/Fleet Manager/Driver) e tenant, e l'utente viene creato con il ruolo assegnato nell'organizzazione corretta (FR9)
2. Il Fleet Manager puo creare e gestire utenti FM e Driver solo sul proprio tenant (FR10)
3. Il Fleet Manager puo eseguire tutte le operazioni Admin limitate al proprio tenant (FR11)
4. Il Driver puo visualizzare in sola lettura solo i propri dati personali, il proprio veicolo, i propri contratti e documenti (FR12)
5. L'enforcement RBAC e a livello API — nessun bypass possibile dalla UI (NFR12)
6. Il middleware auth inietta il tenant context nel Prisma client ad ogni richiesta

## Tasks / Subtasks

- [ ] Task 1: Creare permissions helper (AC: #5, #6)
  - [ ] 1.1 Creare `src/lib/auth/permissions.ts` con funzioni: `hasRole(session, role)`, `canAccess(session, tenantId)`, `isTenantAdmin(session, tenantId)`, `isDriver(session)`
  - [ ] 1.2 `hasRole()` verifica il ruolo dell'utente nella sessione Better Auth (Admin, FleetManager, Driver)
  - [ ] 1.3 `canAccess()` verifica che l'utente appartenga al tenant richiesto (Admin bypassa — accesso cross-tenant)
  - [ ] 1.4 `isTenantAdmin()` ritorna true se l'utente e Admin (globale) o Fleet Manager sul tenant specificato
  - [ ] 1.5 `isDriver()` ritorna true se il ruolo e Driver — implica sola lettura tranne rifornimenti/km propri
  - [ ] 1.6 Creare helper `requireRole(session, role)` che lancia errore FORBIDDEN se il ruolo non corrisponde — usabile nelle Server Actions
  - [ ] 1.7 Creare helper `requireTenantAccess(session, tenantId)` che lancia errore FORBIDDEN se l'utente non ha accesso al tenant
- [ ] Task 2: Configurare Better Auth organization plugin con 3 ruoli (AC: #1, #2, #3)
  - [ ] 2.1 Aggiungere il plugin `organization` alla configurazione Better Auth in `src/lib/auth/auth.ts`
  - [ ] 2.2 Definire i 3 ruoli nell'organization plugin: `admin`, `fleet-manager`, `driver`
  - [ ] 2.3 Configurare i permessi per ruolo: Admin (full CRUD cross-tenant), FleetManager (full CRUD proprio tenant), Driver (read-only + write rifornimenti/km propri)
  - [ ] 2.4 Aggiornare `src/lib/auth/auth-client.ts` con il plugin organization lato client
  - [ ] 2.5 Aggiornare lo schema Prisma con i modelli Better Auth organization (organization, member, invitation) ed eseguire migrazione
  - [ ] 2.6 Verificare che la sessione Better Auth includa organizationId e ruolo membro
- [ ] Task 3: Creare user management CRUD — Server Actions (AC: #1, #2, #5)
  - [ ] 3.1 Creare `src/lib/schemas/user.ts` con schema Zod: `createUserSchema` (name, email, password, role, tenantId), `updateUserSchema` (name, email, role, isActive), `userFilterSchema` (search, role, isActive)
  - [ ] 3.2 Creare `src/app/(dashboard)/settings/users/actions/create-user.ts` — Server Action che: valida input Zod, verifica RBAC (Admin o FM sul tenant), crea utente via Better Auth API, assegna ruolo nell'organizzazione, ritorna ActionResult<User>
  - [ ] 3.3 Creare `src/app/(dashboard)/settings/users/actions/update-user.ts` — Server Action che: valida input Zod, verifica RBAC (Admin o FM sul tenant), aggiorna utente e ruolo, ritorna ActionResult<User>
  - [ ] 3.4 Creare `src/app/(dashboard)/settings/users/actions/delete-user.ts` — Server Action che: verifica RBAC, disattiva utente (soft delete, non cancellazione fisica), ritorna ActionResult<void>
  - [ ] 3.5 Ogni Server Action applica regola FR10: FM puo gestire solo ruoli FM e Driver sul proprio tenant — non puo creare Admin ne operare su altri tenant
  - [ ] 3.6 Ogni Server Action applica password policy NFR9 (minimo 12 caratteri, complessita) per creazione utente
- [ ] Task 4: Implementare RBAC checks in ogni Server Action (AC: #5, #6)
  - [ ] 4.1 In `create-user.ts`: verificare che il chiamante sia Admin oppure FM sul tenant target. Se FM, verificare che il ruolo assegnato non sia Admin
  - [ ] 4.2 In `update-user.ts`: verificare che il chiamante sia Admin oppure FM sul tenant dell'utente target. Se FM, impedire promozione a Admin
  - [ ] 4.3 In `delete-user.ts`: verificare che il chiamante sia Admin oppure FM sul tenant dell'utente target. Impedire auto-disattivazione
  - [ ] 4.4 Aggiornare il middleware `src/middleware.ts` per iniettare tenant context (organizationId) nel Prisma client ad ogni richiesta autenticata
  - [ ] 4.5 Impostare SESSION_CONTEXT SQL Server con tenantId nel middleware prima di ogni query (integrazione con `src/lib/db/rls-context.ts`)
  - [ ] 4.6 Verificare che tutte le route `settings/users/*` siano protette dal middleware — redirect a /login se non autenticato, errore 403 se ruolo insufficiente
- [ ] Task 5: Creare user management pages e DataTable (AC: #1, #2, #4)
  - [ ] 5.1 Creare `src/app/(dashboard)/settings/users/page.tsx` — pagina lista utenti come React Server Component. Carica utenti filtrati per tenant (Admin vede tutti, FM vede solo proprio tenant)
  - [ ] 5.2 Creare `src/app/(dashboard)/settings/users/components/UserTable.tsx` — DataTable con TanStack Table + shadcn/ui: colonne nome, email, ruolo, tenant, stato, azioni. Sorting, paginazione 50 righe default
  - [ ] 5.3 Implementare filtri nella UserTable: ricerca per nome/email (debounce 300ms), filtro per ruolo (Admin/FM/Driver), filtro per stato (attivo/inattivo)
  - [ ] 5.4 Creare `src/app/(dashboard)/settings/users/new/page.tsx` — form creazione utente con React Hook Form + Zod + shadcn/ui Form. Layout 2 colonne desktop, label sopra input, validazione on-blur
  - [ ] 5.5 Creare `src/app/(dashboard)/settings/users/components/UserForm.tsx` — form riutilizzabile per creazione e modifica utente. Campi: nome, email, password (solo creazione), ruolo (select), tenant (select — solo per Admin, FM vede solo proprio tenant)
  - [ ] 5.6 Creare `src/app/(dashboard)/settings/users/loading.tsx` — skeleton matching struttura pagina
  - [ ] 5.7 Creare `src/app/(dashboard)/settings/users/error.tsx` — error boundary con messaggio user-friendly + bottone retry
  - [ ] 5.8 Implementare vista Driver: se il ruolo e Driver, mostrare solo i propri dati in sola lettura (profilo, veicolo assegnato, contratti, documenti) — nessun accesso alla gestione utenti
- [ ] Task 6: Test RBAC enforcement (AC: #5)
  - [ ] 6.1 Verificare che FM non possa invocare Server Actions su tenant diversi — la richiesta deve ritornare `{ success: false, code: "FORBIDDEN" }`
  - [ ] 6.2 Verificare che FM non possa creare utenti con ruolo Admin — la richiesta deve ritornare `{ success: false, code: "FORBIDDEN" }`
  - [ ] 6.3 Verificare che Driver non possa accedere alle pagine di gestione utenti — redirect o errore 403
  - [ ] 6.4 Verificare che Driver possa visualizzare solo i propri dati — nessun dato di altri utenti nel response
  - [ ] 6.5 Verificare che le Server Actions non siano bypassabili chiamandole direttamente senza sessione valida — devono ritornare `{ success: false, code: "UNAUTHORIZED" }`
  - [ ] 6.6 Verificare che il tenant context sia correttamente iniettato nel Prisma client — query senza tenantId esplicito devono comunque filtrare per il tenant della sessione

## Dev Notes

### Better Auth Organization Plugin — Ruoli

Better Auth utilizza il concetto di Organization per rappresentare il tenant. Ogni utente e membro di un'organizzazione con un ruolo specifico. I 3 ruoli Greenfleet mappano cosi:

| Ruolo Greenfleet | Ruolo Organization | Scope |
|---|---|---|
| Admin | `admin` | Cross-tenant: membro di tutte le organizzazioni, o ruolo speciale globale |
| Fleet Manager | `admin` (nell'org) | Single-tenant: admin nell'organizzazione del proprio tenant |
| Driver | `member` (nell'org) | Single-tenant: membro base, read-only + write propri rifornimenti/km |

**Nota critica:** L'Admin Greenfleet e un concetto applicativo che va oltre i ruoli organizzazione Better Auth. L'implementazione puo usare un flag `isGlobalAdmin` nel modello User, oppure un ruolo custom nel plugin organization. Verificare la documentazione Better Auth per il pattern raccomandato di "super admin" cross-organization.

### Middleware — Tenant Context Injection

Il flusso di iniezione tenant segue il pattern definito in architecture.md:

```
Request → Middleware (auth check via Better Auth)
  → Extract session (userId, organizationId, role)
  → Set tenantId = organizationId nella richiesta
  → Prisma client extension: auto-filter WHERE tenantId = ?
  → SQL Server SESSION_CONTEXT('tenantId', ?) per RLS
```

Il middleware (`src/middleware.ts`) deve:
1. Verificare che la sessione Better Auth sia valida
2. Estrarre `organizationId` dalla sessione come `tenantId`
3. Passare `tenantId` al Prisma client extension (creato nella story 1.2)
4. Impostare `SESSION_CONTEXT` SQL Server tramite `src/lib/db/rls-context.ts` (creato nella story 1.3)

### RBAC Enforcement Pattern

L'enforcement RBAC avviene a **due livelli** (AS-5):

1. **Middleware Next.js** — verifica autenticazione e route protection (chi puo accedere a quali pagine)
2. **Server Actions** — verifica RBAC granulare (chi puo eseguire quale operazione su quale risorsa)

```typescript
// Pattern per ogni Server Action
"use server"

import { auth } from "@/lib/auth/auth"
import { requireRole, requireTenantAccess } from "@/lib/auth/permissions"

export async function createUser(input: CreateUserInput): Promise<ActionResult<User>> {
  const session = await auth.api.getSession({ headers: headers() })
  if (!session) return { success: false, error: "Non autenticato", code: "UNAUTHORIZED" }

  // RBAC check: Admin o FM sul tenant target
  const canManageUsers = isTenantAdmin(session, input.tenantId)
  if (!canManageUsers) return { success: false, error: "Permesso negato", code: "FORBIDDEN" }

  // FM non puo creare Admin
  if (!hasRole(session, "admin") && input.role === "admin") {
    return { success: false, error: "Solo Admin puo creare altri Admin", code: "FORBIDDEN" }
  }

  // Validazione Zod
  const parsed = createUserSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: parsed.error.message, code: "VALIDATION" }

  // Business logic via service
  // ...
}
```

### Permissions Helper — API

```typescript
// src/lib/auth/permissions.ts

/** Verifica se l'utente ha il ruolo specificato */
function hasRole(session: Session, role: "admin" | "fleet-manager" | "driver"): boolean

/** Verifica se l'utente puo accedere al tenant (Admin bypassa) */
function canAccess(session: Session, tenantId: string): boolean

/** Verifica se l'utente e admin del tenant (Admin globale o FM sul tenant) */
function isTenantAdmin(session: Session, tenantId: string): boolean

/** Verifica se l'utente e Driver */
function isDriver(session: Session): boolean

/** Lancia errore FORBIDDEN se il ruolo non corrisponde */
function requireRole(session: Session, role: "admin" | "fleet-manager" | "driver"): void

/** Lancia errore FORBIDDEN se l'utente non ha accesso al tenant */
function requireTenantAccess(session: Session, tenantId: string): void
```

### Struttura File Target

```
src/
├── lib/
│   └── auth/
│       └── permissions.ts          # hasRole, canAccess, isTenantAdmin, isDriver
├── app/
│   └── (dashboard)/
│       └── settings/
│           └── users/
│               ├── page.tsx        # Lista utenti (RSC)
│               ├── loading.tsx     # Skeleton
│               ├── error.tsx       # Error boundary
│               ├── new/
│               │   └── page.tsx    # Form creazione utente
│               ├── actions/
│               │   ├── create-user.ts
│               │   ├── update-user.ts
│               │   └── delete-user.ts
│               └── components/
│                   ├── UserTable.tsx
│                   └── UserForm.tsx
└── lib/
    └── schemas/
        └── user.ts                 # Zod schemas per validazione
```

### Decisioni Architetturali Rilevanti

- **AS-2 RBAC:** Better Auth organization plugin. Organization = Tenant. 3 ruoli: Admin (cross-tenant), Fleet Manager (admin sul proprio tenant), Driver (read + write rifornimenti/km proprio veicolo)
- **AS-5 API Security:** Middleware Next.js per verifica sessione. RBAC enforcement a livello di singola Server Action per granularita
- **AC-1 Pattern API Ibrido:** Server Actions per mutations CRUD utenti. Nessun Route Handler necessario
- **AC-2 Error Handling:** ActionResult<T> pattern su ogni Server Action
- **DA-4 Validazione Zod:** Schema Zod condivisi tra form (React Hook Form) e Server Action
- **FA-3 Forms:** React Hook Form + Zod + shadcn/ui Form per il form utente
- **FA-5 DataTable:** TanStack Table + shadcn/ui DataTable per la lista utenti

### Dipendenze da Story Precedenti

- **Story 1.1:** Scaffold progetto, Better Auth base, middleware auth, struttura directory, ActionResult<T>
- **Story 1.2:** Better Auth organization plugin configurato, schema Prisma con tenantId, Prisma client extension per auto-filter tenant
- **Story 1.3:** RLS SQL Server con SESSION_CONTEXT, `src/lib/db/rls-context.ts`

### Anti-Pattern da Evitare

- NON controllare i permessi solo lato UI (es. nascondere bottoni) — il check RBAC DEVE essere nella Server Action
- NON passare tenantId come parametro URL o hidden field — estrarre SEMPRE dalla sessione
- NON permettere al FM di assegnare ruolo Admin — il check deve essere esplicito nella Server Action
- NON usare `any` per il tipo sessione — definire tipi espliciti per Session e ruoli
- NON fare query utenti senza filtro tenant (tranne Admin) — il Prisma client extension deve applicare il filtro automaticamente
- NON cancellare fisicamente gli utenti — usare soft delete (campo isActive/disabledAt)

### Password Policy (NFR9)

Alla creazione utente, la password deve rispettare la policy:

```typescript
const passwordSchema = z.string()
  .min(12, "Minimo 12 caratteri")
  .regex(/[A-Z]/, "Almeno una maiuscola")
  .regex(/[a-z]/, "Almeno una minuscola")
  .regex(/[0-9]/, "Almeno un numero")
  .regex(/[^A-Za-z0-9]/, "Almeno un carattere speciale")
```

### References

- [Source: architecture.md#AS-2] — RBAC via Better Auth organization plugin, 3 ruoli
- [Source: architecture.md#AS-5] — Middleware auth + RBAC enforcement per Server Action
- [Source: architecture.md#AS-3] — Tenant isolation nell'auth, tenantId dalla sessione
- [Source: architecture.md#Project Structure] — `settings/users/` directory completa
- [Source: epics.md#Story 1.4] — Acceptance criteria BDD
- [Source: prd.md#FR9-FR12] — Requisiti gestione utenti e ruoli
- [Source: prd.md#NFR12] — RBAC enforcement a livello API

## Dev Agent Record

### Agent Model Used



### Debug Log References

### Completion Notes List

### File List

