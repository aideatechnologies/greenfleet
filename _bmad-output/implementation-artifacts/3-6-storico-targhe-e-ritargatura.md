# Story 3.6: Storico Targhe e Ritargatura

Status: done

## Story

As a **Fleet Manager**,
I want **gestire lo storico targhe di un veicolo in caso di ritargatura**,
So that **posso mantenere la tracciabilita del veicolo anche dopo un cambio targa**.

## Acceptance Criteria

1. La targa precedente viene archiviata nello storico con data inizio e data fine (FR19)
2. La targa corrente e sempre quella piu recente nello storico
3. Lo storico targhe e visibile nella vista dettaglio del veicolo
4. La ricerca veicoli funziona anche per targhe storiche
5. L'Admin puo eseguire le stesse operazioni su qualsiasi tenant

## Tasks / Subtasks

- [ ] Task 1: Creare il modello LicensePlateHistory in Prisma (AC: #1, #2)
  - [ ] 1.1 Aggiungere al Prisma schema il model `LicensePlateHistory` con campi: `id String @id @default(cuid())`, `vehicleId String`, `plateNumber String`, `startDate DateTime`, `endDate DateTime?`, `tenantId String`, `createdAt DateTime @default(now())`, `notes String?`
  - [ ] 1.2 Aggiungere relazioni: `vehicle TenantVehicle @relation(fields: [vehicleId], references: [id])`, `tenant Organization @relation(fields: [tenantId], references: [id])`
  - [ ] 1.3 Aggiungere mapping SQL Server: `@@map("LicensePlateHistories")`, campi con `@map("snake_case")` (es. `@map("vehicle_id")`, `@map("plate_number")`, `@map("start_date")`, `@map("end_date")`)
  - [ ] 1.4 Aggiungere indici: `@@index([tenantId])`, `@@index([vehicleId])`, `@@index([plateNumber])` per ricerca per targa storica
  - [ ] 1.5 Verificare che il campo `plateNumber` (targa corrente) gia esista sul model `TenantVehicle` (da Story 3.3). Questo campo resta la targa corrente come denormalizzazione per accesso diretto
  - [ ] 1.6 Eseguire `npx prisma migrate dev --name add-license-plate-history` per creare la tabella
- [ ] Task 2: Creare Zod Schema per Ritargatura (AC: #1)
  - [ ] 2.1 Creare `src/lib/schemas/license-plate.ts` con schema `replatVehicleSchema`: `vehicleId` (required string), `newPlateNumber` (required string, regex formato targa italiana uppercase `/^[A-Z]{2}[0-9]{3}[A-Z]{2}$/` con supporto anche formati legacy), `effectiveDate` (required date, default oggi), `notes` (optional string max 500)
  - [ ] 2.2 Creare schema `addInitialPlateSchema`: `vehicleId` (required string), `plateNumber` (required string, stessa regex), `startDate` (required date)
  - [ ] 2.3 La validazione della targa converte automaticamente in uppercase e rimuove spazi prima della validazione regex
  - [ ] 2.4 Esportare tipi inferred: `ReplatVehicleInput`, `AddInitialPlateInput`
- [ ] Task 3: Creare License Plate Service Layer (AC: #1, #2)
  - [ ] 3.1 Creare `src/lib/services/license-plate-service.ts` con funzione `replatVehicle(db, data)`: esegue in transazione Prisma: (a) chiude il record targa corrente impostando `endDate = effectiveDate`, (b) crea nuovo record `LicensePlateHistory` con `startDate = effectiveDate` e `endDate = null`, (c) aggiorna `TenantVehicle.plateNumber` con la nuova targa
  - [ ] 3.2 Aggiungere funzione `getPlateHistory(db, vehicleId)`: ritorna tutti i record targa del veicolo ordinati per `startDate DESC`. Il primo record (endDate IS NULL) e la targa corrente
  - [ ] 3.3 Aggiungere funzione `getCurrentPlate(db, vehicleId)`: ritorna il record targa corrente (endDate IS NULL)
  - [ ] 3.4 Aggiungere funzione `initializePlateHistory(db, vehicleId, plateNumber, startDate)`: crea il primo record storico per un veicolo (usato quando un veicolo operativo viene aggiunto per la prima volta con Story 3.3)
  - [ ] 3.5 Aggiungere funzione `searchByPlate(db, query)`: cerca veicoli per targa (corrente o storica) con pattern matching LIKE per ricerca parziale. Ritorna veicoli con indicazione se la targa trovata e corrente o storica
  - [ ] 3.6 Implementare validazione business: la nuova targa non deve essere gia in uso da un altro veicolo attivo nello stesso tenant (check unicita targa corrente)
  - [ ] 3.7 Implementare validazione business: la `effectiveDate` della ritargatura deve essere >= `startDate` della targa corrente (no date nel passato rispetto all'assegnazione targa attuale)
  - [ ] 3.8 Tutte le operazioni loggano con Pino a livello `info`
  - [ ] 3.9 Wrappare l'operazione di ritargatura in transazione Prisma (`db.$transaction`) per garantire atomicita
- [ ] Task 4: Integrare Storico Targhe nella Creazione Veicolo Operativo (AC: #2)
  - [ ] 4.1 Aggiornare la Server Action `create-vehicle.ts` o il service equivalente (da Story 3.3): dopo la creazione del veicolo operativo con targa, chiamare `licensePlateService.initializePlateHistory()` per creare il primo record storico
  - [ ] 4.2 L'inizializzazione del primo record storico avviene nella stessa transazione della creazione del veicolo operativo
  - [ ] 4.3 Il campo `startDate` del primo record e la data di immatricolazione del veicolo (o la data di creazione se non specificata)
- [ ] Task 5: Creare Server Action per Ritargatura (AC: #1, #5)
  - [ ] 5.1 Creare `src/app/(dashboard)/vehicles/actions/replat-vehicle.ts` — Server Action `replatVehicle`: validazione Zod con `replatVehicleSchema`, verifica ruolo FM/Admin (RBAC enforcement), delega a `licensePlateService.replatVehicle()`, ritorna `ActionResult<{ id: string; newPlate: string }>`
  - [ ] 5.2 La Server Action usa `getTenantContext()` per ottenere il Prisma client filtrato per tenant
  - [ ] 5.3 La Server Action chiama `revalidatePath` per aggiornare la pagina dettaglio veicolo dopo la mutation
  - [ ] 5.4 Gestire errore specifico per targa gia in uso: ritornare `ActionResult` con codice `CONFLICT` e messaggio "La targa XX000XX e gia assegnata a un altro veicolo"
- [ ] Task 6: UI Storico Targhe nel Dettaglio Veicolo (AC: #1, #3)
  - [ ] 6.1 Creare `src/app/(dashboard)/vehicles/components/PlateHistoryPanel.tsx` — componente che mostra la targa corrente del veicolo in formato prominente (monospace uppercase, font grande) con bottone "Ritargatura" accanto
  - [ ] 6.2 Creare `src/app/(dashboard)/vehicles/components/PlateHistoryList.tsx` — componente che mostra lo storico targhe in lista cronologica: per ogni targa mostra numero targa (monospace uppercase), data inizio, data fine (o "Corrente"), note. La targa corrente e evidenziata con StatusBadge "Attiva"
  - [ ] 6.3 Creare `src/app/(dashboard)/vehicles/components/ReplatDialog.tsx` — Dialog shadcn/ui con form per ritargatura: campo targa nuova (input monospace uppercase con trasformazione automatica in maiuscolo), date picker per data effetto, campo note. Form con React Hook Form + Zod + shadcn/ui Form
  - [ ] 6.4 Il campo targa nel dialog deve avere trasformazione automatica in uppercase all'input (`onInput` handler che converte in maiuscolo)
  - [ ] 6.5 Integrare `PlateHistoryPanel` e `PlateHistoryList` nella pagina dettaglio veicolo `src/app/(dashboard)/vehicles/[id]/page.tsx` — sezione dedicata o tab "Targhe"
  - [ ] 6.6 Implementare feedback con toast (successo ritargatura, errore targa duplicata, errore generico)
  - [ ] 6.7 Implementare ConfirmDialog prima di procedere con la ritargatura: "Confermi la ritargatura da XX000XX a YY111YY con data effetto DD/MM/YYYY?"
  - [ ] 6.8 Se il veicolo non ha storico targhe (caso edge), mostrare EmptyState con messaggio "Nessuno storico targhe disponibile"
- [ ] Task 7: Ricerca per Targhe Storiche (AC: #4)
  - [ ] 7.1 Aggiornare la logica di ricerca veicoli nella `VehicleTable.tsx` (da Story 3.3): la search box deve cercare anche nella tabella `LicensePlateHistory` per trovare veicoli tramite targhe precedenti
  - [ ] 7.2 Aggiornare il service di ricerca veicoli (`vehicle-service.ts` o equivalente): la query di ricerca deve fare JOIN o subquery su `LicensePlateHistory.plateNumber` oltre che su `TenantVehicle.plateNumber`
  - [ ] 7.3 Nei risultati di ricerca, se un veicolo viene trovato tramite targa storica, indicare "(targa storica)" accanto al risultato
  - [ ] 7.4 La ricerca deve funzionare con pattern matching parziale (es. cercare "AB123" trova "AB123CD") e case-insensitive
  - [ ] 7.5 La ricerca mantiene il debounce 300ms esistente
- [ ] Task 8: Aggiornamento DataTable Veicoli (AC: #3)
  - [ ] 8.1 Aggiornare `VehicleTable.tsx` (da Story 3.3): la colonna "Targa" mostra la targa corrente in formato monospace uppercase
  - [ ] 8.2 Se il veicolo ha storico targhe (piu di una targa), mostrare un'icona o badge "Storico" accanto alla targa corrente che apre un tooltip con le targhe precedenti
  - [ ] 8.3 La colonna "Targa" resta sortable sulla targa corrente
- [ ] Task 9: Test Manuali di Verifica (AC: #1, #2, #3, #4, #5)
  - [ ] 9.1 Verificare ritargatura: FM cambia targa di un veicolo, la nuova targa appare come corrente, la precedente appare nello storico con date corrette
  - [ ] 9.2 Verificare ritargatura multipla: FM esegue 3+ ritargature sullo stesso veicolo, lo storico mostra tutte le targhe con date corrette in ordine cronologico
  - [ ] 9.3 Verificare unicita targa: FM tenta di assegnare una targa gia in uso da un altro veicolo — il sistema rifiuta con messaggio chiaro
  - [ ] 9.4 Verificare ricerca per targa storica: FM cerca una targa vecchia nella search box — il veicolo viene trovato con indicazione "(targa storica)"
  - [ ] 9.5 Verificare che la creazione di un nuovo veicolo operativo (Story 3.3) inizializzi automaticamente il primo record storico targa
  - [ ] 9.6 Verificare isolamento tenant: le targhe di un tenant non sono visibili nella ricerca di un altro tenant
  - [ ] 9.7 Verificare che l'Admin puo eseguire ritargature su qualsiasi tenant
  - [ ] 9.8 Verificare formattazione: la targa e sempre mostrata in maiuscolo monospace

## Dev Notes

### Dipendenze da Stories Precedenti

Questa story presuppone che siano completate:
- **Story 1.1**: Scaffold progetto, Prisma, Better Auth, ActionResult<T>
- **Story 1.2**: Multi-tenancy con Prisma client extension, tenant context injection
- **Story 1.4**: RBAC con ruoli Admin/FM/Driver
- **Story 3.3**: Aggiunta veicolo operativo (model TenantVehicle con campo `plateNumber`, VehicleTable con ricerca)

### Decisioni Architetturali Rilevanti

- **DA-1 Modello Multi-Tenant**: `tenantId` su `LicensePlateHistory`. Auto-filter via Prisma client extension
- **AC-1 Pattern API Ibrido**: Server Actions per ritargatura. Nessun Route Handler necessario
- **AC-2 Error Handling**: ActionResult<T> su ogni Server Action, con codice `CONFLICT` per targa duplicata
- **DA-4 Validazione Zod**: Schema Zod per input ritargatura, condiviso client/server. Regex formato targa italiana
- **FA-1 State Management**: RSC per read (storico targhe, targa corrente), Server Actions per write (ritargatura)
- **FA-3 Forms**: React Hook Form + Zod + shadcn/ui Form per dialog ritargatura
- **FA-5 Tabelle Dati**: TanStack Table + shadcn/ui DataTable per ricerca per targa storica

### Modello Dati LicensePlateHistory

```
LicensePlateHistory
├── id: String (cuid)
├── vehicleId: String (FK → TenantVehicle)
├── plateNumber: String (formato targa italiana, uppercase)
├── startDate: DateTime (data inizio validita targa)
├── endDate: DateTime? (null = targa corrente)
├── notes: String?
├── tenantId: String (FK → Organization)
└── createdAt: DateTime
```

Vincolo logico: per ogni `vehicleId`, al massimo un record con `endDate IS NULL` (una sola targa corrente per veicolo).

### Relazione con TenantVehicle.plateNumber

Il campo `plateNumber` su `TenantVehicle` e una denormalizzazione per accesso diretto alla targa corrente senza JOIN. La fonte di verita e `LicensePlateHistory` (il record con `endDate IS NULL`). `TenantVehicle.plateNumber` viene aggiornato atomicamente nella stessa transazione della ritargatura.

### Logica di Ritargatura — Flusso

```
1. FM clicca "Ritargatura" nel dettaglio veicolo
2. Dialog apre con: targa corrente (readonly), campo nuova targa, date picker, note
3. FM inserisce nuova targa e data effetto → submit
4. Server Action:
   a. Validazione Zod input (formato targa, data)
   b. Verifica RBAC (FM o Admin)
   c. Verifica unicita: la nuova targa non e gia in uso nel tenant
   d. Transazione Prisma:
      i.   Chiude record targa corrente: endDate = effectiveDate
      ii.  Crea nuovo LicensePlateHistory: plateNumber = nuova targa, startDate = effectiveDate, endDate = null
      iii. Aggiorna TenantVehicle.plateNumber = nuova targa
   e. Ritorna ActionResult<{ id, newPlate }>
5. UI: toast successo, revalidate pagina dettaglio
```

### Formato Targa Italiana

Il formato standard della targa italiana (dal 1994) e `AA000AA` (2 lettere + 3 numeri + 2 lettere). Tuttavia, il sistema deve supportare anche formati legacy (es. targhe provinciali pre-1994 come `MI A00000`) e targhe speciali. La validazione regex deve essere permissiva per gestire formati storici:

```typescript
// Formato targa italiana moderna: AA000AA
// Supporta anche formati legacy e targhe speciali con validazione piu ampia
const plateRegex = /^[A-Z0-9]{2,10}$/

// Il campo input converte automaticamente in uppercase e rimuove spazi
const normalizedPlate = input.toUpperCase().replace(/\s+/g, '')
```

### Ricerca per Targa Storica — Query

La ricerca per targa deve espandere la query a `LicensePlateHistory`:

```typescript
// Pseudocodice query ricerca per targa
async function searchVehiclesByPlate(db: PrismaClient, query: string) {
  // Cercare nella targa corrente (TenantVehicle.plateNumber)
  // E nella targa storica (LicensePlateHistory.plateNumber)
  const vehicles = await db.tenantVehicle.findMany({
    where: {
      OR: [
        { plateNumber: { contains: query.toUpperCase() } },
        {
          licensePlateHistory: {
            some: { plateNumber: { contains: query.toUpperCase() } }
          }
        }
      ]
    },
    include: {
      licensePlateHistory: {
        where: { plateNumber: { contains: query.toUpperCase() } },
        select: { plateNumber: true, endDate: true }
      }
    }
  })
  // Nei risultati, marcare se la targa trovata e corrente o storica
  return vehicles.map(v => ({
    ...v,
    matchedPlate: v.plateNumber.includes(query.toUpperCase())
      ? { plate: v.plateNumber, isCurrent: true }
      : { plate: v.licensePlateHistory[0]?.plateNumber, isCurrent: false }
  }))
}
```

### Convenzioni Naming (da architecture.md)

| Elemento | Convenzione | Esempio |
|---|---|---|
| Model Prisma | PascalCase singolare | `LicensePlateHistory` |
| Tabella SQL Server | PascalCase plurale | `@@map("LicensePlateHistories")` |
| Colonna SQL Server | snake_case | `@map("plate_number")`, `@map("start_date")` |
| Server Actions | kebab-case in `actions/` | `replat-vehicle.ts` |
| Componenti React | PascalCase.tsx | `PlateHistoryPanel.tsx`, `ReplatDialog.tsx` |
| Zod schema | kebab-case in `schemas/` | `license-plate.ts` |
| Service | kebab-case in `services/` | `license-plate-service.ts` |

### Struttura Directory per questa Story

```
src/
├── app/(dashboard)/vehicles/
│   ├── [id]/
│   │   └── page.tsx                      # AGGIORNATO: sezione PlateHistoryPanel + PlateHistoryList
│   ├── actions/
│   │   └── replat-vehicle.ts             # NUOVO: Server Action ritargatura
│   └── components/
│       ├── PlateHistoryPanel.tsx          # NUOVO: targa corrente + bottone ritargatura
│       ├── PlateHistoryList.tsx           # NUOVO: storico targhe cronologico
│       ├── ReplatDialog.tsx              # NUOVO: dialog per ritargatura
│       └── VehicleTable.tsx              # AGGIORNATO: ricerca per targa storica, badge storico
├── lib/
│   ├── schemas/
│   │   └── license-plate.ts              # NUOVO: Zod schemas per ritargatura
│   └── services/
│       ├── license-plate-service.ts      # NUOVO: business logic storico targhe
│       └── vehicle-service.ts            # AGGIORNATO: ricerca include targhe storiche
└── prisma/
    └── schema.prisma                     # AGGIORNATO: model LicensePlateHistory
```

### Esempio Server Action — replat-vehicle.ts

```typescript
'use server'

import { ActionResult, ErrorCode } from '@/types/action-result'
import { replatVehicleSchema } from '@/lib/schemas/license-plate'
import { licensePlateService } from '@/lib/services/license-plate-service'
import { getTenantContext } from '@/lib/auth/get-tenant-context'
import { revalidatePath } from 'next/cache'

export async function replatVehicle(formData: FormData): Promise<ActionResult<{ id: string; newPlate: string }>> {
  const parsed = replatVehicleSchema.safeParse({
    vehicleId: formData.get('vehicleId'),
    newPlateNumber: formData.get('newPlateNumber'),
    effectiveDate: formData.get('effectiveDate'),
    notes: formData.get('notes'),
  })
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message, code: ErrorCode.VALIDATION }
  }

  const { db } = await getTenantContext()
  // Verifica ruolo FM/Admin...

  try {
    const result = await licensePlateService.replatVehicle(db, parsed.data)
    revalidatePath(`/vehicles/${parsed.data.vehicleId}`)
    return { success: true, data: { id: result.id, newPlate: result.plateNumber } }
  } catch (error) {
    if (error instanceof Error && error.message.includes('gia in uso')) {
      return { success: false, error: error.message, code: ErrorCode.CONFLICT }
    }
    return { success: false, error: 'Errore nella ritargatura del veicolo', code: ErrorCode.INTERNAL }
  }
}
```

### Stile Targa nella UI

La targa deve essere sempre mostrata con stile monospace uppercase, coerente con le convenzioni UX di Greenfleet:

```tsx
// Stile targa nei componenti
<span className="font-mono text-lg font-bold uppercase tracking-wider">
  {plateNumber}
</span>
```

### Inizializzazione Storico per Veicoli Esistenti

Se questa story viene implementata dopo che sono gia stati creati veicoli operativi (Story 3.3) senza storico targhe, serve una migrazione dati:

```typescript
// In license-plate-service.ts
export async function backfillPlateHistory(db: PrismaClient) {
  const vehiclesWithoutHistory = await db.tenantVehicle.findMany({
    where: {
      licensePlateHistory: { none: {} },
      plateNumber: { not: null }
    }
  })
  for (const vehicle of vehiclesWithoutHistory) {
    await db.licensePlateHistory.create({
      data: {
        vehicleId: vehicle.id,
        plateNumber: vehicle.plateNumber!,
        startDate: vehicle.registrationDate ?? vehicle.createdAt,
        endDate: null,
        tenantId: vehicle.tenantId,
      }
    })
  }
}
```

### Anti-Pattern da Evitare

- NON permettere due targhe correnti (endDate IS NULL) sullo stesso veicolo — la transazione deve chiudere la precedente prima di creare la nuova
- NON dimenticare di aggiornare `TenantVehicle.plateNumber` nella transazione di ritargatura — la denormalizzazione deve essere atomica
- NON validare solo il formato targa senza verificare unicita nel tenant — controllare che la nuova targa non sia gia in uso
- NON escludere le targhe storiche dalla ricerca — la search box deve cercare SEMPRE in `LicensePlateHistory`
- NON passare `tenantId` come parametro — estrarre SEMPRE dalla sessione via `getTenantContext()`
- NON filtrare manualmente per `tenantId` nelle query Prisma — usare SEMPRE il Prisma client extension
- NON creare Server Actions dentro page.tsx — metterle SEMPRE in directory `actions/`
- NON implementare business logic nei componenti o nelle actions — delegare SEMPRE a `src/lib/services/license-plate-service.ts`
- NON fidarsi della validazione client-side — validare SEMPRE con Zod anche nel Server Action
- NON usare `any` in TypeScript — usare tipi espliciti o `unknown` con type guard
- NON mostrare targhe in lowercase — SEMPRE uppercase monospace nella UI
- NON creare il record storico separatamente dalla creazione del veicolo — inizializzare nella stessa transazione

### References

- [Source: architecture.md#DA-1] — Modello Multi-Tenant con tenantId pervasivo
- [Source: architecture.md#AC-1] — Server Actions per mutations
- [Source: architecture.md#AC-2] — ActionResult<T> error handling, ErrorCode enum
- [Source: architecture.md#DA-4] — Validazione Zod condivisa client/server
- [Source: architecture.md#FA-1] — RSC per read, Server Actions per write
- [Source: architecture.md#FA-3] — React Hook Form + Zod + shadcn/ui Form
- [Source: architecture.md#FA-5] — TanStack Table + shadcn/ui DataTable
- [Source: architecture.md#Project Structure] — Directory structure e boundaries
- [Source: architecture.md#Tenant Context Injection Flow] — Request -> Middleware -> tenantId -> Prisma extension
- [Source: epics.md#Story 3.6] — Acceptance criteria BDD
- [Source: prd.md#FR19] — Storico targhe (ritargatura)
- [Source: ux-design-specification.md] — StatusBadge, EmptyState, ConfirmDialog, formattazione targhe mono uppercase

## Dev Agent Record

### Agent Model Used



### Debug Log References

### Completion Notes List

### File List

