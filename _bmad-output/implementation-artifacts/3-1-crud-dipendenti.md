# Story 3.1: CRUD Dipendenti

Status: done

## Story

As a **Fleet Manager**,
I want **creare, modificare e disattivare dipendenti nel mio tenant**,
So that **posso gestire l'anagrafica dei conducenti della mia flotta**.

## Acceptance Criteria

1. Il dipendente viene salvato con tenantId automatico (FR13), iniettato dal Prisma client extension senza passaggio manuale
2. Il Fleet Manager puo modificare i dati del dipendente (nome, cognome, email, telefono, codice fiscale)
3. Il Fleet Manager puo disattivare un dipendente (soft delete: isActive = false, non cancellazione fisica)
4. I dipendenti disattivati non sono selezionabili per nuove assegnazioni ma restano nello storico (query filtrate per isActive dove necessario)
5. Il form utilizza React Hook Form + Zod con validazione on-blur
6. La lista dipendenti e visualizzata in DataTable con sorting, filtri (nome, cognome, stato attivo/inattivo) e paginazione (50 righe default)
7. L'Admin puo eseguire le stesse operazioni CRUD su qualsiasi tenant

## Tasks / Subtasks

- [ ] Task 1: Modello Prisma Employee (AC: #1)
  - [ ] 1.1 Aggiungere il model `Employee` in `prisma/schema.prisma` con campi: `id` (String, uuid, @id @default(uuid())), `tenantId` (String), `firstName` (String), `lastName` (String), `email` (String, optional), `phone` (String, optional), `fiscalCode` (String, optional), `isActive` (Boolean, @default(true)), `createdAt` (DateTime, @default(now())), `updatedAt` (DateTime, @updatedAt)
  - [ ] 1.2 Aggiungere `@@map("Employees")` e mapping colonne con `@map` snake_case (es. `tenant_id`, `first_name`, `last_name`, `fiscal_code`, `is_active`, `created_at`, `updated_at`)
  - [ ] 1.3 Aggiungere relazione con Tenant/Organization: `tenant` relation a Organization model
  - [ ] 1.4 Aggiungere indici: `@@index([tenantId], map: "idx_employees_tenant_id")`, `@@unique([tenantId, fiscalCode], map: "uq_employees_tenant_fiscal_code")` (se fiscalCode non null)
  - [ ] 1.5 Eseguire `npx prisma migrate dev --name add-employee-model` per creare la tabella
  - [ ] 1.6 Verificare che la Prisma client extension auto-filtra per tenantId sulle query Employee

- [ ] Task 2: Schema Zod in `src/lib/schemas/employee.ts` (AC: #5)
  - [ ] 2.1 Creare `createEmployeeSchema` con Zod: `firstName` (string, min 1, max 100), `lastName` (string, min 1, max 100), `email` (string email, optional), `phone` (string, optional, regex per formato telefono italiano), `fiscalCode` (string, optional, regex per formato codice fiscale italiano [A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z], uppercase)
  - [ ] 2.2 Creare `updateEmployeeSchema` che estende createEmployeeSchema con `id` (string uuid)
  - [ ] 2.3 Creare `employeeFilterSchema` per filtri DataTable: `search` (string, optional), `isActive` (boolean, optional), `page` (number, default 1), `pageSize` (number, default 50), `sortBy` (string, optional), `sortOrder` (enum asc/desc, optional)
  - [ ] 2.4 Esportare i tipi inferiti `CreateEmployeeInput`, `UpdateEmployeeInput`, `EmployeeFilterInput`

- [ ] Task 3: Service in `src/lib/services/employee-service.ts` (AC: #1, #2, #3, #4, #7)
  - [ ] 3.1 Creare funzione `getEmployees(prisma, filters: EmployeeFilterInput): Promise<PaginatedResult<Employee>>` — lista paginata con sorting, filtri su nome/cognome/email, filtro isActive. Il Prisma client ha gia il tenant filter automatico
  - [ ] 3.2 Creare funzione `getEmployeeById(prisma, id: string): Promise<Employee | null>` — singolo dipendente per id
  - [ ] 3.3 Creare funzione `createEmployee(prisma, data: CreateEmployeeInput): Promise<Employee>` — creazione con tenantId automatico dal Prisma extension
  - [ ] 3.4 Creare funzione `updateEmployee(prisma, id: string, data: UpdateEmployeeInput): Promise<Employee>` — aggiornamento dati
  - [ ] 3.5 Creare funzione `deactivateEmployee(prisma, id: string): Promise<Employee>` — soft delete (isActive = false, updatedAt aggiornato)
  - [ ] 3.6 Creare funzione `reactivateEmployee(prisma, id: string): Promise<Employee>` — riattivazione (isActive = true)
  - [ ] 3.7 Creare funzione `getActiveEmployees(prisma): Promise<Employee[]>` — lista dipendenti attivi per dropdown assegnazioni (usata da story 3.4)
  - [ ] 3.8 Il service riceve il Prisma client gia filtrato per tenant — mai accedere a request/session direttamente

- [ ] Task 4: Server Actions CRUD in `src/app/(dashboard)/employees/actions/` (AC: #1, #2, #3, #7)
  - [ ] 4.1 Creare `create-employee.ts` — `"use server"`, validazione Zod con `createEmployeeSchema`, check permessi (FM sul proprio tenant o Admin), chiama `createEmployee` service, ritorna `ActionResult<Employee>`
  - [ ] 4.2 Creare `update-employee.ts` — `"use server"`, validazione Zod con `updateEmployeeSchema`, check permessi, chiama `updateEmployee` service, ritorna `ActionResult<Employee>`
  - [ ] 4.3 Creare `deactivate-employee.ts` — `"use server"`, check permessi, chiama `deactivateEmployee` service, ritorna `ActionResult<Employee>`
  - [ ] 4.4 Creare `reactivate-employee.ts` — `"use server"`, check permessi, chiama `reactivateEmployee` service, ritorna `ActionResult<Employee>`
  - [ ] 4.5 Ogni action: estrae tenantId e ruolo dalla sessione Better Auth, verifica autorizzazione (FM: solo proprio tenant, Admin: qualsiasi tenant), logga errori con Pino, gestisce eccezioni con try/catch ritornando `ActionResult` con ErrorCode appropriato

- [ ] Task 5: Componente EmployeeTable in `src/app/(dashboard)/employees/components/EmployeeTable.tsx` (AC: #6)
  - [ ] 5.1 Creare componente client `EmployeeTable` basato su TanStack Table + shadcn/ui DataTable
  - [ ] 5.2 Colonne: Nome Completo (firstName + lastName), Email, Telefono, Codice Fiscale, Stato (StatusBadge attivo/inattivo), Azioni
  - [ ] 5.3 Implementare sorting su tutte le colonne
  - [ ] 5.4 Implementare filtro ricerca testo con debounce 300ms (cerca su nome, cognome, email)
  - [ ] 5.5 Implementare filtro stato attivo/inattivo con chip/toggle
  - [ ] 5.6 Implementare paginazione con 50 righe default
  - [ ] 5.7 Azioni riga: Modifica (link a edit page), Disattiva/Riattiva (con ConfirmDialog)
  - [ ] 5.8 Formattazione: codice fiscale in uppercase, numeri telefono formattati, EmptyState quando nessun dipendente presente

- [ ] Task 6: Componente EmployeeForm in `src/app/(dashboard)/employees/components/EmployeeForm.tsx` (AC: #5)
  - [ ] 6.1 Creare componente client `EmployeeForm` con React Hook Form + Zod resolver + shadcn/ui Form
  - [ ] 6.2 Campi: firstName (obbligatorio), lastName (obbligatorio), email (opzionale), phone (opzionale), fiscalCode (opzionale)
  - [ ] 6.3 Layout a 2 colonne su desktop (firstName + lastName prima riga, email + phone seconda riga, fiscalCode terza riga a colonna singola)
  - [ ] 6.4 Validazione inline on-blur su ogni campo (errore sotto il campo)
  - [ ] 6.5 Uppercase automatico su fiscalCode
  - [ ] 6.6 Submission con `useActionState` (React 19): pending state con spinner sul button, feedback toast successo/errore
  - [ ] 6.7 Il form funziona sia per creazione (campi vuoti) che per modifica (campi precompilati da prop `defaultValues`)
  - [ ] 6.8 Button hierarchy: Primary "Salva" (una sola), Secondary "Annulla" (torna alla lista)

- [ ] Task 7: Pagine route `src/app/(dashboard)/employees/` (AC: #6)
  - [ ] 7.1 Creare `page.tsx` — Server Component: chiama `getEmployees` service, renderizza EmployeeTable. Header con titolo "Dipendenti" e bottone "Nuovo Dipendente" (Primary)
  - [ ] 7.2 Creare `new/page.tsx` — Server Component: renderizza EmployeeForm in modalita creazione. Breadcrumb: Dipendenti > Nuovo
  - [ ] 7.3 Creare `[id]/page.tsx` — Server Component: chiama `getEmployeeById`, renderizza dettaglio dipendente con dati anagrafici. Breadcrumb: Dipendenti > {nome}. Bottoni: Modifica, Disattiva/Riattiva
  - [ ] 7.4 Creare `[id]/edit/page.tsx` — Server Component: chiama `getEmployeeById`, renderizza EmployeeForm in modalita modifica con defaultValues. Breadcrumb: Dipendenti > {nome} > Modifica

- [ ] Task 8: Soft delete e gestione stato (AC: #3, #4)
  - [ ] 8.1 L'azione di disattivazione mostra ConfirmDialog: "Sei sicuro di voler disattivare {nome}? Il dipendente non sara piu selezionabile per nuove assegnazioni."
  - [ ] 8.2 I dipendenti disattivati mostrano StatusBadge "Inattivo" (variant destructive) nella lista
  - [ ] 8.3 I dipendenti attivi mostrano StatusBadge "Attivo" (variant success) nella lista
  - [ ] 8.4 Il filtro di default nella lista mostra solo dipendenti attivi — toggle per vedere anche inattivi
  - [ ] 8.5 La funzione `getActiveEmployees` del service ritorna solo isActive=true (usata per dropdown assegnazioni nelle story successive)
  - [ ] 8.6 La riattivazione e disponibile solo su dipendenti inattivi, con conferma

- [ ] Task 9: Loading e Error states (AC: #6)
  - [ ] 9.1 Creare `src/app/(dashboard)/employees/loading.tsx` — skeleton della DataTable (header + righe placeholder) usando shadcn/ui Skeleton
  - [ ] 9.2 Creare `src/app/(dashboard)/employees/error.tsx` — error boundary con messaggio user-friendly "Errore nel caricamento dei dipendenti" + bottone "Riprova"
  - [ ] 9.3 Creare `src/app/(dashboard)/employees/[id]/loading.tsx` — skeleton del dettaglio dipendente
  - [ ] 9.4 Toast di feedback: successo auto-dismiss 5s, errori persistenti fino a dismissione manuale

## Dev Notes

### Modello Prisma Employee

```prisma
model Employee {
  id         String   @id @default(uuid()) @map("id")
  tenantId   String   @map("tenant_id")
  firstName  String   @map("first_name") @db.NVarChar(100)
  lastName   String   @map("last_name") @db.NVarChar(100)
  email      String?  @map("email") @db.NVarChar(255)
  phone      String?  @map("phone") @db.NVarChar(50)
  fiscalCode String?  @map("fiscal_code") @db.NVarChar(16)
  isActive   Boolean  @default(true) @map("is_active")
  createdAt  DateTime @default(now()) @map("created_at")
  updatedAt  DateTime @updatedAt @map("updated_at")

  @@map("Employees")
  @@index([tenantId], map: "idx_employees_tenant_id")
  @@unique([tenantId, fiscalCode], map: "uq_employees_tenant_fiscal_code")
}
```

**Note:**
- Il campo `tenantId` viene iniettato automaticamente dal Prisma client extension definito in `src/lib/db/tenant-extension.ts` — la Server Action NON deve passarlo esplicitamente
- L'unique constraint su `[tenantId, fiscalCode]` permette lo stesso codice fiscale su tenant diversi ma previene duplicati nello stesso tenant
- `fiscalCode` e nullable perche non tutti i dipendenti potrebbero averlo (es. dipendenti esteri)
- `@db.NVarChar` per supporto caratteri unicode (nomi con accenti, etc.)

### Zod Schema Employee

```typescript
// src/lib/schemas/employee.ts
import { z } from "zod"

const fiscalCodeRegex = /^[A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z]$/

export const createEmployeeSchema = z.object({
  firstName: z.string().min(1, "Nome obbligatorio").max(100, "Massimo 100 caratteri"),
  lastName: z.string().min(1, "Cognome obbligatorio").max(100, "Massimo 100 caratteri"),
  email: z.string().email("Email non valida").optional().or(z.literal("")),
  phone: z.string().max(50, "Massimo 50 caratteri").optional().or(z.literal("")),
  fiscalCode: z
    .string()
    .toUpperCase()
    .regex(fiscalCodeRegex, "Codice fiscale non valido")
    .optional()
    .or(z.literal("")),
})

export const updateEmployeeSchema = createEmployeeSchema.extend({
  id: z.string().uuid("ID non valido"),
})

export const employeeFilterSchema = z.object({
  search: z.string().optional(),
  isActive: z.boolean().optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(50),
  sortBy: z.enum(["firstName", "lastName", "email", "createdAt"]).optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
})

export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>
export type EmployeeFilterInput = z.infer<typeof employeeFilterSchema>
```

### Server Action Pattern

```typescript
// src/app/(dashboard)/employees/actions/create-employee.ts
"use server"

import { createEmployeeSchema } from "@/lib/schemas/employee"
import { createEmployee } from "@/lib/services/employee-service"
import { getAuthSession } from "@/lib/auth/auth"
import { getTenantPrisma } from "@/lib/db/client"
import type { ActionResult } from "@/types/action-result"
import type { Employee } from "@/generated/prisma"

export async function createEmployeeAction(
  formData: FormData
): Promise<ActionResult<Employee>> {
  try {
    const session = await getAuthSession()
    if (!session) {
      return { success: false, error: "Non autenticato", code: "UNAUTHORIZED" }
    }

    // RBAC: FM o Admin
    const { role, tenantId } = session
    if (role !== "admin" && role !== "fleet_manager") {
      return { success: false, error: "Permessi insufficienti", code: "FORBIDDEN" }
    }

    const raw = Object.fromEntries(formData)
    const parsed = createEmployeeSchema.safeParse(raw)
    if (!parsed.success) {
      return { success: false, error: parsed.error.message, code: "VALIDATION" }
    }

    const prisma = await getTenantPrisma(tenantId)
    const employee = await createEmployee(prisma, parsed.data)

    return { success: true, data: employee }
  } catch (error) {
    logger.error({ error }, "Errore creazione dipendente")
    return { success: false, error: "Errore interno del server", code: "INTERNAL" }
  }
}
```

### Decisioni Architetturali Rilevanti

- **DA-1 Multi-Tenant:** tenantId su Employee, auto-filtrato dal Prisma client extension. Mai filtrare manualmente
- **DA-4 Validazione Zod:** Schema condiviso tra EmployeeForm (client) e Server Actions (server)
- **AC-1 Pattern API Ibrido:** Server Actions per CRUD, nessun Route Handler necessario per questa story
- **AC-2 Error Handling:** ActionResult<T> con ErrorCode enum su ogni action
- **FA-1 State Management:** RSC per read (lista, dettaglio), Server Actions per write (create, update, deactivate)
- **FA-3 Forms:** React Hook Form + Zod + shadcn/ui Form
- **FA-5 Tabelle:** TanStack Table + shadcn/ui DataTable per lista dipendenti
- **AS-2 RBAC:** FM vede solo proprio tenant, Admin vede tutti. Check in ogni Server Action
- **AS-5 Middleware:** Autenticazione verificata dal middleware, la Server Action verifica solo autorizzazione

### Convenzioni UI

- **DataTable:** sorting cliccando header colonna, filtri come chip sopra la tabella, search con debounce 300ms, paginazione in fondo (50 righe default)
- **Form:** grid 2 colonne desktop, label sopra input, validazione inline on-blur, button hierarchy (Primary + Secondary)
- **Feedback:** Toast auto-dismiss 5s per successo, toast persistente per errori, ConfirmDialog per azioni distruttive
- **Formattazione:** codice fiscale uppercase monospace, telefono formattato, EmptyState con azione suggerita "Aggiungi il primo dipendente"
- **StatusBadge:** "Attivo" (success/green), "Inattivo" (destructive/red)
- **Breadcrumb:** Dipendenti > [pagina corrente], sempre visibile

### Route Structure

```
src/app/(dashboard)/employees/
  ├── page.tsx              # Lista dipendenti (RSC)
  ├── loading.tsx           # Skeleton DataTable
  ├── error.tsx             # Error boundary
  ├── new/
  │   └── page.tsx          # Form creazione (RSC wraps EmployeeForm)
  ├── [id]/
  │   ├── page.tsx          # Dettaglio dipendente (RSC)
  │   ├── loading.tsx       # Skeleton dettaglio
  │   └── edit/
  │       └── page.tsx      # Form modifica (RSC wraps EmployeeForm)
  ├── actions/
  │   ├── create-employee.ts
  │   ├── update-employee.ts
  │   ├── deactivate-employee.ts
  │   └── reactivate-employee.ts
  └── components/
      ├── EmployeeTable.tsx
      └── EmployeeForm.tsx
```

### Dipendenze da Story Precedenti

- **Story 1.1:** Scaffold progetto, Prisma setup, Better Auth, shadcn/ui, struttura directory
- **Story 1.2:** Multi-tenant con Organization, Prisma client extension per tenantId auto-filter
- **Story 1.4:** RBAC con ruoli Admin/FM/Driver, middleware auth, permissions helpers

### Preparazione per Story Successive

- **Story 3.2 (Import CSV):** Il model Employee e pronto per import batch
- **Story 3.4 (Assegnazione Dipendenti):** La funzione `getActiveEmployees` fornisce la lista per i dropdown di assegnazione
- **Story 3.5 (Pool Pseudo-Driver):** Predisporre il model per un eventuale flag `isPool` o gestirlo come record speciale

### Anti-Pattern da Evitare

- NON passare tenantId come parametro URL o form — estrarlo sempre dalla sessione
- NON fare cancellazione fisica (DELETE) — solo soft delete con isActive = false
- NON validare solo client-side — validazione Zod obbligatoria anche nella Server Action
- NON mettere business logic nel componente o nella action — delegare al service
- NON usare `any` — tipi espliciti su tutto
- NON creare Server Actions dentro page.tsx — metterle in `actions/` directory
- NON fare query Prisma direttamente nei componenti — passare attraverso il service layer

### References

- [Source: epics.md#Story 3.1] — acceptance criteria BDD
- [Source: architecture.md#DA-1] — modello multi-tenant con tenantId
- [Source: architecture.md#Structure Patterns] — feature-based directory, actions/, components/
- [Source: architecture.md#Format Patterns] — ActionResult<T>, PaginatedResult<T>
- [Source: architecture.md#FA-3] — React Hook Form + Zod + shadcn/ui Form
- [Source: architecture.md#FA-5] — TanStack Table + shadcn/ui DataTable
- [Source: architecture.md#Enforcement Guidelines] — regole per agenti AI

## Dev Agent Record

### Agent Model Used



### Debug Log References

### Completion Notes List

### File List

