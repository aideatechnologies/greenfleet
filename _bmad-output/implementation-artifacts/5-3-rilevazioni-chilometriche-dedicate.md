# Story 5.3: Rilevazioni Chilometriche Dedicate

Status: done

## Story

As a **Fleet Manager/Driver**,
I want **inserire rilevazioni chilometriche in una sezione dedicata, indipendente dal rifornimento**,
So that **posso tracciare i km percorsi anche senza un rifornimento associato**.

## Acceptance Criteria

1. La rilevazione km viene salvata con veicolo, data, km attuali e il tenantId automatico (FR29)
2. Il Driver puo inserire rilevazioni solo per il proprio veicolo assegnato
3. Il sistema utilizza le rilevazioni km (sia da rifornimento che da sezione dedicata) per calcoli emissioni e report (FR30)
4. Il sistema valida che i km inseriti siano >= all'ultima rilevazione nota per quel veicolo (da KmReading e da FuelRecord)
5. Ogni modifica e tracciata con audit trail: chi, quando, valore precedente, valore nuovo (NFR10)
6. Il Fleet Manager puo inserire rilevazioni per qualsiasi veicolo del tenant

## Tasks / Subtasks

- [ ] Task 1: Schema Prisma — modello KmReading (AC: #1)
  - [ ] 1.1 Aggiungere il modello `KmReading` in `prisma/schema.prisma` con i seguenti campi:
    - `id` String @id @default(cuid())
    - `tenantId` String — FK al tenant (filtro automatico via Prisma extension)
    - `vehicleId` String — FK al veicolo operativo tenant (TenantVehicle)
    - `userId` String — FK all'utente che ha inserito la rilevazione
    - `date` DateTime — data della rilevazione
    - `odometerKm` Int — km rilevati (monotonicamente crescente per veicolo)
    - `notes` String? — note opzionali (es. "rilevazione mensile", "pre-consegna")
    - `source` String @default("MANUAL") — sorgente dato: "MANUAL" (espandibile in futuro)
    - `createdAt` DateTime @default(now())
    - `updatedAt` DateTime @updatedAt
    - relazione `vehicle TenantVehicle @relation(fields: [vehicleId], references: [id])`
  - [ ] 1.2 Aggiungere `@@map("KmReadings")` per nome tabella SQL Server
  - [ ] 1.3 Aggiungere indici: `@@index([tenantId])`, `@@index([vehicleId, date])`, `@@index([vehicleId, odometerKm])`
  - [ ] 1.4 Aggiungere la relazione inversa `kmReadings KmReading[]` nel modello TenantVehicle
- [ ] Task 2: Migrazione database (AC: #1)
  - [ ] 2.1 Eseguire `npx prisma migrate dev --name add-km-readings` per generare la migrazione
  - [ ] 2.2 Verificare che la migrazione SQL crei correttamente la tabella KmReadings con tutti i vincoli
  - [ ] 2.3 Verificare gli indici generati
- [ ] Task 3: Schema Zod per KmReading (AC: #1, #4)
  - [ ] 3.1 Creare `src/lib/schemas/km-reading.ts` con gli schema Zod:
    ```typescript
    import { z } from 'zod'

    export const createKmReadingSchema = z.object({
      vehicleId: z.string().min(1, "Veicolo obbligatorio"),
      date: z.coerce.date({ required_error: "Data obbligatoria" }),
      odometerKm: z.number()
        .int("I km devono essere un numero intero")
        .nonnegative("I km devono essere >= 0"),
      notes: z.string().max(500).nullable().optional(),
    })

    export const updateKmReadingSchema = createKmReadingSchema.partial().extend({
      id: z.string().min(1),
    })

    export type CreateKmReadingInput = z.infer<typeof createKmReadingSchema>
    export type UpdateKmReadingInput = z.infer<typeof updateKmReadingSchema>
    ```
- [ ] Task 4: Km Reading Service (AC: #1, #2, #3, #4, #5, #6)
  - [ ] 4.1 Creare `src/lib/services/km-reading-service.ts` con le seguenti funzioni:
    ```typescript
    import { prisma } from '@/lib/db/client'
    import { CreateKmReadingInput, UpdateKmReadingInput } from '@/lib/schemas/km-reading'

    /** Crea una nuova rilevazione km con validazione e audit trail */
    export async function createKmReading(
      input: CreateKmReadingInput,
      tenantId: string,
      userId: string
    ): Promise<KmReading>

    /** Aggiorna una rilevazione km esistente con audit trail */
    export async function updateKmReading(
      input: UpdateKmReadingInput,
      tenantId: string,
      userId: string
    ): Promise<KmReading>

    /** Elimina una rilevazione km con audit trail */
    export async function deleteKmReading(
      id: string,
      tenantId: string,
      userId: string
    ): Promise<void>

    /** Recupera rilevazioni km per veicolo, ordinate per data DESC */
    export async function getKmReadingsByVehicle(
      vehicleId: string,
      pagination?: PaginationParams
    ): Promise<PaginatedResult<KmReading>>

    /** Recupera tutte le rilevazioni del tenant con filtri, sorting e paginazione */
    export async function getKmReadings(
      filters?: KmReadingFilters,
      pagination?: PaginationParams
    ): Promise<PaginatedResult<KmReading>>

    /** Recupera l'ultimo km noto per un veicolo (da KmReading e FuelRecord) */
    export async function getLastKnownOdometer(
      vehicleId: string,
      beforeDate?: Date,
      excludeKmReadingId?: string,
      excludeFuelRecordId?: string
    ): Promise<{ km: number; date: Date; source: 'KmReading' | 'FuelRecord' } | null>

    /** Verifica che i km inseriti siano >= all'ultimo km noto */
    export async function validateOdometerKm(
      vehicleId: string,
      date: Date,
      odometerKm: number,
      excludeKmReadingId?: string
    ): Promise<{ valid: boolean; lastKm?: number; lastSource?: string; message?: string }>
    ```
  - [ ] 4.2 Implementare `getLastKnownOdometer`:
    - Query l'ultimo KmReading per il veicolo con `date <= beforeDate` (se specificata)
    - Query l'ultimo FuelRecord per il veicolo con `date <= beforeDate`
    - Ritornare il record con km piu alto tra i due
    - I parametri `excludeKmReadingId` e `excludeFuelRecordId` servono per escludere il record corrente durante gli update
  - [ ] 4.3 Implementare `validateOdometerKm`:
    - Chiamare `getLastKnownOdometer` per ottenere l'ultimo km noto
    - Se `odometerKm < lastKm`, ritornare `{ valid: false, lastKm, lastSource, message }`
    - Il messaggio include la sorgente: "I km devono essere >= all'ultima rilevazione di X km (da rifornimento del dd/mm/yyyy)" oppure "da rilevazione km del dd/mm/yyyy"
  - [ ] 4.4 Implementare `createKmReading`:
    - Chiamare `validateOdometerKm` — se non valido, lanciare errore di validazione
    - Creare il KmReading con Prisma
    - Chiamare `auditCreate` dal audit-service (Story 5.1) con action "km_reading.created"
    - Ritornare il record creato
  - [ ] 4.5 Implementare `updateKmReading`:
    - Recuperare il record esistente per calcolare il diff
    - Chiamare `validateOdometerKm` con `excludeKmReadingId` — se non valido, lanciare errore
    - Aggiornare il KmReading con Prisma
    - Chiamare `auditUpdate` con action "km_reading.updated"
    - Ritornare il record aggiornato
  - [ ] 4.6 Implementare `deleteKmReading`:
    - Recuperare il record esistente
    - Eliminare il record (hard delete)
    - Chiamare `auditCreate` con action "km_reading.deleted" per tracciare l'eliminazione
  - [ ] 4.7 Implementare `getKmReadingsByVehicle` e `getKmReadings` con filtri, sorting e paginazione standard
- [ ] Task 5: Aggiornare validateOdometer di fuel-record-service (AC: #3, #4)
  - [ ] 5.1 Aggiornare la funzione `validateOdometer` in `src/lib/services/fuel-record-service.ts` (creata nella Story 5.1):
    - Integrare la query a KmReading oltre a FuelRecord per determinare l'ultimo km noto
    - Riutilizzare `getLastKnownOdometer` dal km-reading-service per evitare duplicazione logica
  - [ ] 5.2 In alternativa, estrarre `getLastKnownOdometer` in un servizio condiviso (es. `src/lib/services/odometer-service.ts`) se la logica e usata da entrambi i servizi
- [ ] Task 6: Server Actions CRUD (AC: #1, #2, #5, #6)
  - [ ] 6.1 Creare `src/app/(dashboard)/km-readings/actions/create-km-reading.ts`:
    ```typescript
    'use server'

    import { ActionResult } from '@/types/action-result'
    import { createKmReadingSchema } from '@/lib/schemas/km-reading'
    import { createKmReading } from '@/lib/services/km-reading-service'
    import { auth } from '@/lib/auth/auth'

    export async function createKmReadingAction(
      formData: CreateKmReadingInput
    ): Promise<ActionResult<KmReading>>
    ```
  - [ ] 6.2 Implementare con: autenticazione, estrazione tenantId e userId dalla sessione, validazione Zod, controllo ruolo (Driver solo proprio veicolo), delega al service
  - [ ] 6.3 Creare `src/app/(dashboard)/km-readings/actions/update-km-reading.ts` con stessa struttura per update
  - [ ] 6.4 Creare `src/app/(dashboard)/km-readings/actions/delete-km-reading.ts` con audit trail
  - [ ] 6.5 Implementare il controllo permessi Driver (stesso pattern della Story 5.1):
    - Recuperare l'assegnazione veicolo-dipendente corrente dell'utente Driver
    - Se il `vehicleId` nel form non corrisponde al veicolo assegnato, ritornare `ActionResult` con `code: FORBIDDEN`
    - FM e Admin: nessuna restrizione veicolo
- [ ] Task 7: Form Inserimento Rilevazione Km (AC: #1, #4)
  - [ ] 7.1 Creare `src/app/(dashboard)/km-readings/components/KmReadingForm.tsx`:
    - React Hook Form + Zod (`createKmReadingSchema`) + shadcn/ui Form
    - Campi: select veicolo (con search), datepicker, input km, textarea note
    - Layout a 2 colonne su desktop, label sopra input
    - Validazione inline on-blur per ogni campo
    - Il campo veicolo per il Driver e preselezionato e non modificabile
    - Il campo veicolo per il FM e un combobox con ricerca tra i veicoli del tenant
  - [ ] 7.2 Mostrare l'ultimo km noto per il veicolo selezionato come hint sotto il campo km:
    - Quando l'utente seleziona un veicolo, fare una richiesta per ottenere l'ultimo km noto
    - Mostrare: "Ultimo km registrato: 125.430 km (rifornimento del 15 gen 2026)" o "(rilevazione del ...)"
    - Formattazione numeri in locale IT
  - [ ] 7.3 Implementare feedback post-submit:
    - Successo: toast "Rilevazione km inserita" + redirect a lista
    - Errore validazione: inline sotto i campi (incluso errore km < precedente)
    - Errore server: toast persistente
  - [ ] 7.4 Implementare pending state con `useActionState`
- [ ] Task 8: Pagina Nuova Rilevazione Km (AC: #1)
  - [ ] 8.1 Creare `src/app/(dashboard)/km-readings/new/page.tsx`:
    - Server Component che recupera la lista veicoli del tenant
    - Per il Driver: recupera solo il proprio veicolo assegnato
    - Renderizza KmReadingForm
    - Breadcrumb: Dashboard > Rilevazioni Km > Nuova
  - [ ] 8.2 Creare `src/app/(dashboard)/km-readings/new/loading.tsx` con skeleton
- [ ] Task 9: Pagina Lista Rilevazioni Km (AC: #1)
  - [ ] 9.1 Creare `src/app/(dashboard)/km-readings/page.tsx`:
    - Server Component che recupera le rilevazioni del tenant (paginate)
    - Lista con KmReadingTable (DataTable semplice con colonne: veicolo/targa, data, km, note, sorgente)
    - Pulsante "Nuova Rilevazione" (Primary button)
    - Per il Driver: mostra solo le proprie rilevazioni
    - Breadcrumb: Dashboard > Rilevazioni Km
  - [ ] 9.2 Creare `src/app/(dashboard)/km-readings/components/KmReadingTable.tsx`:
    - TanStack Table + shadcn/ui DataTable
    - Colonne: Veicolo (targa), Data (formato dd MMM yyyy), Km (formato locale IT con separatore migliaia), Note, Sorgente
    - Sorting su tutte le colonne, filtro per veicolo, paginazione 50 righe default
    - Azioni riga: Modifica, Elimina (solo per FM/Admin)
  - [ ] 9.3 Creare `src/app/(dashboard)/km-readings/loading.tsx` con skeleton DataTable
  - [ ] 9.4 Creare `src/app/(dashboard)/km-readings/error.tsx` con error boundary
- [ ] Task 10: Pagina Modifica Rilevazione Km (AC: #5)
  - [ ] 10.1 Creare `src/app/(dashboard)/km-readings/[id]/edit/page.tsx`:
    - Server Component che recupera la rilevazione per ID
    - Verifica permessi: solo FM/Admin possono modificare
    - Renderizza KmReadingForm in modalita edit con dati precompilati
    - Breadcrumb: Dashboard > Rilevazioni Km > Modifica
  - [ ] 10.2 Il form in modalita edit riutilizza lo stesso componente KmReadingForm con prop `defaultValues` e `mode: 'edit'`

## Dev Notes

### Integrazione con FuelRecord per Calcolo Km (FR30)

Le rilevazioni km dalla sezione dedicata (KmReading) e quelle dai rifornimenti (FuelRecord.odometerKm) sono entrambe utilizzate per:

1. **Calcolo km percorsi:** `km_fine - km_inizio` dove km_inizio e km_fine provengono da qualsiasi fonte (KmReading o FuelRecord)
2. **Calcolo emissioni teoriche:** `gCO2e/km x km_percorsi` (Story 6.2)
3. **Report emissioni per periodo:** aggregazione km per veicolo/carlist/periodo

La funzione `getLastKnownOdometer` e il punto centrale che unifica entrambe le fonti. Deve essere usata sia dal km-reading-service che dal fuel-record-service per la validazione e dai servizi di calcolo emissioni per determinare i km percorsi.

### Validazione Km — Monotonicamente Crescente

La regola base e: i km devono essere monotonicamente crescenti per ogni veicolo, considerando la data. Questo significa:

1. Per una nuova rilevazione con data D e km K, cercare l'ultimo record (KmReading o FuelRecord) con data <= D
2. Se esiste e ha km > K, la rilevazione non e valida
3. Attenzione: e possibile inserire rilevazioni con date passate (es. rifornimento di ieri). In quel caso, verificare anche che non esistano record con data > D ma km < K (consistenza bidirezionale)

**Semplificazione per MVP:** Verificare solo che `nuovoKm >= ultimoKm` rispetto alla data. La verifica bidirezionale completa puo essere aggiunta in una story successiva.

### Sezione Dedicata vs Tab Veicolo

Le rilevazioni km hanno una sezione dedicata (`/km-readings/`) accessibile dalla sidebar. Questo permette al Driver di inserire rapidamente una rilevazione senza navigare al dettaglio del veicolo.

Nella Story 5.4, le rilevazioni km saranno anche visibili nel dettaglio veicolo (tab o sezione) insieme ai rifornimenti, per una vista consolidata per veicolo.

### Permessi Driver vs Fleet Manager

| Operazione | Driver | Fleet Manager |
|---|---|---|
| Inserire rilevazione km | Solo proprio veicolo | Qualsiasi veicolo tenant |
| Modificare rilevazione km | NO | SI |
| Eliminare rilevazione km | NO | SI |
| Visualizzare rilevazioni | Solo proprie | Tutte del tenant |

Stesso pattern della Story 5.1 (rifornimenti).

### Decisioni Architetturali Rilevanti

- **DA-1 Multi-Tenant:** `tenantId` su KmReading, filtro automatico via Prisma extension
- **DA-4 Validazione Zod:** Schema Zod condiviso tra form e Server Action
- **AC-1 Pattern API Ibrido:** Server Actions per CRUD rilevazioni km
- **AC-2 Error Handling:** ActionResult<T> per ogni Server Action
- **FA-1 State Management:** RSC per read, Server Actions per write
- **FA-3 Forms:** React Hook Form + Zod + shadcn/ui Form
- **FA-5 Tabelle Dati:** TanStack Table + shadcn/ui DataTable per lista rilevazioni
- **ID-4 Logging:** Pino per logging operazioni km

### Naming Conventions (da architecture.md)

- Modello Prisma: `KmReading`
- Campi: `tenantId`, `vehicleId`, `odometerKm`
- Tabella SQL: `@@map("KmReadings")`
- Route: `src/app/(dashboard)/km-readings/`
- Server Actions: `create-km-reading.ts`, `update-km-reading.ts`, `delete-km-reading.ts`
- Service: `km-reading-service.ts`
- Schema Zod: `src/lib/schemas/km-reading.ts`
- Componenti: `KmReadingForm.tsx`, `KmReadingTable.tsx`

### File da Creare/Modificare

| File | Azione | Descrizione |
|---|---|---|
| `prisma/schema.prisma` | Modifica | Aggiungere modello KmReading |
| `src/lib/schemas/km-reading.ts` | Crea | Schema Zod per KmReading |
| `src/lib/services/km-reading-service.ts` | Crea | Business logic CRUD rilevazioni km |
| `src/lib/services/fuel-record-service.ts` | Modifica | Aggiornare validateOdometer per integrare KmReading |
| `src/app/(dashboard)/km-readings/page.tsx` | Crea | Lista rilevazioni km |
| `src/app/(dashboard)/km-readings/loading.tsx` | Crea | Skeleton loading |
| `src/app/(dashboard)/km-readings/error.tsx` | Crea | Error boundary |
| `src/app/(dashboard)/km-readings/new/page.tsx` | Crea | Pagina nuova rilevazione |
| `src/app/(dashboard)/km-readings/new/loading.tsx` | Crea | Skeleton loading form |
| `src/app/(dashboard)/km-readings/[id]/edit/page.tsx` | Crea | Pagina modifica rilevazione |
| `src/app/(dashboard)/km-readings/components/KmReadingForm.tsx` | Crea | Form inserimento/modifica |
| `src/app/(dashboard)/km-readings/components/KmReadingTable.tsx` | Crea | DataTable rilevazioni |
| `src/app/(dashboard)/km-readings/actions/create-km-reading.ts` | Crea | Server Action creazione |
| `src/app/(dashboard)/km-readings/actions/update-km-reading.ts` | Crea | Server Action modifica |
| `src/app/(dashboard)/km-readings/actions/delete-km-reading.ts` | Crea | Server Action eliminazione |
| `prisma/migrations/` | Genera | Migrazione add-km-readings |

### Anti-Pattern da Evitare

- NON duplicare la logica di validazione km — usare `getLastKnownOdometer` come singola fonte di verita per l'ultimo km noto
- NON permettere al Driver di modificare o eliminare rilevazioni — solo FM/Admin
- NON ignorare i FuelRecord nella validazione km — l'ultimo km noto puo provenire da un rifornimento
- NON creare una sezione km solo come sotto-route di vehicles — deve essere una route dedicata `/km-readings/` accessibile dalla sidebar
- NON saltare l'audit trail per le eliminazioni — tracciare anche i delete
- NON usare `any` per i filtri — tipizzare `KmReadingFilters` esplicitamente

### References

- [Source: architecture.md#DA-1] — Modello multi-tenant con tenantId pervasivo
- [Source: architecture.md#Structure Patterns] — Directory structure km-readings/
- [Source: architecture.md#Communication Patterns] — AuditAction types per km_reading
- [Source: architecture.md#Requirements to Structure Mapping] — km-readings/ → km-reading-service.ts
- [Source: epics.md#Story 5.3] — Acceptance criteria BDD
- [Source: epics.md#Story 5.1] — Dipendenza: audit-service.ts, pattern validazione km
- [Source: prd.md#FR29] — Rilevazione chilometrica dedicata
- [Source: prd.md#FR30] — Utilizzo rilevazioni km per calcoli e report
- [Source: prd.md#NFR10] — Audit trail per dati emission-impacting

## Dev Agent Record

### Agent Model Used



### Debug Log References

### Completion Notes List

### File List

