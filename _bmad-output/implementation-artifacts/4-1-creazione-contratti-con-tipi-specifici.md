# Story 4.1: Creazione Contratti con Tipi Specifici

Status: done

## Story

As a **Fleet Manager**,
I want **creare contratti per i veicoli scegliendo tra 4 tipi**,
So that **posso registrare la situazione contrattuale di ogni veicolo della flotta**.

## Acceptance Criteria

1. Il FM seleziona il tipo contratto tramite Record Type selector prima di compilare il form (FR21, FR23)
2. Il tipo Proprietario include: data acquisto, prezzo, valore residuo
3. Il tipo Breve Termine include: fornitore, data inizio/fine, canone giornaliero, km inclusi
4. Il tipo Lungo Termine include: fornitore, data inizio/fine, canone mensile, franchise km, penali km extra, servizi inclusi
5. Il tipo Leasing Finanziario include: societa leasing, data inizio/fine, canone mensile, valore riscatto, maxiscontone
6. Il form utilizza React Hook Form + Zod con validazione specifica per tipo (FA-3, DA-4)
7. Il contratto viene salvato con associazione al veicolo e al tenant
8. Il modello dati usa Single Table Inheritance con colonna discriminante `type` e campi nullable (DA-2)

## Tasks / Subtasks

- [ ] Task 1: Creare modello Prisma Contract con STI (AC: #8)
  - [ ] 1.1 Aggiungere al `prisma/schema.prisma` il modello `Contract` con campi comuni: `id` (String, cuid), `tenantId` (String, FK), `vehicleId` (String, FK a Vehicle), `type` (ContractType enum), `status` (ContractStatus enum: ACTIVE, CLOSED), `notes` (String?, optional), `createdAt` (DateTime), `updatedAt` (DateTime)
  - [ ] 1.2 Aggiungere campi specifici Proprietario (nullable): `purchaseDate` (DateTime?), `purchasePrice` (Decimal?), `residualValue` (Decimal?)
  - [ ] 1.3 Aggiungere campi specifici Breve Termine (nullable): `supplier` (String?), `startDate` (DateTime?), `endDate` (DateTime?), `dailyRate` (Decimal?), `includedKm` (Int?)
  - [ ] 1.4 Aggiungere campi specifici Lungo Termine (nullable): `supplier` (String?), `startDate` (DateTime?), `endDate` (DateTime?), `monthlyRate` (Decimal?), `franchiseKm` (Int?), `extraKmPenalty` (Decimal?), `includedServices` (String?)
  - [ ] 1.5 Aggiungere campi specifici Leasing Finanziario (nullable): `leasingCompany` (String?), `startDate` (DateTime?), `endDate` (DateTime?), `monthlyRate` (Decimal?), `buybackValue` (Decimal?), `maxDiscount` (Decimal?)
  - [ ] 1.6 Aggiungere relazione `Vehicle` con `@relation` e indice `@@index([tenantId])`, `@@index([vehicleId])`, `@@map("Contracts")`
  - [ ] 1.7 Creare enum `ContractType` con valori: `PROPRIETARIO`, `BREVE_TERMINE`, `LUNGO_TERMINE`, `LEASING_FINANZIARIO`
  - [ ] 1.8 Creare enum `ContractStatus` con valori: `ACTIVE`, `CLOSED`
  - [ ] 1.9 Aggiungere relazione inversa `contracts Contract[]` nel modello `Vehicle`
  - [ ] 1.10 Eseguire `npx prisma migrate dev --name add-contracts` per creare la tabella
- [ ] Task 2: Creare schema Zod per contratti con validazione per tipo (AC: #1, #2, #3, #4, #5, #6)
  - [ ] 2.1 Creare `src/lib/schemas/contract.ts` con schema base `contractBaseSchema` — campi: `vehicleId` (string, required), `type` (enum ContractType, required), `notes` (string, optional)
  - [ ] 2.2 Creare `proprietarioSchema` che estende base con: `purchaseDate` (date, required), `purchasePrice` (number > 0, required), `residualValue` (number >= 0, optional)
  - [ ] 2.3 Creare `breveTermineSchema` che estende base con: `supplier` (string, required), `startDate` (date, required), `endDate` (date, required, > startDate), `dailyRate` (number > 0, required), `includedKm` (number > 0, optional)
  - [ ] 2.4 Creare `lungoTermineSchema` che estende base con: `supplier` (string, required), `startDate` (date, required), `endDate` (date, required, > startDate), `monthlyRate` (number > 0, required), `franchiseKm` (number > 0, optional), `extraKmPenalty` (number > 0, optional), `includedServices` (string, optional)
  - [ ] 2.5 Creare `leasingFinanziarioSchema` che estende base con: `leasingCompany` (string, required), `startDate` (date, required), `endDate` (date, required, > startDate), `monthlyRate` (number > 0, required), `buybackValue` (number > 0, optional), `maxDiscount` (number >= 0, optional)
  - [ ] 2.6 Creare `contractSchema` come `z.discriminatedUnion("type", [...])` che unisce i 4 schema tipo-specifici
  - [ ] 2.7 Esportare tipi TypeScript inferiti: `ContractInput`, `ProprietarioInput`, `BreveTermineInput`, `LungoTermineInput`, `LeasingFinanziarioInput`
  - [ ] 2.8 Aggiungere validazione custom: per tipi con date inizio/fine, verificare che `endDate > startDate`
- [ ] Task 3: Creare componente Record Type Selector (AC: #1)
  - [ ] 3.1 Creare `src/app/(dashboard)/contracts/components/ContractTypeSelector.tsx` — componente client che mostra 4 card cliccabili (una per tipo contratto)
  - [ ] 3.2 Ogni card mostra: icona, nome tipo, breve descrizione (es. "Proprietario: veicolo di proprieta dell'azienda")
  - [ ] 3.3 Card selezionata evidenziata con bordo primary (`border-primary`) e sfondo `bg-primary/5`
  - [ ] 3.4 Al click su un tipo, emettere `onSelect(type: ContractType)` al componente padre
  - [ ] 3.5 Usare shadcn/ui `Card`, `CardHeader`, `CardTitle`, `CardDescription` per ogni opzione
  - [ ] 3.6 Layout grid responsive: 2 colonne su desktop, 1 su mobile (`grid grid-cols-1 md:grid-cols-2 gap-4`)
- [ ] Task 4: Creare ContractForm con campi dinamici per tipo (AC: #2, #3, #4, #5, #6)
  - [ ] 4.1 Creare `src/app/(dashboard)/contracts/components/ContractForm.tsx` — componente client (`"use client"`) con React Hook Form + Zod resolver
  - [ ] 4.2 Il form riceve `contractType: ContractType` come prop e seleziona lo schema Zod corretto
  - [ ] 4.3 Sezione "Veicolo" con `VehicleSelector` (combobox per selezionare il veicolo dal tenant)
  - [ ] 4.4 Sezione campi tipo-specifici renderizzata condizionatamente in base a `contractType`:
    - Proprietario: data acquisto (DatePicker), prezzo (Input number con formattazione EUR), valore residuo (Input number)
    - Breve Termine: fornitore (Input text), data inizio/fine (DatePicker x2), canone giornaliero (Input number EUR), km inclusi (Input number)
    - Lungo Termine: fornitore (Input text), data inizio/fine (DatePicker x2), canone mensile (Input number EUR), franchise km (Input number), penali km extra (Input number EUR/km), servizi inclusi (Textarea)
    - Leasing Finanziario: societa leasing (Input text), data inizio/fine (DatePicker x2), canone mensile (Input number EUR), valore riscatto (Input number EUR), maxiscontone (Input number EUR)
  - [ ] 4.5 Sezione "Note" opzionale con Textarea
  - [ ] 4.6 Layout grid 2 colonne desktop (`grid grid-cols-1 md:grid-cols-2 gap-6`), label sopra input
  - [ ] 4.7 Configurare `mode: "onBlur"` per inline validation on-blur
  - [ ] 4.8 Footer form: "Annulla" (variant ghost) e "Salva contratto" (variant default)
- [ ] Task 5: Creare VehicleSelector component (AC: #7)
  - [ ] 5.1 Creare `src/components/forms/VehicleSelector.tsx` — combobox con ricerca per selezionare un veicolo del tenant
  - [ ] 5.2 Usare shadcn/ui `Combobox` (Command + Popover) con search per targa, marca, modello
  - [ ] 5.3 Mostrare nella lista: targa (bold) + marca modello + allestimento
  - [ ] 5.4 Emettere `onSelect(vehicleId: string)` al padre
  - [ ] 5.5 Supportare pre-selezione quando il contratto viene creato dalla pagina dettaglio veicolo (prop `defaultVehicleId`)
- [ ] Task 6: Creare Server Actions CRUD contratti (AC: #7, #8)
  - [ ] 6.1 Creare `src/app/(dashboard)/contracts/actions/create-contract.ts` — `"use server"`, valida input con `contractSchema.safeParse()`, verifica auth e ruolo FM/Admin, crea contratto con Prisma, ritorna `ActionResult<{ id: string }>`
  - [ ] 6.2 Creare `src/app/(dashboard)/contracts/actions/update-contract.ts` — `"use server"`, valida, verifica ownership (tenant), aggiorna contratto attivo, ritorna `ActionResult<{ id: string }>`
  - [ ] 6.3 Creare `src/app/(dashboard)/contracts/actions/delete-contract.ts` — `"use server"`, soft delete (set status CLOSED) con conferma, ritorna `ActionResult<void>`
  - [ ] 6.4 In ogni action, verificare che il veicolo appartenga al tenant corrente
  - [ ] 6.5 Chiamare `revalidatePath("/contracts")` e `revalidatePath("/vehicles/[vehicleId]")` dopo ogni mutation
- [ ] Task 7: Creare pagine contratti (lista, nuovo, dettaglio) (AC: #1, #7)
  - [ ] 7.1 Creare `src/app/(dashboard)/contracts/page.tsx` — Server Component, DataTable con lista contratti del tenant (colonne: veicolo/targa, tipo, stato, date, fornitore/societa). Sorting, paginazione, ricerca
  - [ ] 7.2 Creare `src/app/(dashboard)/contracts/loading.tsx` — skeleton della DataTable
  - [ ] 7.3 Creare `src/app/(dashboard)/contracts/error.tsx` — error boundary con retry
  - [ ] 7.4 Creare `src/app/(dashboard)/contracts/new/page.tsx` — Step 1: ContractTypeSelector, Step 2: ContractForm con tipo selezionato. Titolo "Nuovo contratto", breadcrumb `Dashboard > Contratti > Nuovo`
  - [ ] 7.5 Creare `src/app/(dashboard)/contracts/[id]/page.tsx` — dettaglio contratto con dati tipo-specifici, bottoni Modifica/Chiudi
  - [ ] 7.6 Creare `src/app/(dashboard)/contracts/[id]/edit/page.tsx` — form modifica con dati pre-compilati (tipo non modificabile)
- [ ] Task 8: Creare componente ContractTable (AC: #7)
  - [ ] 8.1 Creare `src/app/(dashboard)/contracts/components/ContractTable.tsx` — TanStack Table + shadcn/ui DataTable
  - [ ] 8.2 Colonne: Veicolo (targa + marca modello), Tipo (badge con colore per tipo), Stato (StatusBadge), Date (inizio-fine o data acquisto), Importo (canone o prezzo), Azioni (menu: Dettaglio, Modifica, Chiudi)
  - [ ] 8.3 Filtri: tipo contratto (Select multi), stato (Select), ricerca per targa/fornitore
  - [ ] 8.4 Paginazione default 50 righe, sorting su tutte le colonne
  - [ ] 8.5 Click su riga naviga al dettaglio `/contracts/[id]`

## Dev Notes

### Decisioni Architetturali Rilevanti

- **DA-2 Single Table Inheritance:** Tabella unica `Contract` con colonna discriminante `type` (ContractType enum) e campi nullable per attributi specifici. Prisma non supporta ereditarieta nativa, STI e il pattern scelto per semplicita dato il numero limitato di tipi (4)
- **DA-4 Validazione Zod:** Schema Zod con `z.discriminatedUnion("type", [...])` per validazione tipo-specifica condivisa client/server
- **FA-3 Forms:** React Hook Form + Zod + shadcn/ui Form. Mode `onBlur` per inline validation
- **AC-1 Pattern API Ibrido:** Server Actions per CRUD contratti
- **AC-2 Error Handling:** ActionResult<T> pattern su ogni Server Action

### Schema Prisma Contract (STI)

```prisma
enum ContractType {
  PROPRIETARIO
  BREVE_TERMINE
  LUNGO_TERMINE
  LEASING_FINANZIARIO
}

enum ContractStatus {
  ACTIVE
  CLOSED
}

model Contract {
  id        String         @id @default(cuid())
  tenantId  String         @map("tenant_id")
  vehicleId String         @map("vehicle_id")
  type      ContractType
  status    ContractStatus @default(ACTIVE)
  notes     String?

  // Proprietario
  purchaseDate  DateTime? @map("purchase_date")
  purchasePrice Decimal?  @map("purchase_price")
  residualValue Decimal?  @map("residual_value")

  // Breve Termine + Lungo Termine + Leasing
  supplier  String?
  startDate DateTime? @map("start_date")
  endDate   DateTime? @map("end_date")

  // Breve Termine
  dailyRate  Decimal? @map("daily_rate")
  includedKm Int?     @map("included_km")

  // Lungo Termine
  monthlyRate    Decimal? @map("monthly_rate")
  franchiseKm    Int?     @map("franchise_km")
  extraKmPenalty Decimal? @map("extra_km_penalty")
  includedServices String? @map("included_services")

  // Leasing Finanziario
  leasingCompany String?  @map("leasing_company")
  buybackValue   Decimal? @map("buyback_value")
  maxDiscount    Decimal? @map("max_discount")

  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  vehicle Vehicle @relation(fields: [vehicleId], references: [id])

  @@index([tenantId])
  @@index([vehicleId])
  @@index([type])
  @@index([status])
  @@map("Contracts")
}
```

### Zod Discriminated Union Pattern

```typescript
import { z } from "zod"

const contractBase = z.object({
  vehicleId: z.string().min(1, "Veicolo obbligatorio"),
  notes: z.string().optional(),
})

const proprietarioSchema = contractBase.extend({
  type: z.literal("PROPRIETARIO"),
  purchaseDate: z.coerce.date({ required_error: "Data acquisto obbligatoria" }),
  purchasePrice: z.number().positive("Il prezzo deve essere positivo"),
  residualValue: z.number().nonnegative().optional(),
})

const breveTermineSchema = contractBase.extend({
  type: z.literal("BREVE_TERMINE"),
  supplier: z.string().min(1, "Fornitore obbligatorio"),
  startDate: z.coerce.date({ required_error: "Data inizio obbligatoria" }),
  endDate: z.coerce.date({ required_error: "Data fine obbligatoria" }),
  dailyRate: z.number().positive("Il canone giornaliero deve essere positivo"),
  includedKm: z.number().int().positive().optional(),
}).refine((data) => data.endDate > data.startDate, {
  message: "La data fine deve essere successiva alla data inizio",
  path: ["endDate"],
})

// ... lungoTermineSchema, leasingFinanziarioSchema analoghi

export const contractSchema = z.discriminatedUnion("type", [
  proprietarioSchema,
  breveTermineSchema,
  lungoTermineSchema,
  leasingFinanziarioSchema,
])
```

### Record Type Selector Pattern (da UX Design)

Il Record Type selector e il primo step nella creazione di un contratto. L'utente sceglie il tipo, poi il form mostra i campi specifici. Pattern a 2 step nella pagina `/contracts/new`:

```tsx
// Step 1: selezione tipo
const [selectedType, setSelectedType] = useState<ContractType | null>(null)

// Step 2: form con tipo selezionato
{selectedType ? (
  <ContractForm contractType={selectedType} onBack={() => setSelectedType(null)} />
) : (
  <ContractTypeSelector onSelect={setSelectedType} />
)}
```

### Campi Condivisi tra Tipi

Nota: `supplier`, `startDate`, `endDate`, `monthlyRate` sono condivisi tra piu tipi nel database (STI) ma nel form vengono mostrati solo per il tipo corretto. Nel Prisma schema sono campi della stessa tabella ma nullable.

### Formattazione Numeri

I campi monetari (prezzo, canone, valore riscatto) vanno formattati in locale IT con simbolo EUR:
- Input: accettare numeri decimali con punto o virgola
- Display: `Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" })`
- Km: `Intl.NumberFormat("it-IT")` senza decimali

### Convenzioni Naming Applicate

| Elemento | Convenzione | File |
|---|---|---|
| Zod schema | kebab-case.ts in `schemas/` | `src/lib/schemas/contract.ts` |
| React Component | PascalCase.tsx | `ContractForm.tsx`, `ContractTypeSelector.tsx` |
| Server Action | kebab-case.ts in `actions/` | `create-contract.ts`, `update-contract.ts` |
| Pagina | page.tsx nella route | `src/app/(dashboard)/contracts/new/page.tsx` |
| Enum Prisma | PascalCase | `ContractType`, `ContractStatus` |

### Struttura File Target

```
src/
├── lib/schemas/
│   └── contract.ts                  # Zod schemas per tipo contratto (discriminated union)
├── components/forms/
│   └── VehicleSelector.tsx          # Combobox selezione veicolo (shared)
├── app/(dashboard)/contracts/
│   ├── page.tsx                     # Lista contratti (DataTable)
│   ├── loading.tsx                  # Skeleton DataTable
│   ├── error.tsx                    # Error boundary
│   ├── new/
│   │   └── page.tsx                 # Step 1: type selector, Step 2: form
│   ├── [id]/
│   │   ├── page.tsx                 # Dettaglio contratto
│   │   └── edit/
│   │       └── page.tsx             # Form modifica contratto
│   ├── actions/
│   │   ├── create-contract.ts       # Server Action creazione
│   │   ├── update-contract.ts       # Server Action modifica
│   │   └── delete-contract.ts       # Server Action chiusura (soft delete)
│   └── components/
│       ├── ContractTypeSelector.tsx  # Record Type selector (4 card)
│       ├── ContractForm.tsx          # Form dinamico per tipo
│       └── ContractTable.tsx         # DataTable contratti
└── types/
    └── domain.ts                    # ContractType, ContractStatus (se non in Prisma)
```

### Dipendenze da Story Precedenti

- **Story 1.1:** Scaffold progetto con React Hook Form, Zod, shadcn/ui Form, Prisma, Better Auth
- **Story 1.2:** Multi-tenant con tenantId e Prisma extension
- **Story 3.3:** Modello Vehicle nel Prisma schema con veicoli operativi nel tenant

### Anti-Pattern da Evitare

- NON creare tabelle separate per ogni tipo contratto — usare STI con tabella unica (DA-2)
- NON creare la Server Action dentro `page.tsx` — metterla in `actions/` directory
- NON usare `any` per i tipi — usare tipi espliciti o `z.infer<>`
- NON validare solo client-side — validare sempre anche server-side con lo stesso schema Zod
- NON rendere il tipo contratto modificabile dopo la creazione — il tipo e immutabile
- NON filtrare manualmente per tenantId nelle query — il Prisma client extension lo fa automaticamente

### References

- [Source: architecture.md#DA-2] — Single Table Inheritance per contratti polimorfici
- [Source: architecture.md#DA-4] — Validazione Zod condivisa client/server
- [Source: architecture.md#FA-3] — React Hook Form + Zod + shadcn/ui Form
- [Source: architecture.md#AC-1] — Server Actions per mutations
- [Source: architecture.md#AC-2] — ActionResult<T> pattern
- [Source: epics.md#Story 4.1] — Acceptance criteria BDD
- [Source: prd.md#FR21] — Creazione contratti 4 tipi
- [Source: prd.md#FR23] — Campi specifici per tipologia contratto
- [Source: ux-design-specification.md#Record Type Pattern] — Selector per tipo entita
- [Source: ux-design-specification.md#Form Pattern] — Grid 2 colonne, label sopra input, validation on-blur

## Dev Agent Record

### Agent Model Used



### Debug Log References

### Completion Notes List

### File List
