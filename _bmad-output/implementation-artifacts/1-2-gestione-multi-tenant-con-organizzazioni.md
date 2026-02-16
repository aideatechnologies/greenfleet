# Story 1.2: Gestione Multi-Tenant con Organizzazioni

Status: ready-for-dev

## Story

As a **Admin**,
I want **creare, modificare e disattivare societa (tenant) sulla piattaforma**,
So that **ogni azienda cliente abbia il proprio spazio di lavoro isolato**.

## Acceptance Criteria

1. Una nuova Organization viene creata tramite Better Auth organization plugin (Organization = Tenant)
2. Il Prisma schema include tenantId su tutte le entita multi-tenant
3. Il Prisma client extension applica automaticamente il filtro tenantId su ogni query e insert
4. L'Admin puo modificare i dati della societa e disattivarla
5. Le societa disattivate non permettono login ai propri utenti (FR6)
6. La struttura directory segue il layout feature-based definito in architecture.md

## Tasks / Subtasks

- [ ] Task 1: Configurare Better Auth Organization Plugin (AC: #1)
  - [ ] 1.1 Installare il plugin organization di Better Auth (`better-auth/plugins/organization` o equivalente API Better Auth)
  - [ ] 1.2 Aggiornare `src/lib/auth/auth.ts` — aggiungere organization plugin alla configurazione Better Auth server-side con ruoli: `admin`, `fleet-manager`, `driver`
  - [ ] 1.3 Aggiornare `src/lib/auth/auth-client.ts` — aggiungere organization plugin alla configurazione Better Auth client-side
  - [ ] 1.4 Aggiornare Prisma schema con le tabelle richieste dal plugin organization di Better Auth (organization, member, invitation) tramite CLI o manuale
  - [ ] 1.5 Eseguire `npx prisma migrate dev --name add-organizations` per creare le tabelle organization
- [ ] Task 2: Estendere Prisma Schema con tenantId (AC: #2)
  - [ ] 2.1 Aggiungere campo `tenantId String` su tutti i model multi-tenant esistenti e futuri (non su lookup globali come catalogo veicoli InfocarData)
  - [ ] 2.2 Aggiungere relazione `tenant Organization @relation(fields: [tenantId], references: [id])` sui model multi-tenant
  - [ ] 2.3 Creare indice composto `@@index([tenantId])` su ogni tabella multi-tenant per performance
  - [ ] 2.4 Aggiungere al model Organization i campi custom: `isActive Boolean @default(true)`, `slug String @unique`, `metadata Json?` (per configurazioni future)
  - [ ] 2.5 Eseguire `npx prisma migrate dev --name add-tenant-fields` per applicare le modifiche
- [ ] Task 3: Implementare Prisma Client Extension per Auto-Filter tenantId (AC: #3)
  - [ ] 3.1 Creare `src/lib/db/tenant-extension.ts` — Prisma client extension che intercetta `findMany`, `findFirst`, `findUnique`, `create`, `update`, `delete`, `count`, `aggregate` iniettando automaticamente `WHERE tenantId = ?` e `tenantId = ?` su insert
  - [ ] 3.2 L'extension riceve il `tenantId` come parametro alla creazione e lo applica a tutte le query/mutations
  - [ ] 3.3 L'extension deve escludere i model globali (lookup) dal filtro automatico (configurabili tramite lista whitelist)
  - [ ] 3.4 Aggiornare `src/lib/db/client.ts` — esportare una funzione `getPrismaForTenant(tenantId: string)` che ritorna il Prisma client con extension applicata
  - [ ] 3.5 Mantenere il singleton Prisma base (senza extension) per operazioni cross-tenant dell'Admin
- [ ] Task 4: Tenant Context Injection nel Middleware (AC: #3, #5)
  - [ ] 4.1 Aggiornare `src/middleware.ts` — dopo l'auth check, estrarre `tenantId` (organization corrente) dalla sessione Better Auth
  - [ ] 4.2 Verificare che l'organizzazione sia attiva (`isActive: true`) — se disattivata, redirigere a pagina di errore con messaggio "Societa disattivata" e forzare logout (AC: #5)
  - [ ] 4.3 Iniettare il `tenantId` nei headers della request (es. `x-tenant-id`) per uso nei Server Components e Server Actions
  - [ ] 4.4 Creare `src/lib/auth/get-tenant-context.ts` — helper server-side che estrae tenantId dai headers e ritorna il Prisma client filtrato per tenant
- [ ] Task 5: Zod Schema per Tenant (AC: #4)
  - [ ] 5.1 Creare `src/lib/schemas/tenant.ts` — schema Zod per creazione tenant: `name` (required, min 2, max 100), `slug` (required, kebab-case, unique), `metadata` (optional object)
  - [ ] 5.2 Creare schema Zod per modifica tenant: `name` (optional), `slug` (optional, kebab-case), `metadata` (optional)
  - [ ] 5.3 Creare schema Zod per disattivazione tenant: `id` (required), `reason` (optional string)
- [ ] Task 6: Server Actions CRUD Tenant (AC: #1, #4, #5)
  - [ ] 6.1 Creare `src/app/(dashboard)/settings/tenant/actions/create-tenant.ts` — Server Action: validazione Zod, verifica ruolo Admin, creazione Organization via Better Auth organization API, ritorna ActionResult<T>
  - [ ] 6.2 Creare `src/app/(dashboard)/settings/tenant/actions/update-tenant.ts` — Server Action: validazione Zod, verifica ruolo Admin, modifica dati Organization, ritorna ActionResult<T>
  - [ ] 6.3 Creare `src/app/(dashboard)/settings/tenant/actions/deactivate-tenant.ts` — Server Action: validazione Zod, verifica ruolo Admin, soft-delete (set `isActive: false`), ritorna ActionResult<T>
  - [ ] 6.4 Creare `src/app/(dashboard)/settings/tenant/actions/reactivate-tenant.ts` — Server Action: verifica ruolo Admin, set `isActive: true`, ritorna ActionResult<T>
- [ ] Task 7: Pagine UI Gestione Tenant (AC: #4, #6)
  - [ ] 7.1 Creare `src/app/(dashboard)/settings/tenant/page.tsx` — Server Component: lista tenant in DataTable con colonne (nome, slug, stato attivo/disattivo, data creazione, azioni). Admin vede tutti i tenant
  - [ ] 7.2 Creare `src/app/(dashboard)/settings/tenant/new/page.tsx` — form creazione tenant con React Hook Form + Zod + shadcn/ui Form (campi: nome, slug con auto-generate da nome)
  - [ ] 7.3 Creare `src/app/(dashboard)/settings/tenant/[id]/edit/page.tsx` — form modifica tenant con pre-fill dati correnti
  - [ ] 7.4 Creare `src/app/(dashboard)/settings/tenant/components/TenantTable.tsx` — componente DataTable con sorting, paginazione, StatusBadge per stato attivo/disattivo
  - [ ] 7.5 Creare `src/app/(dashboard)/settings/tenant/components/TenantForm.tsx` — componente form riutilizzabile per creazione e modifica
  - [ ] 7.6 Implementare dialog di conferma per disattivazione tenant (ConfirmDialog con messaggio chiaro sulle conseguenze)
  - [ ] 7.7 Creare `src/app/(dashboard)/settings/tenant/loading.tsx` — skeleton loading per la pagina tenant
  - [ ] 7.8 Creare `src/app/(dashboard)/settings/tenant/error.tsx` — error boundary con messaggio user-friendly e bottone retry
- [ ] Task 8: Tenant Service Layer (AC: #1, #4, #5)
  - [ ] 8.1 Creare `src/lib/services/tenant-service.ts` — business logic: `listTenants()`, `getTenantById(id)`, `createTenant(data)`, `updateTenant(id, data)`, `deactivateTenant(id)`, `reactivateTenant(id)`
  - [ ] 8.2 `createTenant` deve chiamare Better Auth organization API per creare l'organizzazione e poi aggiornare i campi custom (isActive, slug, metadata) via Prisma
  - [ ] 8.3 `deactivateTenant` esegue soft-delete: imposta `isActive: false`, non cancella fisicamente
  - [ ] 8.4 `deactivateTenant` deve invalidare le sessioni attive di tutti gli utenti del tenant
  - [ ] 8.5 Tutte le funzioni loggano le operazioni con Pino a livello `info`
- [ ] Task 9: Blocco Login per Tenant Disattivati (AC: #5)
  - [ ] 9.1 Nella configurazione Better Auth, aggiungere hook `onBeforeLogin` (o equivalente) che verifica lo stato `isActive` dell'organizzazione dell'utente
  - [ ] 9.2 Se il tenant e disattivato, il login viene rifiutato con messaggio "La societa risulta disattivata. Contattare l'amministratore."
  - [ ] 9.3 Nel middleware auth, aggiungere check periodico: se durante una sessione attiva il tenant viene disattivato, forzare il logout al prossimo request
- [ ] Task 10: Test Manuali di Verifica (AC: #1, #2, #3, #4, #5)
  - [ ] 10.1 Verificare creazione tenant: Admin crea un nuovo tenant, l'organizzazione appare nel database
  - [ ] 10.2 Verificare modifica tenant: Admin modifica nome/slug, i dati si aggiornano correttamente
  - [ ] 10.3 Verificare disattivazione: Admin disattiva un tenant, gli utenti del tenant non possono fare login
  - [ ] 10.4 Verificare riattivazione: Admin riattiva un tenant, gli utenti del tenant possono nuovamente fare login
  - [ ] 10.5 Verificare auto-filter tenantId: creare dati in 2 tenant diversi, verificare che le query di un tenant non restituiscano dati dell'altro
  - [ ] 10.6 Verificare che il Prisma client extension inietti automaticamente tenantId su create e filtra su findMany

## Dev Notes

### Dipendenza da Story 1.1

Questa story presuppone che lo scaffold del progetto sia completo (Story 1.1): Next.js 16, Prisma 7 + SQL Server, Better Auth base, Docker compose, struttura directory feature-based, ActionResult<T> pattern, middleware auth base.

### Decisioni Architetturali Rilevanti

- **DA-1 Modello Multi-Tenant**: `tenantId` su ogni entita (tranne lookup globali come catalogo veicoli InfocarData). Prisma client extension che inietta automaticamente `WHERE tenantId = ?` su ogni query e `tenantId = ?` su ogni insert
- **AS-2 RBAC — Better Auth Organization Plugin**: Organization = Tenant. 3 ruoli: Admin (cross-tenant), Fleet Manager (admin sul proprio tenant), Driver (read + write rifornimenti/km proprio veicolo)
- **AS-3 Tenant Isolation nell'Auth**: `tenantId` estratto dalla sessione Better Auth (organization corrente) e iniettato nel Prisma client extension ad ogni request
- **AC-1 Pattern API Ibrido**: Server Actions per mutations (CRUD tenant). Route Handlers solo per endpoints esterni
- **AC-2 Error Handling**: ActionResult<T> pattern su ogni Server Action
- **DA-4 Validazione Zod**: Schema Zod condivisi tra frontend e backend

### Prisma Client Extension per Auto-Filter tenantId

Il cuore della multi-tenancy applicativa. L'extension wrappa il Prisma client e intercetta tutte le operazioni.

```typescript
// src/lib/db/tenant-extension.ts
import { Prisma } from '../../generated/prisma'

// Model globali che NON devono essere filtrati per tenantId
const GLOBAL_MODELS = ['CatalogVehicle', 'CatalogEngine', 'EmissionFactor', 'User', 'Session', 'Account', 'Verification']

export function tenantExtension(tenantId: string) {
  return Prisma.defineExtension({
    name: 'tenant-isolation',
    query: {
      $allModels: {
        async findMany({ model, args, query }) {
          if (GLOBAL_MODELS.includes(model)) return query(args)
          args.where = { ...args.where, tenantId }
          return query(args)
        },
        async findFirst({ model, args, query }) {
          if (GLOBAL_MODELS.includes(model)) return query(args)
          args.where = { ...args.where, tenantId }
          return query(args)
        },
        async findUnique({ model, args, query }) {
          if (GLOBAL_MODELS.includes(model)) return query(args)
          // findUnique non supporta campi extra nel where,
          // convertire in findFirst con filtro tenantId
          return query(args)
        },
        async create({ model, args, query }) {
          if (GLOBAL_MODELS.includes(model)) return query(args)
          args.data = { ...args.data, tenantId }
          return query(args)
        },
        async update({ model, args, query }) {
          if (GLOBAL_MODELS.includes(model)) return query(args)
          args.where = { ...args.where, tenantId }
          return query(args)
        },
        async delete({ model, args, query }) {
          if (GLOBAL_MODELS.includes(model)) return query(args)
          args.where = { ...args.where, tenantId }
          return query(args)
        },
        async count({ model, args, query }) {
          if (GLOBAL_MODELS.includes(model)) return query(args)
          args.where = { ...args.where, tenantId }
          return query(args)
        },
      },
    },
  })
}
```

```typescript
// src/lib/db/client.ts — aggiornamento per supporto tenant
import { PrismaClient } from '../../generated/prisma'
import { PrismaMssql } from '@prisma/adapter-mssql'
import { tenantExtension } from './tenant-extension'

const adapter = new PrismaMssql({ connectionString: process.env.DATABASE_URL! })
const basePrisma = new PrismaClient({ adapter })

// Client base per operazioni cross-tenant (solo Admin)
export const prisma = basePrisma

// Client filtrato per tenant specifico
export function getPrismaForTenant(tenantId: string) {
  return basePrisma.$extends(tenantExtension(tenantId))
}
```

### Helper Tenant Context (lato server)

```typescript
// src/lib/auth/get-tenant-context.ts
import { headers } from 'next/headers'
import { getPrismaForTenant } from '@/lib/db/client'
import { auth } from '@/lib/auth/auth'

export async function getTenantContext() {
  const headersList = await headers()
  const tenantId = headersList.get('x-tenant-id')

  if (!tenantId) {
    throw new Error('Tenant context not available')
  }

  return {
    tenantId,
    db: getPrismaForTenant(tenantId),
  }
}
```

### Better Auth Organization Plugin Setup

```typescript
// src/lib/auth/auth.ts — aggiornamento con organization plugin
import { betterAuth } from "better-auth"
import { prismaAdapter } from "@better-auth/prisma"
import { organization } from "better-auth/plugins"
import { prisma } from "@/lib/db/client"

export const auth = betterAuth({
  database: prismaAdapter(prisma),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 12,
  },
  session: {
    cookieCache: { enabled: true, maxAge: 60 * 5 },
  },
  plugins: [
    organization({
      // Organization = Tenant
      // Ruoli configurati: admin, fleet-manager, driver
      roles: {
        admin: { permissions: ['*'] },
        'fleet-manager': { permissions: ['tenant:read', 'tenant:write'] },
        driver: { permissions: ['tenant:read'] },
      },
    }),
  ],
})
```

### Soft-Delete per Disattivazione Tenant

La disattivazione NON e una cancellazione fisica. Il campo `isActive` viene impostato a `false`. Conseguenze:
- Gli utenti del tenant non possono fare login (hook `onBeforeLogin`)
- Le sessioni attive vengono invalidate
- L'Admin puo riattivare il tenant in qualsiasi momento
- Tutti i dati del tenant restano intatti nel database

### ActionResult<T> Pattern per Server Actions

Tutte le Server Actions di questa story ritornano `ActionResult<T>`:

```typescript
// Esempio: create-tenant.ts
'use server'

import { ActionResult, ErrorCode } from '@/types/action-result'
import { createTenantSchema } from '@/lib/schemas/tenant'
import { tenantService } from '@/lib/services/tenant-service'

type CreateTenantResult = { id: string; name: string; slug: string }

export async function createTenant(formData: FormData): Promise<ActionResult<CreateTenantResult>> {
  // 1. Validazione Zod
  const parsed = createTenantSchema.safeParse({
    name: formData.get('name'),
    slug: formData.get('slug'),
  })
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message, code: ErrorCode.VALIDATION }
  }

  // 2. Verifica ruolo Admin (RBAC enforcement)
  // ... check session + role

  // 3. Delega al service
  try {
    const tenant = await tenantService.createTenant(parsed.data)
    return { success: true, data: tenant }
  } catch (error) {
    return { success: false, error: 'Errore nella creazione della societa', code: ErrorCode.INTERNAL }
  }
}
```

### Zod Schema per Tenant

```typescript
// src/lib/schemas/tenant.ts
import { z } from 'zod'

export const createTenantSchema = z.object({
  name: z.string()
    .min(2, 'Il nome deve avere almeno 2 caratteri')
    .max(100, 'Il nome non puo superare 100 caratteri'),
  slug: z.string()
    .min(2, 'Lo slug deve avere almeno 2 caratteri')
    .max(50, 'Lo slug non puo superare 50 caratteri')
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Lo slug deve essere in formato kebab-case (es. mia-azienda)'),
  metadata: z.record(z.unknown()).optional(),
})

export const updateTenantSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  slug: z.string().min(2).max(50)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Lo slug deve essere in formato kebab-case')
    .optional(),
  metadata: z.record(z.unknown()).optional(),
})

export const deactivateTenantSchema = z.object({
  id: z.string().min(1, 'ID tenant richiesto'),
  reason: z.string().max(500).optional(),
})

export type CreateTenantInput = z.infer<typeof createTenantSchema>
export type UpdateTenantInput = z.infer<typeof updateTenantSchema>
export type DeactivateTenantInput = z.infer<typeof deactivateTenantSchema>
```

### Convenzioni Naming (da architecture.md)

| Elemento | Convenzione | Esempio |
|---|---|---|
| Route directories | kebab-case | `src/app/(dashboard)/settings/tenant/` |
| React Components | PascalCase.tsx | `TenantTable.tsx`, `TenantForm.tsx` |
| Non-component files | kebab-case.ts | `tenant-extension.ts`, `get-tenant-context.ts` |
| Server Actions | kebab-case.ts in `actions/` | `create-tenant.ts`, `update-tenant.ts` |
| Zod schemas | kebab-case.ts in `src/lib/schemas/` | `tenant.ts` |
| Service files | kebab-case.ts in `src/lib/services/` | `tenant-service.ts` |

### Struttura Directory per questa Story

```
src/
├── app/(dashboard)/settings/tenant/
│   ├── page.tsx                    # Lista tenant (Server Component)
│   ├── loading.tsx                 # Skeleton loading
│   ├── error.tsx                   # Error boundary
│   ├── new/
│   │   └── page.tsx                # Form creazione tenant
│   ├── [id]/
│   │   └── edit/
│   │       └── page.tsx            # Form modifica tenant
│   ├── actions/
│   │   ├── create-tenant.ts
│   │   ├── update-tenant.ts
│   │   ├── deactivate-tenant.ts
│   │   └── reactivate-tenant.ts
│   └── components/
│       ├── TenantTable.tsx
│       └── TenantForm.tsx
├── lib/
│   ├── auth/
│   │   └── get-tenant-context.ts   # Helper estrazione tenant da request
│   ├── db/
│   │   └── tenant-extension.ts     # Prisma extension auto-filter tenantId
│   ├── schemas/
│   │   └── tenant.ts               # Zod schemas per tenant CRUD
│   └── services/
│       └── tenant-service.ts       # Business logic tenant
└── middleware.ts                    # Aggiornato: tenant extraction + isActive check
```

### Middleware Auth — Aggiornamenti per Tenant Context

Il middleware creato in Story 1.1 va esteso per:
1. Estrarre la `organizationId` (= tenantId) dalla sessione Better Auth
2. Verificare che l'organizzazione sia attiva (`isActive: true`)
3. Iniettare `x-tenant-id` nei headers della request
4. Se il tenant e disattivato, forzare redirect a `/login` con messaggio di errore

### Anti-Pattern da Evitare

- NON passare `tenantId` come parametro URL o query string — estrarre SEMPRE dalla sessione Better Auth
- NON filtrare manualmente per `tenantId` nelle query Prisma — usare SEMPRE il Prisma client extension
- NON cancellare fisicamente un tenant — usare SEMPRE soft-delete con `isActive: false`
- NON creare Server Actions dentro page.tsx — metterle SEMPRE in directory `actions/`
- NON implementare business logic nei componenti o nelle actions — delegare SEMPRE a `src/lib/services/`
- NON fidarsi della validazione client-side — validare SEMPRE con Zod anche nel Server Action
- NON usare `any` in TypeScript — usare tipi espliciti o `unknown` con type guard
- NON bypassare il middleware per check RBAC — ogni Server Action deve verificare il ruolo Admin prima di eseguire operazioni tenant
- NON invalidare le sessioni in modo sincrono durante la disattivazione — gestire nel middleware al prossimo request

### Note su Better Auth Organization Plugin

L'API esatta del plugin organization di Better Auth puo variare. Consultare la documentazione ufficiale di Better Auth per:
- Come creare un'organizzazione programmaticamente (server-side)
- Come assegnare un membro a un'organizzazione con un ruolo
- Come ottenere l'organizzazione corrente dalla sessione
- Come configurare i ruoli custom (`admin`, `fleet-manager`, `driver`)
- Quali tabelle aggiunge al database (organization, member, invitation)

### References

- [Source: architecture.md#DA-1] — Modello Multi-Tenant con tenantId pervasivo
- [Source: architecture.md#AS-2] — Better Auth Organization Plugin, Organization = Tenant
- [Source: architecture.md#AS-3] — Tenant Isolation: tenantId dalla sessione → Prisma client extension
- [Source: architecture.md#AC-1] — Server Actions per mutations
- [Source: architecture.md#AC-2] — ActionResult<T> error handling
- [Source: architecture.md#DA-4] — Validazione Zod condivisa client/server
- [Source: architecture.md#Project Structure] — Directory structure e boundaries
- [Source: architecture.md#Tenant Context Injection Flow] — Request → Middleware → tenantId → Prisma extension
- [Source: epics.md#Story 1.2] — Acceptance criteria BDD
- [Source: prd.md#FR6] — CRUD societa/tenant
- [Source: prd.md#FR8] — Isolamento dati cross-tenant
- [Source: prd.md#NFR6] — Zero data leak tra tenant

## Dev Agent Record

### Agent Model Used



### Debug Log References

### Completion Notes List

### File List

