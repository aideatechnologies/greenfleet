# Story 3.3: Aggiunta Veicolo Operativo da Catalogo

Status: done

## Story

As a **Fleet Manager**,
I want **aggiungere un veicolo operativo al mio tenant selezionandolo dal catalogo globale**,
So that **posso iniziare a tracciare un nuovo veicolo nella mia flotta con tutti i dati tecnici precompilati**.

## Acceptance Criteria

1. Il veicolo operativo viene creato nel tenant con associazione automatica dei dati tecnici e immagine dal catalogo (FR16, FR17, FR18)
2. I dati tecnici (emissioni, consumi, motori) sono ereditati dal catalogo e non modificabili
3. I dati operativi (targa, data immatricolazione, assegnazione dipendente, stato) sono editabili dal FM
4. La targa e formattata in maiuscolo monospace
5. Il veicolo appare nella lista veicoli del tenant
6. L'Admin puo eseguire le stesse operazioni su qualsiasi tenant

## Tasks / Subtasks

- [ ] Task 1: Creare modello Prisma TenantVehicle (AC: #1, #2)
  - [ ] 1.1 Aggiungere modello `TenantVehicle` in `prisma/schema.prisma` con campi: `id` (String, cuid), `tenantId` (String), `catalogVehicleId` (String, FK a CatalogVehicle), `licensePlate` (String), `registrationDate` (DateTime), `status` (enum VehicleStatus: ACTIVE, INACTIVE, DISPOSED), `assignedEmployeeId` (String?, FK a Employee, opzionale), `createdAt` (DateTime), `updatedAt` (DateTime)
  - [ ] 1.2 Definire relazione `TenantVehicle → CatalogVehicle` (many-to-one) per ereditare i dati tecnici
  - [ ] 1.3 Definire relazione `TenantVehicle → Employee` (many-to-one, opzionale) per assegnazione dipendente
  - [ ] 1.4 Aggiungere `@@map("TenantVehicles")` e `@map` per colonne SQL Server secondo naming conventions (snake_case)
  - [ ] 1.5 Aggiungere indice composito `@@index([tenantId, licensePlate])` per ricerca per targa nel tenant
  - [ ] 1.6 Aggiungere indice `@@index([tenantId])` per filtro tenant (usato da RLS e Prisma extension)
  - [ ] 1.7 Aggiungere vincolo di unicita `@@unique([tenantId, licensePlate])` per impedire targhe duplicate nello stesso tenant
  - [ ] 1.8 Eseguire `npx prisma migrate dev --name add-tenant-vehicle` per creare la tabella

- [ ] Task 2: Creare schema Zod per TenantVehicle (AC: #1, #3, #4)
  - [ ] 2.1 Creare `src/lib/schemas/tenant-vehicle.ts` con schema `createTenantVehicleSchema`: `catalogVehicleId` (string, cuid), `licensePlate` (string, transform uppercase, regex validazione formato targa), `registrationDate` (date), `status` (enum VehicleStatus, default ACTIVE), `assignedEmployeeId` (string opzionale)
  - [ ] 2.2 Creare schema `updateTenantVehicleSchema` per modifica dati operativi: `licensePlate`, `registrationDate`, `status`, `assignedEmployeeId` (tutti opzionali)
  - [ ] 2.3 La targa deve essere trasformata automaticamente in uppercase nello schema Zod con `.transform(v => v.toUpperCase())`

- [ ] Task 3: Creare servizio veicoli operativi (AC: #1, #2, #5)
  - [ ] 3.1 Creare `src/lib/services/tenant-vehicle-service.ts` con funzioni:
    - `createTenantVehicle(prisma, data)`: crea veicolo operativo con validazione che il `catalogVehicleId` esista nel catalogo globale
    - `getTenantVehicles(prisma, filters)`: lista veicoli del tenant con include CatalogVehicle (dati tecnici + immagine) e Employee (assegnazione), paginata
    - `getTenantVehicleById(prisma, id)`: dettaglio veicolo con CatalogVehicle completo (inclusi Engine) e Employee
    - `updateTenantVehicle(prisma, id, data)`: aggiorna solo dati operativi
  - [ ] 3.2 Ogni funzione riceve il Prisma client gia filtrato per tenant (via Prisma extension)
  - [ ] 3.3 Le query di lista includono `include: { catalogVehicle: { include: { engines: true } }, assignedEmployee: true }` per mostrare dati tecnici e assegnazione

- [ ] Task 4: Creare componente CatalogVehicleSelector (AC: #1, #2)
  - [ ] 4.1 Creare `src/app/(dashboard)/vehicles/components/CatalogVehicleSelector.tsx` — componente client per ricerca e selezione veicolo dal catalogo globale
  - [ ] 4.2 Implementare ricerca con Combobox shadcn/ui con debounce 300ms su marca, modello, allestimento
  - [ ] 4.3 Mostrare risultati con dati chiave: marca, modello, allestimento, tipo carburante, emissioni CO2 g/km
  - [ ] 4.4 Al click su un risultato, mostrare anteprima dati tecnici (read-only) del veicolo selezionato con immagine Codall (o placeholder)
  - [ ] 4.5 La ricerca interroga il catalogo globale tramite una Server Action dedicata (non filtrata per tenant, il catalogo e globale)
  - [ ] 4.6 Creare `src/app/(dashboard)/vehicles/actions/search-catalog.ts` — Server Action per ricerca catalogo con paginazione

- [ ] Task 5: Creare form dati operativi (AC: #3, #4)
  - [ ] 5.1 Creare `src/app/(dashboard)/vehicles/components/TenantVehicleForm.tsx` — form React Hook Form + Zod + shadcn/ui Form per dati operativi
  - [ ] 5.2 Campi form: targa (Input, uppercase, font monospace con `font-mono` Tailwind), data immatricolazione (DatePicker), stato (Select con opzioni ACTIVE/INACTIVE/DISPOSED), dipendente assegnato (Combobox con ricerca dipendenti del tenant, opzionale)
  - [ ] 5.3 Layout form a 2 colonne su desktop, 1 colonna su mobile
  - [ ] 5.4 Validazione inline on-blur con feedback errori sotto i campi
  - [ ] 5.5 Il campo targa applica `uppercase` CSS + transform a maiuscolo su onChange + font-mono per rendering monospace
  - [ ] 5.6 Integrare CatalogVehicleSelector come primo step del form (step 1: seleziona veicolo, step 2: compila dati operativi)

- [ ] Task 6: Creare Server Action per aggiunta veicolo (AC: #1, #3)
  - [ ] 6.1 Creare `src/app/(dashboard)/vehicles/actions/create-tenant-vehicle.ts` — Server Action che:
    - Valida input con `createTenantVehicleSchema` (Zod)
    - Verifica permessi (Admin o Fleet Manager del tenant)
    - Verifica che il `catalogVehicleId` esista nel catalogo globale
    - Verifica unicita targa nel tenant
    - Chiama `tenant-vehicle-service.createTenantVehicle()`
    - Ritorna `ActionResult<TenantVehicle>`
  - [ ] 6.2 Gestire errori: VALIDATION (dati invalidi), CONFLICT (targa duplicata nel tenant), NOT_FOUND (veicolo catalogo non trovato), UNAUTHORIZED (permessi insufficienti)
  - [ ] 6.3 Al successo, effettuare `revalidatePath('/vehicles')` per aggiornare la lista

- [ ] Task 7: Creare pagina aggiunta veicolo operativo (AC: #1, #3, #4)
  - [ ] 7.1 Creare `src/app/(dashboard)/vehicles/new/page.tsx` — pagina con flusso a 2 step:
    - Step 1: CatalogVehicleSelector per ricerca e selezione veicolo dal catalogo
    - Step 2: TenantVehicleForm per compilazione dati operativi
  - [ ] 7.2 Mostrare breadcrumb: Veicoli > Aggiungi veicolo
  - [ ] 7.3 Al submit, usare `useActionState` (React 19) con stato pending e spinner sul bottone
  - [ ] 7.4 Al successo, redirect a `/vehicles` con toast di conferma (Sonner)
  - [ ] 7.5 Al fallimento, mostrare toast errore persistente con messaggio dal server

- [ ] Task 8: Creare lista veicoli operativi del tenant (AC: #5)
  - [ ] 8.1 Creare/aggiornare `src/app/(dashboard)/vehicles/page.tsx` — Server Component che carica veicoli operativi del tenant tramite `tenant-vehicle-service.getTenantVehicles()`
  - [ ] 8.2 Creare `src/app/(dashboard)/vehicles/components/TenantVehicleTable.tsx` — DataTable (TanStack Table + shadcn/ui) con colonne: immagine (thumbnail da Codall o placeholder), targa (font-mono uppercase), marca/modello (da CatalogVehicle), stato (StatusBadge), dipendente assegnato, data immatricolazione
  - [ ] 8.3 Implementare sorting, filtri (stato, carburante), search su targa/marca/modello con debounce 300ms
  - [ ] 8.4 Paginazione 50 righe default
  - [ ] 8.5 Bottone "Aggiungi veicolo" (Primary) in header che naviga a `/vehicles/new`
  - [ ] 8.6 Click su riga naviga a `/vehicles/[id]` per dettaglio
  - [ ] 8.7 Creare `src/app/(dashboard)/vehicles/loading.tsx` con skeleton matching della struttura tabella
  - [ ] 8.8 Creare `src/app/(dashboard)/vehicles/error.tsx` con messaggio user-friendly e bottone retry
  - [ ] 8.9 Mostrare EmptyState con azione suggerita quando non ci sono veicoli ("La tua flotta e vuota. Aggiungi il primo veicolo dal catalogo.")

- [ ] Task 9: Creare pagina dettaglio veicolo operativo (AC: #2, #3)
  - [ ] 9.1 Creare `src/app/(dashboard)/vehicles/[id]/page.tsx` — Server Component che carica veicolo con dati tecnici (CatalogVehicle + Engine) e dati operativi
  - [ ] 9.2 Mostrare VehicleHeader in cima: immagine Codall (o placeholder), targa (font-mono uppercase), marca/modello/allestimento, stato (StatusBadge), dipendente assegnato
  - [ ] 9.3 Sezione dati tecnici (read-only, da CatalogVehicle): marca, modello, allestimento, carrozzeria, normativa anti-inquinamento, motori (tipo combustibile, cilindrata, potenza KW/CV), emissioni CO2 g/km (WLTP/NEDC), consumi, capacita serbatoio, flag ibrido. Indicare chiaramente "Dati dal catalogo — non modificabili"
  - [ ] 9.4 Sezione dati operativi (editabili): targa, data immatricolazione, stato, dipendente assegnato. Form inline con bottone "Modifica" che abilita editing
  - [ ] 9.5 Creare `src/app/(dashboard)/vehicles/actions/update-tenant-vehicle.ts` — Server Action per aggiornamento dati operativi con validazione Zod e `ActionResult<TenantVehicle>`
  - [ ] 9.6 Creare `src/app/(dashboard)/vehicles/[id]/loading.tsx` con skeleton
  - [ ] 9.7 I numeri sono formattati in locale IT (1.234,56), emissioni con unita g/km, potenza con KW/CV

- [ ] Task 10: Formattazione targa uppercase monospace (AC: #4)
  - [ ] 10.1 Ovunque la targa viene mostrata, applicare classe Tailwind `font-mono uppercase tracking-wider`
  - [ ] 10.2 Nell'input form, applicare `uppercase` CSS + `font-mono` + transform a maiuscolo su onChange (o via Zod transform)
  - [ ] 10.3 Verificare che la formattazione sia coerente in: TenantVehicleTable, VehicleHeader, TenantVehicleForm, pagina dettaglio

## Dev Notes

### Modello Two-Tier Veicoli

L'architettura prevede un modello a due livelli per i veicoli:

- **CatalogVehicle** (globale): contiene i dati tecnici importati da InfocarData (marca, modello, allestimento, motori, emissioni, consumi, immagine Codall). Non ha tenantId. Creato e gestito dall'Admin in Epic 2.
- **TenantVehicle** (per-tenant): contiene i dati operativi specifici del tenant (targa, data immatricolazione, stato, assegnazione). Ha `tenantId` e `catalogVehicleId` FK. Creato dal Fleet Manager in questa story.

I dati tecnici sono ereditati via relazione FK e non duplicati nel TenantVehicle. Questo garantisce che aggiornamenti al catalogo si propaghino automaticamente.

### Modello Prisma TenantVehicle

```prisma
enum VehicleStatus {
  ACTIVE
  INACTIVE
  DISPOSED
}

model TenantVehicle {
  id                 String        @id @default(cuid()) @map("id")
  tenantId           String        @map("tenant_id")
  catalogVehicleId   String        @map("catalog_vehicle_id")
  licensePlate       String        @map("license_plate")
  registrationDate   DateTime      @map("registration_date")
  status             VehicleStatus @default(ACTIVE) @map("status")
  assignedEmployeeId String?       @map("assigned_employee_id")
  createdAt          DateTime      @default(now()) @map("created_at")
  updatedAt          DateTime      @updatedAt @map("updated_at")

  catalogVehicle     CatalogVehicle @relation(fields: [catalogVehicleId], references: [id])
  assignedEmployee   Employee?      @relation(fields: [assignedEmployeeId], references: [id])

  @@unique([tenantId, licensePlate])
  @@index([tenantId])
  @@index([catalogVehicleId])
  @@map("TenantVehicles")
}
```

### Dipendenza da Epic 2 (Catalogo Veicoli)

Questa story dipende dalla presenza del modello `CatalogVehicle` con i relativi `Engine` creati in Story 2.1. Se il catalogo non e ancora popolato, il CatalogVehicleSelector non avra dati da mostrare. Per lo sviluppo, assicurarsi di avere almeno alcuni record di catalogo nel seed data.

### Decisioni Architetturali Rilevanti

- **DA-1 Multi-Tenant**: TenantVehicle ha `tenantId`. Il Prisma client extension applica automaticamente il filtro su ogni query e insert. Non filtrare mai manualmente il tenantId.
- **DA-3 Multi-Engine**: Il CatalogVehicle ha relazione 1:N con Engine. Nel dettaglio veicolo, mostrare tutti i motori del veicolo dal catalogo.
- **DA-4 Validazione Zod**: Schema Zod condiviso tra form (React Hook Form) e Server Action. La transform uppercase sulla targa avviene nello schema Zod.
- **AC-1 Pattern API Ibrido**: Server Actions per creazione e aggiornamento veicolo. Nessun Route Handler necessario per questa story.
- **AC-2 Error Handling**: Tutte le Server Actions ritornano `ActionResult<T>`.
- **FA-1 State Management**: RSC per read (lista e dettaglio veicoli), Server Actions per write (creazione e aggiornamento).
- **FA-3 Forms**: React Hook Form + Zod + shadcn/ui Form per tutti i form.
- **FA-5 DataTable**: TanStack Table + shadcn/ui DataTable per lista veicoli.

### Flusso Utente — Aggiunta Veicolo

```
1. FM accede a /vehicles → vede lista veicoli (o EmptyState se vuota)
2. Click "Aggiungi veicolo" → /vehicles/new
3. Step 1: Cerca nel catalogo (Combobox con debounce)
   → Seleziona un veicolo → Anteprima dati tecnici (read-only)
4. Step 2: Compila dati operativi
   → Targa (uppercase monospace)
   → Data immatricolazione
   → Stato (default: Attivo)
   → Dipendente assegnato (opzionale)
5. Submit → Server Action → Validazione → Creazione
6. Redirect a /vehicles con toast "Veicolo aggiunto con successo"
```

### Formattazione Targa

La targa va sempre mostrata in maiuscolo monospace con tracking piu ampio per leggibilita. Classe Tailwind: `font-mono uppercase tracking-wider text-sm`. Nell'input, applicare sia CSS (`uppercase`) sia trasformazione JavaScript/Zod per garantire che il valore salvato in database sia sempre maiuscolo.

### Pattern Componenti

- **CatalogVehicleSelector**: componente client (`"use client"`) perche gestisce stato di ricerca, debounce, e apertura dropdown. Usa Combobox shadcn/ui.
- **TenantVehicleForm**: componente client (`"use client"`) per React Hook Form. Usa shadcn/ui Form, Input, Select, Combobox.
- **TenantVehicleTable**: componente client (`"use client"`) per TanStack Table interattiva.
- **Pagine (page.tsx)**: Server Components che caricano dati e passano ai componenti client.

### Convenzioni Naming (richiamo)

| Elemento | Convenzione | Esempio in questa story |
|---|---|---|
| Modello Prisma | PascalCase singolare | `TenantVehicle` |
| Server Actions | kebab-case in `actions/` | `create-tenant-vehicle.ts` |
| Componenti | PascalCase.tsx | `TenantVehicleForm.tsx` |
| Zod schemas | kebab-case in `schemas/` | `tenant-vehicle.ts` |
| Service | kebab-case in `services/` | `tenant-vehicle-service.ts` |

### Anti-Pattern da Evitare

- NON duplicare i dati tecnici dal CatalogVehicle nel TenantVehicle — usare la relazione FK
- NON filtrare manualmente per `tenantId` — il Prisma client extension lo fa automaticamente
- NON permettere la modifica dei dati tecnici dalla pagina veicolo operativo — sono read-only dal catalogo
- NON salvare la targa in formato misto — sempre uppercase nel database (via Zod transform)
- NON creare Server Actions dentro page.tsx — metterle nella directory `actions/`
- NON usare `any` — usare tipi espliciti derivati da Prisma (`TenantVehicle`, `CatalogVehicle`)

### Ricerca Catalogo — Nota Performance

La ricerca nel catalogo globale non e filtrata per tenant (il catalogo e globale). La Server Action `search-catalog.ts` deve:
- Accettare query di testo (minimo 2 caratteri)
- Cercare su marca, modello, allestimento con LIKE/contains
- Ritornare max 20 risultati per query
- Includere immagine URL (Codall) se disponibile, altrimenti null (placeholder in UI)

### References

- [Source: architecture.md#DA-1] — Modello multi-tenant con tenantId
- [Source: architecture.md#DA-3] — Multi-engine (Vehicle → Engine 1:N)
- [Source: architecture.md#Structure Patterns] — Feature-based directory structure
- [Source: architecture.md#Naming Patterns] — Convenzioni naming complete
- [Source: epics.md#Story 3.3] — Acceptance criteria BDD
- [Source: prd.md#FR16-FR18] — Requisiti funzionali veicolo operativo
- [Source: ux-design-specification.md#VehicleHeader] — Componente VehicleHeader
- [Source: ux-design-specification.md#StatusBadge] — Componente StatusBadge per stati
- [Source: ux-design-specification.md#EmptyState] — Componente EmptyState per liste vuote
- [Source: implementation-readiness-report] — Entity `tenant_vehicles, vehicle_assignments` create in Story 3.3

## Dev Agent Record

### Agent Model Used



### Debug Log References

### Completion Notes List

### File List

