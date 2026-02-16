# Story 5.1: Inserimento Manuale Rifornimento

Status: done

## Story

As a **Fleet Manager/Driver**,
I want **inserire manualmente un rifornimento per un veicolo**,
So that **posso tracciare i consumi di carburante per il calcolo delle emissioni**.

## Acceptance Criteria

1. Il rifornimento viene salvato con veicolo, data, tipo carburante, quantita litri, importo euro, km e il tenantId automatico (FR27)
2. Il Driver puo inserire rifornimenti solo per il proprio veicolo assegnato
3. Il Fleet Manager puo inserire rifornimenti per qualsiasi veicolo del tenant
4. Ogni modifica e tracciata con audit trail: chi, quando, valore precedente, valore nuovo (NFR10)
5. Il form ha validazione: quantita > 0, importo > 0, km >= km precedente per quel veicolo
6. Il rifornimento appare nel FuelFeed cronologico del veicolo
7. I numeri sono formattati in locale IT (1.234,56)

## Tasks / Subtasks

- [ ] Task 1: Schema Prisma — modello FuelRecord (AC: #1)
  - [ ] 1.1 Aggiungere il modello `FuelRecord` in `prisma/schema.prisma` con i seguenti campi:
    - `id` String @id @default(cuid())
    - `tenantId` String — FK al tenant (filtro automatico via Prisma extension)
    - `vehicleId` String — FK al veicolo operativo tenant (TenantVehicle)
    - `userId` String — FK all'utente che ha inserito il rifornimento
    - `date` DateTime — data del rifornimento
    - `fuelType` FuelType — tipo carburante (riusa enum da Story 2.1)
    - `quantityLiters` Float — quantita in litri (> 0)
    - `amountEur` Float — importo in euro (> 0)
    - `odometerKm` Int — km al momento del rifornimento (>= km precedente)
    - `notes` String? — note opzionali
    - `source` String @default("MANUAL") — sorgente dato: "MANUAL" | "IMPORT_CSV"
    - `createdAt` DateTime @default(now())
    - `updatedAt` DateTime @updatedAt
    - relazione `vehicle TenantVehicle @relation(fields: [vehicleId], references: [id])`
  - [ ] 1.2 Aggiungere `@@map("FuelRecords")` per nome tabella SQL Server
  - [ ] 1.3 Aggiungere indici: `@@index([tenantId])`, `@@index([vehicleId, date])`, `@@index([vehicleId, odometerKm])`
  - [ ] 1.4 Aggiungere la relazione inversa `fuelRecords FuelRecord[]` nel modello TenantVehicle
- [ ] Task 2: Schema Prisma — modello AuditEntry (AC: #4)
  - [ ] 2.1 Aggiungere il modello `AuditEntry` in `prisma/schema.prisma` con i seguenti campi:
    - `id` String @id @default(cuid())
    - `tenantId` String — FK al tenant
    - `userId` String — chi ha effettuato la modifica
    - `action` String — tipo azione (es. "fuel_record.created", "fuel_record.updated")
    - `entityType` String — tipo entita modificata (es. "FuelRecord")
    - `entityId` String — ID dell'entita modificata
    - `changes` String — JSON stringificato con array di `{ field, old, new }` (tipo `Json` se supportato, altrimenti String)
    - `source` String? — sorgente della modifica (es. "MANUAL", "IMPORT_CSV")
    - `timestamp` DateTime @default(now())
  - [ ] 2.2 Aggiungere `@@map("AuditEntries")` per nome tabella SQL Server
  - [ ] 2.3 Aggiungere indici: `@@index([tenantId])`, `@@index([entityType, entityId])`, `@@index([timestamp])`
  - [ ] 2.4 **IMPORTANTE:** AuditEntry non ha `updatedAt` — i record audit sono immutabili
- [ ] Task 3: Migrazione database (AC: #1, #4)
  - [ ] 3.1 Eseguire `npx prisma migrate dev --name add-fuel-records-audit-entries` per generare la migrazione
  - [ ] 3.2 Verificare che la migrazione SQL crei correttamente le tabelle FuelRecords e AuditEntries con tutti i vincoli
  - [ ] 3.3 Verificare gli indici generati
- [ ] Task 4: Schema Zod per FuelRecord (AC: #1, #5)
  - [ ] 4.1 Creare `src/lib/schemas/fuel-record.ts` con gli schema Zod:
    ```typescript
    import { z } from 'zod'

    export const createFuelRecordSchema = z.object({
      vehicleId: z.string().min(1, "Veicolo obbligatorio"),
      date: z.coerce.date({ required_error: "Data obbligatoria" }),
      fuelType: z.enum([
        "BENZINA", "DIESEL", "GPL", "METANO", "ELETTRICO",
        "IBRIDO_BENZINA", "IBRIDO_DIESEL", "IDROGENO",
        "BIFUEL_BENZINA_GPL", "BIFUEL_BENZINA_METANO"
      ], { required_error: "Tipo carburante obbligatorio" }),
      quantityLiters: z.number()
        .positive("La quantita deve essere maggiore di 0"),
      amountEur: z.number()
        .positive("L'importo deve essere maggiore di 0"),
      odometerKm: z.number()
        .int("I km devono essere un numero intero")
        .nonnegative("I km devono essere >= 0"),
      notes: z.string().max(500).nullable().optional(),
    })

    export const updateFuelRecordSchema = createFuelRecordSchema.partial().extend({
      id: z.string().min(1),
    })

    export type CreateFuelRecordInput = z.infer<typeof createFuelRecordSchema>
    export type UpdateFuelRecordInput = z.infer<typeof updateFuelRecordSchema>
    ```
  - [ ] 4.2 La validazione `km >= km precedente` e implementata server-side nel service (non nello schema Zod, perche richiede query al DB)
- [ ] Task 5: Audit Service (AC: #4)
  - [ ] 5.1 Creare `src/lib/services/audit-service.ts` con le seguenti funzioni:
    ```typescript
    import { prisma } from '@/lib/db/client'
    import { AuditAction } from '@/types/audit'

    /** Registra un evento di creazione */
    export async function auditCreate(params: {
      tenantId: string
      userId: string
      action: AuditAction
      entityType: string
      entityId: string
      newValues: Record<string, unknown>
      source?: string
    }): Promise<void>

    /** Registra un evento di modifica con diff automatico */
    export async function auditUpdate(params: {
      tenantId: string
      userId: string
      action: AuditAction
      entityType: string
      entityId: string
      oldValues: Record<string, unknown>
      newValues: Record<string, unknown>
      source?: string
    }): Promise<void>

    /** Calcola il diff tra due oggetti, ritornando solo i campi cambiati */
    export function calculateChanges(
      oldValues: Record<string, unknown>,
      newValues: Record<string, unknown>
    ): Array<{ field: string; old: unknown; new: unknown }>
    ```
  - [ ] 5.2 Implementare `calculateChanges` che confronta i campi e ritorna solo quelli con valori diversi
  - [ ] 5.3 Implementare `auditCreate` che crea un AuditEntry con action "*.created" e changes contenenti tutti i nuovi valori
  - [ ] 5.4 Implementare `auditUpdate` che crea un AuditEntry con action "*.updated" e changes contenenti solo i campi modificati (usando `calculateChanges`)
  - [ ] 5.5 I record AuditEntry sono immutabili — nessuna funzione di update o delete
- [ ] Task 6: Fuel Record Service (AC: #1, #2, #3, #4, #5)
  - [ ] 6.1 Creare `src/lib/services/fuel-record-service.ts` con le seguenti funzioni:
    ```typescript
    import { prisma } from '@/lib/db/client'
    import { CreateFuelRecordInput, UpdateFuelRecordInput } from '@/lib/schemas/fuel-record'

    /** Crea un nuovo rifornimento con validazione km e audit trail */
    export async function createFuelRecord(
      input: CreateFuelRecordInput,
      tenantId: string,
      userId: string
    ): Promise<FuelRecord>

    /** Aggiorna un rifornimento esistente con audit trail */
    export async function updateFuelRecord(
      input: UpdateFuelRecordInput,
      tenantId: string,
      userId: string
    ): Promise<FuelRecord>

    /** Recupera rifornimenti per veicolo, ordinati per data DESC (per FuelFeed) */
    export async function getFuelRecordsByVehicle(
      vehicleId: string,
      pagination?: PaginationParams
    ): Promise<PaginatedResult<FuelRecord>>

    /** Recupera tutti i rifornimenti del tenant con filtri, sorting e paginazione */
    export async function getFuelRecords(
      filters?: FuelRecordFilters,
      pagination?: PaginationParams
    ): Promise<PaginatedResult<FuelRecord>>

    /** Verifica che i km inseriti siano >= all'ultima rilevazione nota per il veicolo */
    export async function validateOdometer(
      vehicleId: string,
      date: Date,
      odometerKm: number,
      excludeRecordId?: string
    ): Promise<{ valid: boolean; lastKm?: number; message?: string }>
    ```
  - [ ] 6.2 Implementare `validateOdometer`:
    - Query per l'ultimo FuelRecord o KmReading (se esiste, dalla Story 5.3) per il veicolo con data <= data inserita
    - Se `odometerKm < lastKm`, ritornare `{ valid: false, lastKm, message: "I km devono essere >= all'ultima rilevazione di X km" }`
    - Se nessun record precedente, qualsiasi valore e valido
    - Il parametro `excludeRecordId` serve per escludere il record corrente durante l'update
  - [ ] 6.3 Implementare `createFuelRecord`:
    - Chiamare `validateOdometer` — se non valido, lanciare errore di validazione
    - Creare il FuelRecord con Prisma (tenantId automatico da Prisma extension)
    - Chiamare `auditCreate` con action "fuel_record.created"
    - Ritornare il record creato
  - [ ] 6.4 Implementare `updateFuelRecord`:
    - Recuperare il record esistente per calcolare il diff
    - Chiamare `validateOdometer` con `excludeRecordId` — se non valido, lanciare errore
    - Aggiornare il FuelRecord con Prisma
    - Chiamare `auditUpdate` con action "fuel_record.updated", passando old e new values
    - Ritornare il record aggiornato
  - [ ] 6.5 Implementare `getFuelRecordsByVehicle` con ordinamento per data DESC e paginazione
  - [ ] 6.6 Implementare `getFuelRecords` con supporto filtri (vehicleId, dateFrom, dateTo, fuelType), sorting e paginazione
- [ ] Task 7: Server Actions CRUD (AC: #1, #2, #3, #4, #5)
  - [ ] 7.1 Creare `src/app/(dashboard)/fuel-records/actions/create-fuel-record.ts`:
    ```typescript
    'use server'

    import { ActionResult } from '@/types/action-result'
    import { createFuelRecordSchema } from '@/lib/schemas/fuel-record'
    import { createFuelRecord } from '@/lib/services/fuel-record-service'
    import { auth } from '@/lib/auth/auth'

    export async function createFuelRecordAction(
      formData: CreateFuelRecordInput
    ): Promise<ActionResult<FuelRecord>>
    ```
  - [ ] 7.2 Implementare con: autenticazione, estrazione tenantId e userId dalla sessione, validazione Zod, controllo ruolo (Driver solo proprio veicolo), delega al service
  - [ ] 7.3 Creare `src/app/(dashboard)/fuel-records/actions/update-fuel-record.ts` con stessa struttura per update
  - [ ] 7.4 Creare `src/app/(dashboard)/fuel-records/actions/delete-fuel-record.ts` — soft delete o hard delete con audit trail
  - [ ] 7.5 Implementare il controllo permessi Driver:
    - Recuperare l'assegnazione veicolo-dipendente corrente dell'utente Driver
    - Se il `vehicleId` nel form non corrisponde al veicolo assegnato, ritornare `ActionResult` con `code: FORBIDDEN`
    - Il Fleet Manager non ha questa restrizione (opera su tutto il tenant)
- [ ] Task 8: FuelFeed Component (AC: #6, #7)
  - [ ] 8.1 Creare `src/components/data-display/FuelFeed.tsx` come componente custom:
    ```typescript
    interface FuelFeedProps {
      records: FuelFeedItem[]
      variant: 'full' | 'compact' | 'validation'
      onEdit?: (id: string) => void
      locale?: string // default "it-IT"
    }

    interface FuelFeedItem {
      id: string
      date: Date
      fuelType: string
      quantityLiters: number
      amountEur: number
      odometerKm: number
      vehiclePlate?: string // per vista multi-veicolo
      source: string
      hasAnomaly?: boolean  // per variante validation
      anomalyMessage?: string
    }
    ```
  - [ ] 8.2 Implementare la variante `full` — stile feed cronologico tipo Revolut:
    - Ogni entry con icona tipo carburante, data, quantita, importo, km
    - Raggruppamento per data (oggi, ieri, questa settimana, mese)
    - Numeri formattati in locale IT con `Intl.NumberFormat('it-IT', ...)`
    - Importo con simbolo euro, quantita con unita "L", km con separatore migliaia
  - [ ] 8.3 Implementare la variante `compact` — versione ridotta per sidebar/widget:
    - Solo data, quantita, importo per riga
    - Massimo N elementi visibili con "Mostra tutto" link
  - [ ] 8.4 Implementare la variante `validation` — evidenziazione anomalie:
    - Record con anomalia evidenziati con bordo warning/destructive
    - Tooltip o badge con messaggio anomalia
    - Icona di attenzione per record con `hasAnomaly: true`
  - [ ] 8.5 Applicare stile Greenfleet: palette teal 600, tipografia Inter, spacing base 4px, supporto dark mode
- [ ] Task 9: Form Inserimento Rifornimento (AC: #1, #5, #7)
  - [ ] 9.1 Creare `src/app/(dashboard)/fuel-records/components/FuelRecordForm.tsx`:
    - React Hook Form + Zod (`createFuelRecordSchema`) + shadcn/ui Form
    - Campi: select veicolo (con search), datepicker, select tipo carburante, input quantita, input importo, input km, textarea note
    - Layout a 2 colonne su desktop, label sopra input
    - Validazione inline on-blur per ogni campo
    - Il campo veicolo per il Driver e preselezionato e non modificabile (il proprio veicolo)
    - Il campo veicolo per il FM e un combobox con ricerca tra i veicoli del tenant
  - [ ] 9.2 Implementare formattazione numeri locale IT:
    - Input quantita e importo con separatore decimale virgola
    - Input km con separatore migliaia punto
    - Usare `Intl.NumberFormat('it-IT')` per display e parsing custom per input
  - [ ] 9.3 Implementare feedback post-submit:
    - Successo: toast con messaggio "Rifornimento inserito" + redirect a lista o FuelFeed
    - Errore validazione: inline sotto i campi
    - Errore server: toast persistente con messaggio errore
  - [ ] 9.4 Implementare il pending state con `useActionState` — spinner inline su button durante il submit
- [ ] Task 10: Pagina Nuovo Rifornimento (AC: #1, #6)
  - [ ] 10.1 Creare `src/app/(dashboard)/fuel-records/new/page.tsx`:
    - Server Component che recupera la lista veicoli del tenant (per il select)
    - Per il Driver: recupera solo il proprio veicolo assegnato
    - Renderizza FuelRecordForm con i dati pre-caricati
    - Breadcrumb: Dashboard > Rifornimenti > Nuovo
  - [ ] 10.2 Creare `src/app/(dashboard)/fuel-records/new/loading.tsx` con skeleton matching della struttura form
- [ ] Task 11: Pagina Lista Rifornimenti con FuelFeed (AC: #6)
  - [ ] 11.1 Creare `src/app/(dashboard)/fuel-records/page.tsx`:
    - Server Component che recupera i rifornimenti del tenant (paginati)
    - Mostra FuelFeed in variante `full` come vista primaria
    - Toggle per passare a vista DataTable (implementata in Story 5.4)
    - Pulsante "Nuovo Rifornimento" (Primary button, una per vista)
    - Breadcrumb: Dashboard > Rifornimenti
  - [ ] 11.2 Creare `src/app/(dashboard)/fuel-records/loading.tsx` con skeleton
  - [ ] 11.3 Creare `src/app/(dashboard)/fuel-records/error.tsx` con error boundary
- [ ] Task 12: Tipi Audit (AC: #4)
  - [ ] 12.1 Aggiornare `src/types/audit.ts` con i tipi per le azioni audit relative a fuel records:
    ```typescript
    export type AuditAction =
      | "fuel_record.created"
      | "fuel_record.updated"
      | "fuel_record.deleted"
      | "km_reading.created"
      | "km_reading.updated"
      | "km_reading.deleted"
      | "emission_factor.updated"
      // ... altri tipi aggiunti progressivamente

    export interface AuditChange {
      field: string
      old: unknown
      new: unknown
    }
    ```
  - [ ] 12.2 Esportare i tipi per uso nei services e nelle pagine audit

## Dev Notes

### FuelFeed Component — Design Reference

Il FuelFeed e uno dei 7 componenti custom definiti nel UX Design Specification. Lo stile si ispira a Revolut — un feed cronologico verticale dove ogni entry mostra:

- **Icona** a sinistra (basata su fuelType: pompa benzina, fulmine per elettrico, etc.)
- **Corpo** centrale: tipo carburante + targa veicolo (se multi-veicolo), data formattata
- **Valori** a destra: quantita litri, importo euro, km

Le tre varianti servono a contesti diversi:
- `full`: pagina dedicata rifornimenti, dettaglio completo
- `compact`: widget nella dashboard o nella pagina dettaglio veicolo
- `validation`: usata dal FM nella Story 5.4 per evidenziare anomalie (consumo fuori range)

### Validazione Km — Logica di Consistenza

La validazione `odometerKm >= ultimo km noto` e fondamentale per l'integrita dei dati emissioni. La logica deve:

1. Cercare l'ultimo FuelRecord per il veicolo con `date <= data inserita`
2. Cercare anche l'ultimo KmReading (Story 5.3) per il veicolo con `date <= data inserita`
3. Prendere il MAX dei due come riferimento
4. Se `odometerKm` inserito < MAX, rifiutare con messaggio informativo
5. Durante l'update, escludere il record corrente dalla ricerca (per non confrontare con se stesso)

**Nota:** La Story 5.3 (KmReading) potrebbe non essere ancora implementata quando si sviluppa questa story. In quel caso, la validazione controlla solo i FuelRecord. Quando KmReading sara disponibile, la funzione `validateOdometer` va estesa per controllare entrambe le tabelle.

### Audit Trail — Dati Emission-Impacting (NFR10)

L'audit trail e obbligatorio per ogni modifica a dati che impattano le emissioni:
- Rifornimenti (quantita, tipo carburante, km) — questa story
- Rilevazioni km — Story 5.3
- Fattori emissione — Story 6.1
- Dati tecnici veicoli — Story 2.x

Il modello AuditEntry creato in questa story e condiviso da tutte le story che richiedono audit. Il campo `changes` contiene un array JSON di `{ field, old, new }` per tracciare esattamente cosa e cambiato.

### Permessi Driver vs Fleet Manager

| Operazione | Driver | Fleet Manager |
|---|---|---|
| Inserire rifornimento | Solo proprio veicolo | Qualsiasi veicolo tenant |
| Modificare rifornimento | NO | SI |
| Eliminare rifornimento | NO | SI |
| Visualizzare rifornimenti | Solo propri | Tutti del tenant |

Il controllo permessi avviene nella Server Action:
1. Estrarre ruolo dalla sessione Better Auth
2. Se Driver: verificare che il `vehicleId` corrisponda al veicolo assegnato al dipendente collegato all'utente
3. Se FM/Admin: nessuna restrizione veicolo (filtro automatico per tenant)

### Formattazione Numeri Locale IT

Usare `Intl.NumberFormat` per la formattazione display:
```typescript
// Quantita litri: 45,50 L
new Intl.NumberFormat('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(45.5)

// Importo euro: 78,30 EUR
new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(78.3)

// Km: 125.430 km
new Intl.NumberFormat('it-IT').format(125430)
```

Per i campi input, il parsing da formato IT a numero e piu complesso — valutare l'uso di una libreria o di un input numerico con formattazione custom.

### Decisioni Architetturali Rilevanti

- **DA-1 Multi-Tenant:** `tenantId` su FuelRecord, filtro automatico via Prisma extension
- **DA-4 Validazione Zod:** Schema Zod condiviso tra form (React Hook Form) e Server Action
- **AC-1 Pattern API Ibrido:** Server Actions per CRUD rifornimenti
- **AC-2 Error Handling:** ActionResult<T> per ogni Server Action
- **FA-1 State Management:** RSC per read, Server Actions per write
- **FA-3 Forms:** React Hook Form + Zod + shadcn/ui Form
- **ID-4 Logging:** Pino per logging operazioni rifornimento

### Naming Conventions (da architecture.md)

- Modello Prisma: `FuelRecord`, `AuditEntry`
- Campi: `tenantId`, `vehicleId`, `quantityLiters`, `amountEur`, `odometerKm`
- Tabelle SQL: `@@map("FuelRecords")`, `@@map("AuditEntries")`
- Route: `src/app/(dashboard)/fuel-records/`
- Server Actions: `create-fuel-record.ts`, `update-fuel-record.ts`
- Service: `fuel-record-service.ts`, `audit-service.ts`
- Schema Zod: `src/lib/schemas/fuel-record.ts`
- Componente: `FuelFeed.tsx`, `FuelRecordForm.tsx`

### File da Creare/Modificare

| File | Azione | Descrizione |
|---|---|---|
| `prisma/schema.prisma` | Modifica | Aggiungere modelli FuelRecord e AuditEntry |
| `src/lib/schemas/fuel-record.ts` | Crea | Schema Zod per FuelRecord |
| `src/lib/services/fuel-record-service.ts` | Crea | Business logic CRUD rifornimenti |
| `src/lib/services/audit-service.ts` | Crea | Servizio audit trail generico |
| `src/types/audit.ts` | Crea/Modifica | Tipi AuditAction, AuditChange |
| `src/components/data-display/FuelFeed.tsx` | Crea | Componente FuelFeed (full/compact/validation) |
| `src/app/(dashboard)/fuel-records/page.tsx` | Crea | Lista rifornimenti con FuelFeed |
| `src/app/(dashboard)/fuel-records/loading.tsx` | Crea | Skeleton loading |
| `src/app/(dashboard)/fuel-records/error.tsx` | Crea | Error boundary |
| `src/app/(dashboard)/fuel-records/new/page.tsx` | Crea | Pagina nuovo rifornimento |
| `src/app/(dashboard)/fuel-records/new/loading.tsx` | Crea | Skeleton loading form |
| `src/app/(dashboard)/fuel-records/components/FuelRecordForm.tsx` | Crea | Form inserimento/modifica |
| `src/app/(dashboard)/fuel-records/actions/create-fuel-record.ts` | Crea | Server Action creazione |
| `src/app/(dashboard)/fuel-records/actions/update-fuel-record.ts` | Crea | Server Action modifica |
| `src/app/(dashboard)/fuel-records/actions/delete-fuel-record.ts` | Crea | Server Action eliminazione |
| `prisma/migrations/` | Genera | Migrazione add-fuel-records-audit-entries |

### Anti-Pattern da Evitare

- NON mettere la logica di validazione km nel componente — deve essere nel service (server-side)
- NON permettere al Driver di specificare un veicolo diverso dal proprio — controllo nella Server Action
- NON saltare l'audit trail per le creazioni — tracciare anche le create, non solo gli update
- NON usare `any` per i changes dell'audit — tipizzare con `AuditChange[]`
- NON formattare i numeri solo lato client — i dati nel DB sono sempre in formato numerico standard (punto come decimale)
- NON creare Server Actions dentro page.tsx — metterle in `actions/` directory

### References

- [Source: architecture.md#DA-1] — Modello multi-tenant con tenantId pervasivo
- [Source: architecture.md#Structure Patterns] — Directory structure fuel-records/
- [Source: architecture.md#Communication Patterns] — AuditAction, AuditEntry types
- [Source: architecture.md#Format Patterns] — ActionResult<T>, PaginatedResult<T>
- [Source: epics.md#Story 5.1] — Acceptance criteria BDD
- [Source: prd.md#FR27] — Inserimento manuale rifornimento
- [Source: prd.md#NFR10] — Audit trail per dati emission-impacting
- [Source: ux-design-specification.md] — FuelFeed component (varianti: full, compact, validation)

## Dev Agent Record

### Agent Model Used



### Debug Log References

### Completion Notes List

### File List

