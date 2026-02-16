# Story 3.8: Gestione Carlist

Status: done

## Story

As a **Fleet Manager**,
I want **creare e gestire carlist (raggruppamenti di veicoli con nome)**,
So that **posso organizzare la flotta in gruppi logici per analisi e reportistica**.

## Acceptance Criteria

1. La carlist viene salvata con nome e lista veicoli associati (FR25)
2. Un veicolo puo appartenere a piu carlist contemporaneamente — relazione N:M (FR26)
3. Il FM puo aggiungere e rimuovere veicoli dalle carlist
4. Il FM puo rinominare e cancellare carlist
5. Le carlist sono disponibili come filtro nelle viste veicoli e nei report

## Tasks / Subtasks

- [ ] Task 1: Creare modello Carlist e relazione N:M nel Prisma schema (AC: #1, #2)
  - [ ] 1.1 Aggiungere model `Carlist` in `prisma/schema.prisma` con campi: id (cuid), tenantId, name (String, max 100), description (String opzionale, max 500), createdAt, updatedAt, createdBy (FK a User)
  - [ ] 1.2 Creare tabella join `CarlistVehicle` per relazione N:M: id (cuid), carlistId (FK a Carlist), vehicleId (FK a TenantVehicle), addedAt (DateTime default now), addedBy (FK a User)
  - [ ] 1.3 Aggiungere unique constraint su (carlistId, vehicleId) nella tabella join per prevenire duplicati
  - [ ] 1.4 Aggiungere unique constraint su (tenantId, name) nel model Carlist per prevenire nomi duplicati nello stesso tenant
  - [ ] 1.5 Creare indice `idx_carlist_tenant_id` su tenantId nel model Carlist
  - [ ] 1.6 Aggiungere relazione `carlists CarlistVehicle[]` nel model TenantVehicle
  - [ ] 1.7 Eseguire `npx prisma migrate dev --name add-carlist`
- [ ] Task 2: Creare schema Zod per validazione carlist (AC: #1, #3, #4)
  - [ ] 2.1 Creare `src/lib/schemas/carlist.ts` con `createCarlistSchema`: name (string, min 1, max 100, trim), description (string opzionale, max 500)
  - [ ] 2.2 Creare `updateCarlistSchema`: name (string opzionale, min 1, max 100, trim), description (string opzionale, max 500)
  - [ ] 2.3 Creare `addVehiclesToCarlistSchema`: carlistId (string cuid), vehicleIds (array di string cuid, min 1)
  - [ ] 2.4 Creare `removeVehiclesFromCarlistSchema`: carlistId (string cuid), vehicleIds (array di string cuid, min 1)
  - [ ] 2.5 Creare `carlistFilterSchema`: search (string opzionale), sortBy (name | vehicleCount | createdAt), sortOrder (asc | desc)
- [ ] Task 3: Creare carlist service per business logic (AC: #1, #2, #3, #4)
  - [ ] 3.1 Creare `src/lib/services/carlist-service.ts` con funzioni: `getCarlists(prisma, filters)`, `getCarlistById(prisma, id)`, `createCarlist(prisma, input)`, `updateCarlist(prisma, id, input)`, `deleteCarlist(prisma, id)`, `addVehicles(prisma, carlistId, vehicleIds)`, `removeVehicles(prisma, carlistId, vehicleIds)`
  - [ ] 3.2 `getCarlists` ritorna PaginatedResult<Carlist> con conteggio veicoli per ogni carlist (usando `_count` di Prisma)
  - [ ] 3.3 `createCarlist` verifica unicita nome nel tenant prima di creare (ritorna CONFLICT se duplicato)
  - [ ] 3.4 `updateCarlist` verifica unicita nuovo nome nel tenant (escludendo la carlist corrente)
  - [ ] 3.5 `deleteCarlist` rimuove prima tutte le associazioni CarlistVehicle, poi la carlist stessa (cascade logico)
  - [ ] 3.6 `addVehicles` verifica che tutti i vehicleIds appartengano al tenant corrente prima di inserire
  - [ ] 3.7 `removeVehicles` rimuove solo le associazioni specificate (non la carlist)
  - [ ] 3.8 Aggiungere funzione `getCarlistsForVehicle(prisma, vehicleId)` — ritorna tutte le carlist a cui un veicolo appartiene
  - [ ] 3.9 Aggiungere funzione `getCarlistOptions(prisma)` — ritorna lista semplificata (id, name) per uso nei filtri/select
- [ ] Task 4: Creare Server Actions per CRUD carlist (AC: #1, #3, #4)
  - [ ] 4.1 Creare `src/app/(dashboard)/carlist/actions/create-carlist.ts` — Server Action che: valida input Zod, verifica RBAC (Admin o FM sul tenant), crea carlist via service, ritorna ActionResult<Carlist>
  - [ ] 4.2 Creare `src/app/(dashboard)/carlist/actions/update-carlist.ts` — Server Action che: valida input Zod, verifica RBAC, aggiorna carlist via service, ritorna ActionResult<Carlist>
  - [ ] 4.3 Creare `src/app/(dashboard)/carlist/actions/delete-carlist.ts` — Server Action che: verifica RBAC, cancella carlist via service, ritorna ActionResult<void>. Richiede ConfirmDialog
  - [ ] 4.4 Creare `src/app/(dashboard)/carlist/actions/manage-vehicles.ts` — Server Action con due operazioni: `addVehiclesToCarlist` e `removeVehiclesFromCarlist`. Valida input Zod, verifica RBAC, delega a service, ritorna ActionResult<void>
  - [ ] 4.5 Ogni Server Action logga l'operazione con Pino (info level)
- [ ] Task 5: Creare pagina lista carlist (AC: #1, #4)
  - [ ] 5.1 Creare `src/app/(dashboard)/carlist/page.tsx` — pagina lista carlist come React Server Component. Carica carlist filtrate per tenant con conteggio veicoli
  - [ ] 5.2 Creare `src/app/(dashboard)/carlist/components/CarlistTable.tsx` — DataTable con TanStack Table + shadcn/ui: colonne nome, descrizione (troncata), numero veicoli, data creazione, azioni (modifica, gestisci veicoli, elimina). Sorting, paginazione 50 righe default
  - [ ] 5.3 Implementare ricerca per nome carlist con debounce 300ms
  - [ ] 5.4 Creare `src/app/(dashboard)/carlist/loading.tsx` — skeleton matching struttura pagina
  - [ ] 5.5 Creare `src/app/(dashboard)/carlist/error.tsx` — error boundary con messaggio user-friendly + bottone retry
  - [ ] 5.6 Implementare EmptyState quando non ci sono carlist: messaggio "Nessuna carlist creata" + bottone "Crea prima carlist"
- [ ] Task 6: Creare form creazione/modifica carlist (AC: #1, #4)
  - [ ] 6.1 Creare `src/app/(dashboard)/carlist/components/CarlistForm.tsx` — form con React Hook Form + Zod + shadcn/ui Form. Campi: nome (Input, required), descrizione (Textarea, opzionale). Riutilizzabile per creazione e modifica
  - [ ] 6.2 Implementare Dialog per form creazione/modifica carlist (shadcn/ui Dialog) — la carlist e un'entita leggera, non serve pagina dedicata
  - [ ] 6.3 Implementare ConfirmDialog per conferma eliminazione carlist con messaggio che indica quanti veicoli verranno rimossi dall'associazione
  - [ ] 6.4 Feedback toast su successo/errore operazioni CRUD
- [ ] Task 7: Creare UI gestione veicoli nella carlist (AC: #2, #3)
  - [ ] 7.1 Creare `src/app/(dashboard)/carlist/[id]/page.tsx` — pagina dettaglio carlist come RSC. Mostra nome, descrizione, lista veicoli associati
  - [ ] 7.2 Creare `src/app/(dashboard)/carlist/[id]/components/CarlistVehicleTable.tsx` — DataTable dei veicoli nella carlist: colonne targa, marca/modello, stato, data aggiunta, azione (rimuovi). Sorting, paginazione
  - [ ] 7.3 Creare `src/app/(dashboard)/carlist/[id]/components/AddVehicleDialog.tsx` — Dialog con lista veicoli del tenant non ancora nella carlist, con checkbox multipla per selezione batch. Ricerca per targa/marca/modello con debounce 300ms
  - [ ] 7.4 Implementare azione "Rimuovi da carlist" con ConfirmDialog per conferma
  - [ ] 7.5 Creare `src/app/(dashboard)/carlist/[id]/loading.tsx` — skeleton matching struttura pagina
  - [ ] 7.6 Implementare EmptyState per carlist senza veicoli: messaggio "Nessun veicolo in questa carlist" + bottone "Aggiungi veicoli"
- [ ] Task 8: Integrare carlist come filtro nelle viste (AC: #5)
  - [ ] 8.1 Creare componente shared `src/components/forms/CarlistFilter.tsx` — Select/Combobox che carica le carlist del tenant (via `getCarlistOptions`) e permette filtraggio
  - [ ] 8.2 Integrare CarlistFilter nella pagina lista veicoli `src/app/(dashboard)/vehicles/page.tsx` come filtro aggiuntivo
  - [ ] 8.3 Quando una carlist e selezionata come filtro, la query veicoli filtra tramite la relazione N:M CarlistVehicle
  - [ ] 8.4 Il filtro carlist sara riutilizzabile anche nelle viste report (Epic 6) — per ora predisporre il componente come shared

## Dev Notes

### Schema Prisma — Carlist con relazione N:M

```prisma
model Carlist {
  id          String   @id @default(cuid())
  tenantId    String   @map("tenant_id")
  name        String   @db.NVarChar(100)
  description String?  @db.NVarChar(500)
  createdBy   String   @map("created_by")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  vehicles    CarlistVehicle[]
  creator     User     @relation(fields: [createdBy], references: [id])

  @@unique([tenantId, name], map: "uq_carlist_tenant_name")
  @@index([tenantId], map: "idx_carlist_tenant_id")
  @@map("Carlists")
}

model CarlistVehicle {
  id        String   @id @default(cuid())
  carlistId String   @map("carlist_id")
  vehicleId String   @map("vehicle_id")
  addedAt   DateTime @default(now()) @map("added_at")
  addedBy   String   @map("added_by")

  carlist   Carlist        @relation(fields: [carlistId], references: [id])
  vehicle   TenantVehicle  @relation(fields: [vehicleId], references: [id])
  adder     User           @relation(fields: [addedBy], references: [id])

  @@unique([carlistId, vehicleId], map: "uq_carlist_vehicle")
  @@index([carlistId], map: "idx_carlist_vehicle_carlist_id")
  @@index([vehicleId], map: "idx_carlist_vehicle_vehicle_id")
  @@map("CarlistVehicles")
}
```

### Relazione N:M — Pattern Prisma Explicit

Prisma supporta sia relazioni N:M implicite (`@relation`) che esplicite (tabella join manuale). Si usa la tabella join **esplicita** (`CarlistVehicle`) perche serve tracciare `addedAt` e `addedBy` sulla relazione — informazioni non disponibili con la relazione implicita.

### Query con Conteggio Veicoli

```typescript
// getCarlists con conteggio veicoli
const carlists = await prisma.carlist.findMany({
  where: filters,
  include: {
    _count: {
      select: { vehicles: true }
    }
  },
  orderBy: { name: "asc" },
  skip: (page - 1) * pageSize,
  take: pageSize,
})
```

### Filtro Carlist nelle Viste Veicoli

```typescript
// Query veicoli filtrati per carlist
const vehicles = await prisma.tenantVehicle.findMany({
  where: {
    ...(carlistId && {
      carlists: {
        some: { carlistId }
      }
    }),
    // ... altri filtri
  }
})
```

### Struttura File Target

```
src/
├── app/
│   └── (dashboard)/
│       ├── carlist/
│       │   ├── page.tsx               # Lista carlist (RSC)
│       │   ├── loading.tsx            # Skeleton
│       │   ├── error.tsx              # Error boundary
│       │   ├── [id]/
│       │   │   ├── page.tsx           # Dettaglio carlist con veicoli
│       │   │   ├── loading.tsx        # Skeleton
│       │   │   └── components/
│       │   │       ├── CarlistVehicleTable.tsx
│       │   │       └── AddVehicleDialog.tsx
│       │   ├── actions/
│       │   │   ├── create-carlist.ts
│       │   │   ├── update-carlist.ts
│       │   │   ├── delete-carlist.ts
│       │   │   └── manage-vehicles.ts
│       │   └── components/
│       │       ├── CarlistTable.tsx
│       │       └── CarlistForm.tsx
│       └── vehicles/
│           └── page.tsx               # Aggiungere filtro CarlistFilter
├── components/
│   └── forms/
│       └── CarlistFilter.tsx          # Componente shared filtro carlist
└── lib/
    ├── schemas/
    │   └── carlist.ts
    └── services/
        └── carlist-service.ts
```

### Decisioni Architetturali Rilevanti

- **DA-1 Multi-Tenant:** tenantId su Carlist, filtro automatico via Prisma extension. La tabella join CarlistVehicle eredita l'isolamento tenant dalla relazione con Carlist e TenantVehicle
- **DA-4 Validazione Zod:** Schema Zod condivisi per form e Server Action
- **AC-1 Pattern API Ibrido:** Server Actions per tutte le mutations CRUD carlist
- **AC-2 Error Handling:** ActionResult<T> su ogni Server Action, codice CONFLICT per nome duplicato
- **FA-1 State Management:** RSC per read, Server Actions per write, nessuno stato globale
- **FA-3 Forms:** React Hook Form + Zod + shadcn/ui Form per CarlistForm
- **FA-5 DataTable:** TanStack Table + shadcn/ui DataTable per CarlistTable e CarlistVehicleTable
- **AS-2 RBAC:** FM gestisce carlist sul proprio tenant, Admin su tutti i tenant, Driver non ha accesso

### Dipendenze da Story Precedenti

- **Story 1.1:** Scaffold progetto, Better Auth, middleware, ActionResult<T>, struttura directory
- **Story 1.2:** Prisma client extension per auto-filter tenantId
- **Story 1.3:** RLS SQL Server
- **Story 1.4:** Permissions helper (hasRole, canAccess, isTenantAdmin)
- **Story 3.3:** TenantVehicle model, pagina lista veicoli

### Anti-Pattern da Evitare

- NON usare relazione N:M implicita di Prisma — serve la tabella join esplicita per tracciare addedAt e addedBy
- NON permettere nomi carlist duplicati nello stesso tenant — unique constraint (tenantId, name)
- NON cancellare fisicamente i veicoli dalla tabella join senza verificare che appartengano al tenant — il Prisma extension garantisce il filtro, ma la verifica esplicita nel service aggiunge difesa in profondita
- NON caricare tutti i veicoli del tenant nel dialog "Aggiungi veicoli" senza paginazione — usare ricerca con debounce per tenant con molti veicoli
- NON creare Server Actions dentro page.tsx — metterle in `actions/` directory
- NON fare business logic nei componenti — delegare a `carlist-service.ts`
- NON usare `any` in TypeScript — usare tipi espliciti
- NON passare tenantId come parametro URL — estrarre dalla sessione

### UX Notes

- La carlist e un'entita leggera: creazione e modifica avvengono in Dialog, non in pagina dedicata
- Il dettaglio carlist (pagina con lista veicoli) e invece una pagina piena per gestire la composizione
- Il filtro CarlistFilter usa un Combobox con ricerca per supportare tenant con molte carlist
- Feedback toast su ogni operazione CRUD
- Formattazione numeri in locale IT (conteggio veicoli: "15 veicoli")

### References

- [Source: architecture.md#DA-1] — Multi-tenant con tenantId pervasivo
- [Source: architecture.md#Structure Patterns] — Feature-based, carlist/ directory
- [Source: architecture.md#Project Structure] — carlist/ mappato nel requirements mapping
- [Source: epics.md#Story 3.8] — Acceptance criteria BDD
- [Source: prd.md#FR25] — CRUD carlist
- [Source: prd.md#FR26] — Veicolo in piu carlist (N:M)
- [Source: ux-design-specification.md] — DataTable patterns, EmptyState, Dialog

## Dev Agent Record

### Agent Model Used



### Debug Log References

### Completion Notes List

### File List

