# Story 3.5: Pool Pseudo-Driver per Veicoli Condivisi

Status: done

## Story

As a **Fleet Manager**,
I want **assegnare veicoli condivisi a un Pool invece che a un singolo dipendente**,
So that **posso gestire veicoli usati da piu persone senza creare assegnazioni fittizie**.

## Acceptance Criteria

1. Il Pool e disponibile come pseudo-driver per l'assegnazione veicoli
2. Il Pool e disponibile automaticamente in ogni tenant (creato al setup del tenant)
3. I veicoli assegnati al Pool sono distinguibili visivamente nella lista veicoli tramite StatusBadge
4. I veicoli Pool partecipano normalmente ai calcoli di emissione e report
5. Il Pool non e modificabile ne cancellabile dal Fleet Manager
6. L'assegnazione al Pool segue lo stesso flusso dell'assegnazione a un dipendente normale (Story 3.4)

## Tasks / Subtasks

- [ ] Task 1: Modellare il Pool come Record Employee Speciale (AC: #1, #5)
  - [ ] 1.1 Aggiungere al model `Employee` nel Prisma schema un campo `isPool Boolean @default(false)` per identificare il record Pool
  - [ ] 1.2 Aggiungere campo `type String @default("employee")` con valori possibili `employee` | `pool` per distinguere semanticamente i record. Mappare con `@map("type")`
  - [ ] 1.3 Il record Pool ha valori fissi: `firstName: "Pool"`, `lastName: "Veicoli Condivisi"`, `isActive: true`, `isPool: true`, `type: "pool"`. Non ha email, telefono o altri dati anagrafici
  - [ ] 1.4 Eseguire `npx prisma migrate dev --name add-employee-pool-flag` per applicare le modifiche allo schema
- [ ] Task 2: Creazione Automatica Pool per Ogni Tenant (AC: #2)
  - [ ] 2.1 Creare `src/lib/services/pool-service.ts` con funzione `ensurePoolExists(db, tenantId)`: verifica se esiste un Employee con `isPool: true` per il tenant, se non esiste lo crea con i valori fissi
  - [ ] 2.2 Aggiornare il flusso di creazione tenant (Story 1.2 — `tenant-service.ts`) per chiamare `ensurePoolExists` dopo la creazione dell'organizzazione. Il Pool viene creato nella stessa transazione del tenant
  - [ ] 2.3 Aggiornare il seed data (Story 1.6) per includere il record Pool in ogni tenant demo
  - [ ] 2.4 Creare una migrazione dati o script one-time per aggiungere il record Pool ai tenant gia esistenti: `src/lib/services/pool-service.ts` contiene anche `ensurePoolForAllTenants(basePrisma)` che itera su tutti i tenant e crea il Pool dove mancante
  - [ ] 2.5 La funzione `ensurePoolExists` e idempotente: eseguibile piu volte senza creare duplicati
- [ ] Task 3: Protezione del Record Pool (AC: #5)
  - [ ] 3.1 Aggiornare `src/lib/services/employee-service.ts` (da Story 3.1): le funzioni `updateEmployee` e `deactivateEmployee` devono rifiutare operazioni su record con `isPool: true` ritornando `ActionResult` con errore `FORBIDDEN` e messaggio "Il record Pool non puo essere modificato"
  - [ ] 3.2 Aggiornare la Server Action `delete-employee.ts` (o `deactivate-employee.ts` da Story 3.1): verificare `isPool` prima di procedere, rifiutare con messaggio chiaro
  - [ ] 3.3 Aggiornare la UI lista dipendenti: il record Pool non deve avere bottoni "Modifica" o "Disattiva" nella riga della DataTable
  - [ ] 3.4 Il record Pool non deve apparire nel form di creazione/modifica dipendente — e gestito solo dal sistema
- [ ] Task 4: Pool nel Combobox Assegnazione (AC: #1, #6)
  - [ ] 4.1 Aggiornare `src/app/(dashboard)/vehicles/components/AssignmentDialog.tsx` (da Story 3.4): nel combobox dipendenti, il record Pool deve apparire come prima opzione separata con label "Pool (Veicoli Condivisi)" e icona/stile distinto (es. icona users invece di user singolo)
  - [ ] 4.2 Il Pool appare nel combobox indipendentemente dal fatto che sia gia assegnato ad altri veicoli — piu veicoli possono essere assegnati al Pool contemporaneamente
  - [ ] 4.3 Aggiornare la logica di `assignment-service.ts` (da Story 3.4): quando `employeeId` corrisponde al Pool, NON applicare il vincolo "un dipendente = un veicolo alla volta". Il Pool e l'eccezione al vincolo di assegnazione esclusiva
- [ ] Task 5: StatusBadge per Veicoli Pool (AC: #3)
  - [ ] 5.1 Aggiornare `src/components/data-display/StatusBadge.tsx` (o creare variante) per supportare lo stato "Pool" con stile visivamente distinto: colore diverso (es. indigo/purple per distinguerlo da attivo/inattivo), icona utenti multipli, label "Pool"
  - [ ] 5.2 Aggiornare `VehicleTable.tsx` (da Story 3.3/3.4): nella colonna "Assegnato a", mostrare StatusBadge "Pool" quando il veicolo e assegnato al record Pool invece del nome dipendente
  - [ ] 5.3 Aggiornare `AssignmentPanel.tsx` (da Story 3.4): quando il veicolo e assegnato al Pool, mostrare StatusBadge "Pool" con messaggio "Veicolo condiviso — assegnato al Pool"
  - [ ] 5.4 Aggiungere filtro "Pool" nella DataTable veicoli (gia previsto in Story 3.4 Task 8.2)
- [ ] Task 6: Pool nei Calcoli di Emissione (AC: #4)
  - [ ] 6.1 Verificare che la logica di calcolo emissioni (Epic 6, Stories 6.2-6.4) non escluda i veicoli assegnati al Pool — i veicoli Pool partecipano normalmente ai calcoli di emissione teorica e reale
  - [ ] 6.2 Verificare che nei report e aggregazioni (Epic 6), i veicoli Pool siano inclusi nelle aggregazioni per carlist, tipo carburante e periodo temporale
  - [ ] 6.3 Non e necessaria logica speciale nel motore di calcolo emissioni — il calcolo si basa su veicolo, km e rifornimenti, non sull'identita del driver. Questa task e una verifica di compatibilita, non una modifica
  - [ ] 6.4 Aggiungere nota nella documentazione del servizio emissioni che i veicoli Pool contribuiscono alle emissioni della flotta senza attribuzione individuale
- [ ] Task 7: Aggiornamento Vista Stato Flotta (AC: #3)
  - [ ] 7.1 Aggiornare la vista stato flotta (Story 3.9, se gia implementata): i veicoli Pool sono conteggiati separatamente nei KPI sommari (es. "15 assegnati, 3 Pool, 2 liberi")
  - [ ] 7.2 Nella lista dipendenti, il record Pool appare con StatusBadge "Sistema" o "Pool" e non e conteggiato come dipendente reale nei totali
- [ ] Task 8: Test Manuali di Verifica (AC: #1, #2, #3, #4, #5, #6)
  - [ ] 8.1 Verificare che il Pool esista automaticamente per ogni tenant esistente e per i nuovi tenant creati
  - [ ] 8.2 Verificare assegnazione al Pool: FM assegna un veicolo al Pool, il veicolo mostra StatusBadge "Pool"
  - [ ] 8.3 Verificare multi-assegnazione Pool: FM assegna piu veicoli al Pool contemporaneamente — tutti risultano assegnati
  - [ ] 8.4 Verificare protezione: FM tenta di modificare o cancellare il record Pool — il sistema rifiuta con messaggio chiaro
  - [ ] 8.5 Verificare che il Pool non appaia nel form di creazione dipendente
  - [ ] 8.6 Verificare che i veicoli Pool appaiano correttamente nei report emissioni (se Epic 6 e implementata)
  - [ ] 8.7 Verificare isolamento tenant: il record Pool di un tenant non e visibile da un altro tenant
  - [ ] 8.8 Verificare storico: se un veicolo passa da dipendente a Pool, lo storico assegnazioni mostra entrambi i record

## Dev Notes

### Dipendenze da Stories Precedenti

Questa story presuppone che siano completate:
- **Story 1.1**: Scaffold progetto, Prisma, Better Auth, ActionResult<T>
- **Story 1.2**: Multi-tenancy con Prisma client extension, creazione tenant
- **Story 1.6**: Seed data e demo tenant
- **Story 3.1**: CRUD Dipendenti (model Employee esistente)
- **Story 3.3**: Aggiunta veicolo operativo (model TenantVehicle e VehicleTable)
- **Story 3.4**: Assegnazione dipendenti a veicoli (AssignmentDialog, AssignmentPanel, assignment-service)

### Decisioni Architetturali Rilevanti

- **DA-1 Modello Multi-Tenant**: Il record Pool ha `tenantId` come ogni Employee. Un Pool per tenant, auto-filter via Prisma extension
- **AC-1 Pattern API Ibrido**: Nessuna Server Action dedicata per il Pool — il Pool usa le stesse azioni di assegnazione della Story 3.4
- **AC-2 Error Handling**: ActionResult<T> con codice `FORBIDDEN` per tentativi di modifica/cancellazione del Pool
- **FA-1 State Management**: RSC per read (Pool nei componenti lista/dettaglio), nessuno stato client aggiuntivo

### Concetto di Pool come Pseudo-Driver

Il Pool e modellato come un record speciale nella tabella `Employee` piuttosto che come entita separata. Questa scelta ha i seguenti vantaggi:

1. **Riuso completo della logica di assegnazione** — il Pool partecipa al flusso assign/unassign di Story 3.4 senza modifiche strutturali
2. **Compatibilita con report e calcoli** — i veicoli Pool hanno un `employeeId` valido, quindi tutte le query che joinano su Employee funzionano
3. **Semplicita del modello dati** — nessuna tabella aggiuntiva, nessun polimorfismo complesso

**Eccezione al vincolo di unicita assegnazione:** Il Pool e l'unico "dipendente" che puo essere assegnato a piu veicoli contemporaneamente. La logica in `assignment-service.ts` deve gestire questa eccezione verificando `isPool` prima di applicare il vincolo "un dipendente = un veicolo alla volta".

### Record Pool — Valori Fissi

```typescript
// Valori del record Pool in ogni tenant
{
  firstName: "Pool",
  lastName: "Veicoli Condivisi",
  email: null,
  phone: null,
  isActive: true,
  isPool: true,
  type: "pool",
  // tenantId: <id del tenant>
}
```

### StatusBadge — Variante Pool

Il componente StatusBadge deve supportare una nuova variante per il Pool:

```typescript
// Esempio uso StatusBadge per Pool
<StatusBadge variant="pool" /> // Icona utenti multipli, colore indigo/purple, label "Pool"

// Nelle DataTable veicoli, colonna "Assegnato a":
// - Dipendente assegnato → nome dipendente
// - Pool → <StatusBadge variant="pool" />
// - Non assegnato → "-"
```

### Pool e Calcoli Emissione — Compatibilita

I calcoli di emissione (Story 6.2) si basano su:
- **Emissioni teoriche**: `gCO2e/km (da catalogo) x km percorsi` — non dipende dal driver
- **Emissioni reali**: `litri carburante x fattore emissione` — non dipende dal driver

Quindi i veicoli Pool partecipano ai calcoli senza logica speciale. L'unica differenza e nell'aggregazione per driver: i veicoli Pool contribuiscono alle emissioni della flotta ma non sono attribuibili a un individuo specifico.

### Convenzioni Naming (da architecture.md)

| Elemento | Convenzione | Esempio |
|---|---|---|
| Service | kebab-case in `services/` | `pool-service.ts` |
| Campo Prisma | camelCase | `isPool`, `type` |
| Colonna SQL Server | snake_case | `@map("is_pool")`, `@map("type")` |
| Componente StatusBadge | variante come prop | `variant="pool"` |

### Struttura Directory per questa Story

```
src/
├── lib/
│   └── services/
│       ├── pool-service.ts              # NUOVO: ensurePoolExists, ensurePoolForAllTenants
│       ├── employee-service.ts          # AGGIORNATO: protezione record Pool
│       ├── tenant-service.ts            # AGGIORNATO: chiama ensurePoolExists alla creazione tenant
│       └── assignment-service.ts        # AGGIORNATO: eccezione vincolo unicita per Pool
├── app/(dashboard)/vehicles/
│   └── components/
│       ├── AssignmentDialog.tsx          # AGGIORNATO: Pool come prima opzione nel combobox
│       ├── AssignmentPanel.tsx           # AGGIORNATO: StatusBadge Pool
│       └── VehicleTable.tsx             # AGGIORNATO: StatusBadge Pool nella colonna assegnazione
├── app/(dashboard)/employees/
│   └── components/
│       └── EmployeeTable.tsx            # AGGIORNATO: Pool non modificabile/cancellabile
├── components/
│   └── data-display/
│       └── StatusBadge.tsx              # AGGIORNATO: variante "pool"
└── prisma/
    └── schema.prisma                    # AGGIORNATO: campi isPool e type su Employee
```

### Migrazione Dati per Tenant Esistenti

Se ci sono tenant creati prima dell'implementazione del Pool, serve una migrazione dati:

```typescript
// pool-service.ts
export async function ensurePoolForAllTenants(basePrisma: PrismaClient) {
  const tenants = await basePrisma.organization.findMany({ where: { isActive: true } })
  for (const tenant of tenants) {
    const existingPool = await basePrisma.employee.findFirst({
      where: { tenantId: tenant.id, isPool: true }
    })
    if (!existingPool) {
      await basePrisma.employee.create({
        data: {
          firstName: "Pool",
          lastName: "Veicoli Condivisi",
          isPool: true,
          type: "pool",
          isActive: true,
          tenantId: tenant.id,
        }
      })
    }
  }
}
```

Questa funzione puo essere eseguita come script one-time o integrata nel seed.

### Anti-Pattern da Evitare

- NON creare una tabella separata per il Pool — modellare come record Employee speciale per massimizzare la compatibilita con il flusso assegnazione esistente
- NON permettere la modifica o cancellazione del record Pool — verificare `isPool` in employee-service e nelle Server Actions
- NON creare il Pool on-demand alla prima assegnazione — crearlo SEMPRE al setup del tenant per garantire disponibilita
- NON escludere i veicoli Pool dai calcoli di emissione — partecipano normalmente
- NON mostrare il Pool nel conteggio dipendenti "reali" — filtrare con `isPool: false` nei totali
- NON hardcodare l'ID del Pool — identificarlo SEMPRE tramite il campo `isPool: true` del tenant corrente
- NON duplicare la logica di assegnazione per il Pool — riutilizzare COMPLETAMENTE il flusso di Story 3.4 con l'unica eccezione del vincolo di unicita
- NON passare `tenantId` come parametro — estrarre SEMPRE dalla sessione via `getTenantContext()`
- NON usare `any` in TypeScript — usare tipi espliciti o `unknown` con type guard

### References

- [Source: architecture.md#DA-1] — Modello Multi-Tenant con tenantId pervasivo
- [Source: architecture.md#AC-2] — ActionResult<T> error handling
- [Source: architecture.md#FA-1] — RSC per read, Server Actions per write
- [Source: architecture.md#Project Structure] — Directory structure e boundaries
- [Source: architecture.md#Enforcement Guidelines] — Anti-pattern da evitare
- [Source: epics.md#Story 3.5] — Acceptance criteria BDD
- [Source: epics.md#Story 3.4] — Assegnazione dipendenti a veicoli (prerequisito)
- [Source: brainstorming] — Pool come pseudo-driver per veicoli condivisi (idea #2)
- [Source: ux-design-specification.md] — StatusBadge component, varianti

## Dev Agent Record

### Agent Model Used



### Debug Log References

### Completion Notes List

### File List

