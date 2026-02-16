# Story 3.4: Assegnazione Dipendenti a Veicoli

Status: done

## Story

As a **Fleet Manager**,
I want **assegnare dipendenti a veicoli**,
So that **posso tracciare chi utilizza quale veicolo nella mia flotta**.

## Acceptance Criteria

1. L'assegnazione viene salvata con data di inizio (FR14)
2. Un veicolo puo avere un solo dipendente assegnato alla volta (o Pool per veicoli condivisi)
3. Lo storico delle assegnazioni precedenti e mantenuto
4. Il dipendente assegnato e visibile nella vista dettaglio del veicolo
5. Il veicolo assegnato e visibile nella vista dettaglio del dipendente
6. L'Admin puo eseguire le stesse operazioni su qualsiasi tenant

## Tasks / Subtasks

- [ ] Task 1: Creare il modello VehicleAssignment in Prisma (AC: #1, #2, #3)
  - [ ] 1.1 Aggiungere al Prisma schema il model `VehicleAssignment` con campi: `id String @id @default(cuid())`, `vehicleId String`, `employeeId String`, `startDate DateTime`, `endDate DateTime?`, `tenantId String`, `createdAt DateTime @default(now())`, `updatedAt DateTime @updatedAt`, `notes String?`
  - [ ] 1.2 Aggiungere relazioni: `vehicle TenantVehicle @relation(fields: [vehicleId], references: [id])`, `employee Employee @relation(fields: [employeeId], references: [id])`, `tenant Organization @relation(fields: [tenantId], references: [id])`
  - [ ] 1.3 Aggiungere mapping SQL Server: `@@map("VehicleAssignments")`, campi con `@map("snake_case")`
  - [ ] 1.4 Aggiungere indici: `@@index([tenantId])`, `@@index([vehicleId])`, `@@index([employeeId])`, indice unico parziale per garantire un solo assegnamento attivo per veicolo `@@unique([vehicleId, endDate])` (dove `endDate IS NULL` indica assegnamento corrente)
  - [ ] 1.5 Aggiungere campo opzionale `currentAssigneeId String?` e relazione `currentAssignee Employee?` sul model `TenantVehicle` per accesso diretto al dipendente corrente (denormalizzazione per performance query lista veicoli)
  - [ ] 1.6 Eseguire `npx prisma migrate dev --name add-vehicle-assignments` per creare la tabella
- [ ] Task 2: Creare Zod Schema per Assegnazione (AC: #1)
  - [ ] 2.1 Creare `src/lib/schemas/vehicle-assignment.ts` con schema `assignVehicleSchema`: `vehicleId` (required string), `employeeId` (required string), `startDate` (required date, default oggi), `notes` (optional string max 500)
  - [ ] 2.2 Creare schema `unassignVehicleSchema`: `vehicleId` (required string), `endDate` (required date, default oggi), `notes` (optional string max 500)
  - [ ] 2.3 Esportare tipi inferred: `AssignVehicleInput`, `UnassignVehicleInput`
- [ ] Task 3: Creare Assignment Service Layer (AC: #1, #2, #3)
  - [ ] 3.1 Creare `src/lib/services/assignment-service.ts` con funzione `assignVehicle(db, data)`: verifica che il veicolo non abbia gia un assegnamento attivo (endDate IS NULL), se presente chiude l'assegnamento corrente impostando endDate, crea il nuovo assegnamento, aggiorna `currentAssigneeId` sul TenantVehicle
  - [ ] 3.2 Aggiungere funzione `unassignVehicle(db, vehicleId, endDate)`: chiude l'assegnamento corrente impostando endDate, azzera `currentAssigneeId` sul TenantVehicle
  - [ ] 3.3 Aggiungere funzione `getAssignmentHistory(db, vehicleId)`: ritorna tutti gli assegnamenti del veicolo ordinati per startDate DESC
  - [ ] 3.4 Aggiungere funzione `getVehiclesByEmployee(db, employeeId)`: ritorna tutti i veicoli assegnati (correnti e storici) per un dipendente
  - [ ] 3.5 Aggiungere funzione `getCurrentAssignment(db, vehicleId)`: ritorna l'assegnamento attivo corrente (endDate IS NULL)
  - [ ] 3.6 Implementare validazione business: la `startDate` del nuovo assegnamento deve essere >= `endDate` dell'assegnamento precedente (no sovrapposizioni)
  - [ ] 3.7 Tutte le operazioni loggano con Pino a livello `info`
  - [ ] 3.8 Wrappare le operazioni assign/unassign in transazione Prisma (`db.$transaction`) per garantire atomicita
- [ ] Task 4: Creare Server Actions per Assegnazione (AC: #1, #2, #6)
  - [ ] 4.1 Creare `src/app/(dashboard)/vehicles/actions/assign-vehicle.ts` — Server Action `assignVehicle`: validazione Zod con `assignVehicleSchema`, verifica ruolo FM/Admin (RBAC enforcement), delega a `assignmentService.assignVehicle()`, ritorna `ActionResult<VehicleAssignment>`
  - [ ] 4.2 Creare `src/app/(dashboard)/vehicles/actions/unassign-vehicle.ts` — Server Action `unassignVehicle`: validazione Zod con `unassignVehicleSchema`, verifica ruolo FM/Admin, delega a `assignmentService.unassignVehicle()`, ritorna `ActionResult<void>`
  - [ ] 4.3 Entrambe le actions usano `getTenantContext()` per ottenere il Prisma client filtrato per tenant
  - [ ] 4.4 Entrambe le actions chiamano `revalidatePath` per aggiornare le pagine veicolo e dipendente dopo la mutation
- [ ] Task 5: UI Assegnazione nel Dettaglio Veicolo (AC: #1, #2, #4)
  - [ ] 5.1 Creare `src/app/(dashboard)/vehicles/components/AssignmentPanel.tsx` — componente che mostra l'assegnamento corrente del veicolo (nome dipendente, data inizio) con bottone "Cambia Assegnazione" e "Rimuovi Assegnazione"
  - [ ] 5.2 Creare `src/app/(dashboard)/vehicles/components/AssignmentDialog.tsx` — Dialog shadcn/ui con form per assegnare un dipendente: select/combobox dipendenti attivi del tenant (con ricerca), date picker per data inizio, campo note. Form con React Hook Form + Zod + shadcn/ui Form
  - [ ] 5.3 Il combobox dipendenti deve escludere i dipendenti gia assegnati ad altri veicoli (mostrando indicazione se gia assegnato) e includere l'opzione "Pool" (Story 3.5)
  - [ ] 5.4 Integrare `AssignmentPanel` nella pagina dettaglio veicolo `src/app/(dashboard)/vehicles/[id]/page.tsx` — visibile nella sezione dati operativi
  - [ ] 5.5 Implementare feedback con toast (successo assegnazione/rimozione, errore)
  - [ ] 5.6 Implementare ConfirmDialog per conferma prima di rimuovere un'assegnazione
- [ ] Task 6: Storico Assegnazioni nel Dettaglio Veicolo (AC: #3, #4)
  - [ ] 6.1 Creare `src/app/(dashboard)/vehicles/components/AssignmentHistory.tsx` — componente che mostra lo storico assegnazioni in lista cronologica: per ogni assegnazione mostra nome dipendente, data inizio, data fine (o "In corso"), note
  - [ ] 6.2 Integrare `AssignmentHistory` nel tab dedicato o nella sezione dettaglio veicolo
  - [ ] 6.3 Le date sono formattate in locale italiano (dd MMM yyyy)
  - [ ] 6.4 L'assegnamento corrente e evidenziato con StatusBadge "Attivo"
- [ ] Task 7: Veicolo Assegnato nella Vista Dipendente (AC: #5)
  - [ ] 7.1 Aggiornare la pagina dettaglio dipendente `src/app/(dashboard)/employees/[id]/page.tsx` (o equivalente, da Story 3.1) — aggiungere sezione "Veicolo Assegnato" che mostra il veicolo correntemente assegnato al dipendente (marca, modello, targa) con link al dettaglio veicolo
  - [ ] 7.2 Aggiungere sezione "Storico Veicoli" nel dettaglio dipendente — lista veicoli precedentemente assegnati con date
  - [ ] 7.3 Se il dipendente non ha veicolo assegnato, mostrare EmptyState con messaggio appropriato
- [ ] Task 8: Aggiornamento Lista Veicoli (AC: #4)
  - [ ] 8.1 Aggiornare la DataTable veicoli (`VehicleTable.tsx` da Story 3.3) — aggiungere colonna "Assegnato a" che mostra il nome del dipendente corrente (o "Pool" o "-" se non assegnato)
  - [ ] 8.2 Aggiungere filtro nella DataTable per stato assegnazione: "Tutti", "Assegnati", "Non assegnati", "Pool"
  - [ ] 8.3 La colonna "Assegnato a" e sortable e cliccabile (link al dipendente)
- [ ] Task 9: Test Manuali di Verifica (AC: #1, #2, #3, #4, #5, #6)
  - [ ] 9.1 Verificare assegnazione: FM assegna un dipendente a un veicolo, l'assegnamento appare nel dettaglio veicolo
  - [ ] 9.2 Verificare vincolo unicita: tentare di assegnare un secondo dipendente allo stesso veicolo senza rimuovere il primo — il sistema deve chiudere automaticamente l'assegnamento precedente
  - [ ] 9.3 Verificare storico: dopo 2+ assegnazioni sullo stesso veicolo, lo storico mostra tutte le assegnazioni con date corrette
  - [ ] 9.4 Verificare vista dipendente: il veicolo assegnato appare nel dettaglio del dipendente
  - [ ] 9.5 Verificare rimozione: FM rimuove l'assegnazione, il veicolo risulta non assegnato, lo storico mantiene il record
  - [ ] 9.6 Verificare isolamento tenant: un FM non vede dipendenti o veicoli di altri tenant nel combobox assegnazione
  - [ ] 9.7 Verificare che l'Admin puo eseguire assegnazioni su qualsiasi tenant

## Dev Notes

### Dipendenze da Stories Precedenti

Questa story presuppone che siano completate:
- **Story 1.1**: Scaffold progetto, Prisma, Better Auth, ActionResult<T>
- **Story 1.2**: Multi-tenancy con Prisma client extension, tenant context injection
- **Story 1.4**: RBAC con ruoli Admin/FM/Driver
- **Story 3.1**: CRUD Dipendenti (model Employee esistente)
- **Story 3.3**: Aggiunta veicolo operativo (model TenantVehicle esistente)

### Decisioni Architetturali Rilevanti

- **DA-1 Modello Multi-Tenant**: `tenantId` su `VehicleAssignment`. Auto-filter via Prisma client extension
- **AC-1 Pattern API Ibrido**: Server Actions per assign/unassign. Nessun Route Handler necessario
- **AC-2 Error Handling**: ActionResult<T> su ogni Server Action (assign, unassign)
- **DA-4 Validazione Zod**: Schema Zod per input assegnazione, condiviso client/server
- **FA-1 State Management**: RSC per read (storico, assegnamento corrente), Server Actions per write (assign/unassign)
- **FA-3 Forms**: React Hook Form + Zod + shadcn/ui Form per dialog assegnazione
- **FA-5 Tabelle Dati**: TanStack Table + shadcn/ui DataTable per storico assegnazioni

### Modello Dati VehicleAssignment

```
VehicleAssignment
├── id: String (cuid)
├── vehicleId: String (FK → TenantVehicle)
├── employeeId: String (FK → Employee)
├── startDate: DateTime
├── endDate: DateTime? (null = assegnamento corrente)
├── notes: String?
├── tenantId: String (FK → Organization)
├── createdAt: DateTime
└── updatedAt: DateTime
```

Vincolo logico: per ogni `vehicleId`, al massimo un record con `endDate IS NULL` (un solo assegnamento attivo per veicolo).

### Logica di Assegnazione — Flusso

```
1. FM clicca "Assegna Dipendente" sul veicolo
2. Dialog apre con combobox dipendenti + date picker
3. FM seleziona dipendente e data inizio → submit
4. Server Action:
   a. Validazione Zod input
   b. Verifica RBAC (FM o Admin)
   c. Transazione Prisma:
      i.   Se esiste assegnamento corrente → chiude con endDate = startDate nuovo
      ii.  Crea nuovo VehicleAssignment
      iii. Aggiorna TenantVehicle.currentAssigneeId
   d. Ritorna ActionResult<VehicleAssignment>
5. UI: toast successo, revalidate pagina
```

### Denormalizzazione currentAssigneeId

Il campo `currentAssigneeId` su `TenantVehicle` e una denormalizzazione intenzionale per evitare subquery/join nella lista veicoli. Viene mantenuto in sincronia dalla transazione di assign/unassign. La fonte di verita rimane la tabella `VehicleAssignment` (il record con `endDate IS NULL`).

### Convenzioni Naming (da architecture.md)

| Elemento | Convenzione | Esempio |
|---|---|---|
| Model Prisma | PascalCase singolare | `VehicleAssignment` |
| Tabella SQL Server | PascalCase plurale | `@@map("VehicleAssignments")` |
| Colonna SQL Server | snake_case | `@map("vehicle_id")` |
| Server Actions | kebab-case in `actions/` | `assign-vehicle.ts`, `unassign-vehicle.ts` |
| Componenti React | PascalCase.tsx | `AssignmentPanel.tsx`, `AssignmentDialog.tsx` |
| Zod schema | kebab-case in `schemas/` | `vehicle-assignment.ts` |
| Service | kebab-case in `services/` | `assignment-service.ts` |

### Struttura Directory per questa Story

```
src/
├── app/(dashboard)/vehicles/
│   ├── [id]/
│   │   └── page.tsx                    # Aggiornato: sezione AssignmentPanel + AssignmentHistory
│   ├── actions/
│   │   ├── assign-vehicle.ts           # NUOVO: Server Action assegnazione
│   │   └── unassign-vehicle.ts         # NUOVO: Server Action rimozione assegnazione
│   └── components/
│       ├── AssignmentPanel.tsx          # NUOVO: pannello assegnamento corrente
│       ├── AssignmentDialog.tsx         # NUOVO: dialog per assegnare dipendente
│       ├── AssignmentHistory.tsx        # NUOVO: storico assegnazioni
│       └── VehicleTable.tsx             # AGGIORNATO: colonna "Assegnato a"
├── app/(dashboard)/employees/
│   └── [id]/
│       └── page.tsx                     # AGGIORNATO: sezione veicolo assegnato
├── lib/
│   ├── schemas/
│   │   └── vehicle-assignment.ts        # NUOVO: Zod schemas
│   └── services/
│       └── assignment-service.ts        # NUOVO: business logic assegnazioni
└── prisma/
    └── schema.prisma                    # AGGIORNATO: model VehicleAssignment
```

### Esempio Server Action — assign-vehicle.ts

```typescript
'use server'

import { ActionResult, ErrorCode } from '@/types/action-result'
import { assignVehicleSchema } from '@/lib/schemas/vehicle-assignment'
import { assignmentService } from '@/lib/services/assignment-service'
import { getTenantContext } from '@/lib/auth/get-tenant-context'
import { revalidatePath } from 'next/cache'

export async function assignVehicle(formData: FormData): Promise<ActionResult<{ id: string }>> {
  const parsed = assignVehicleSchema.safeParse({
    vehicleId: formData.get('vehicleId'),
    employeeId: formData.get('employeeId'),
    startDate: formData.get('startDate'),
    notes: formData.get('notes'),
  })
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message, code: ErrorCode.VALIDATION }
  }

  const { db } = await getTenantContext()
  // Verifica ruolo FM/Admin...

  try {
    const assignment = await assignmentService.assignVehicle(db, parsed.data)
    revalidatePath(`/vehicles/${parsed.data.vehicleId}`)
    return { success: true, data: { id: assignment.id } }
  } catch (error) {
    return { success: false, error: 'Errore nell\'assegnazione del veicolo', code: ErrorCode.INTERNAL }
  }
}
```

### Anti-Pattern da Evitare

- NON permettere due assegnamenti attivi (endDate IS NULL) sullo stesso veicolo — la transazione deve chiudere il precedente prima di creare il nuovo
- NON passare `tenantId` come parametro — estrarre SEMPRE dalla sessione via `getTenantContext()`
- NON filtrare manualmente per `tenantId` nelle query Prisma — usare SEMPRE il Prisma client extension
- NON creare Server Actions dentro page.tsx — metterle SEMPRE in directory `actions/`
- NON implementare business logic nei componenti o nelle actions — delegare SEMPRE a `src/lib/services/assignment-service.ts`
- NON fidarsi della validazione client-side — validare SEMPRE con Zod anche nel Server Action
- NON usare `any` in TypeScript — usare tipi espliciti o `unknown` con type guard
- NON aggiornare `currentAssigneeId` fuori dalla transazione — mantenere atomicita con `db.$transaction`
- NON mostrare dipendenti di altri tenant nel combobox — il Prisma client extension filtra automaticamente, ma verificare che il componente usi il client corretto

### References

- [Source: architecture.md#DA-1] — Modello Multi-Tenant con tenantId pervasivo
- [Source: architecture.md#AC-1] — Server Actions per mutations
- [Source: architecture.md#AC-2] — ActionResult<T> error handling
- [Source: architecture.md#DA-4] — Validazione Zod condivisa client/server
- [Source: architecture.md#FA-1] — RSC per read, Server Actions per write
- [Source: architecture.md#FA-3] — React Hook Form + Zod + shadcn/ui Form
- [Source: architecture.md#FA-5] — TanStack Table + shadcn/ui DataTable
- [Source: architecture.md#Project Structure] — Directory structure e boundaries
- [Source: architecture.md#Tenant Context Injection Flow] — Request -> Middleware -> tenantId -> Prisma extension
- [Source: epics.md#Story 3.4] — Acceptance criteria BDD
- [Source: prd.md#FR14] — Assegnazione dipendenti a veicoli
- [Source: ux-design-specification.md] — StatusBadge, EmptyState, ConfirmDialog patterns

## Dev Agent Record

### Agent Model Used



### Debug Log References

### Completion Notes List

### File List

