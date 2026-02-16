# Story 7.4: Audit Trail Completo e Metriche Tenant

Status: done

## Story

As a **Admin**,
I want **un audit trail completo di tutte le modifiche che impattano le emissioni e metriche per-tenant**,
So that **posso garantire la tracciabilita dei dati e pianificare la capacita della piattaforma**.

## Acceptance Criteria

1. Ogni modifica a km, rifornimenti, fattori emissione e dati tecnici e tracciata con: chi, quando, valore precedente, valore nuovo (NFR10)
2. L'audit trail e consultabile con filtri per entita, utente, periodo e tipo modifica
3. Le metriche per-tenant sono disponibili: query count, storage, utenti attivi (NFR17)
4. Le metriche supportano il capacity planning per i 20 tenant x 500 veicoli target (NFR14)
5. I dati audit sono immutabili e non cancellabili

## Tasks / Subtasks

- [ ] Task 1: Modello Prisma AuditLog (AC: #1, #5)
  - [ ] 1.1 Aggiungere modello `AuditLog` al schema Prisma con campi:
    - `id` (String, @id, cuid)
    - `action` (String) — formato "entity.action" es. "fuel_record.created", "km_reading.updated"
    - `entityType` (String) — tipo entita: "Vehicle", "FuelRecord", "KmReading", "EmissionFactor", "Contract"
    - `entityId` (String) — ID dell'entita modificata
    - `tenantId` (String) — tenant di appartenenza
    - `userId` (String) — utente che ha effettuato la modifica
    - `userName` (String) — nome utente denormalizzato per leggibilita
    - `timestamp` (DateTime, @default(now()))
    - `changes` (String) — JSON serializzato di `{ field: string, old: unknown, new: unknown }[]`
    - `metadata` (String?) — JSON opzionale per info aggiuntive (es. source: "import_csv", ipAddress)
  - [ ] 1.2 Mapping SQL Server: `@@map("AuditLogs")`, colonne con `@map` snake_case
  - [ ] 1.3 Indici: `@@index([tenantId, timestamp])`, `@@index([entityType, entityId])`, `@@index([userId, timestamp])`
  - [ ] 1.4 Nessuna relazione FK con soft delete — l'audit log e autonomo e persistente anche se l'entita viene cancellata
  - [ ] 1.5 Campo `tenantId` per isolamento multi-tenant (filtrato automaticamente dal Prisma client extension)
  - [ ] 1.6 Eseguire `npx prisma migrate dev --name add-audit-log` per creare la tabella
- [ ] Task 2: Modello Prisma TenantMetrics (AC: #3, #4)
  - [ ] 2.1 Aggiungere modello `TenantMetrics` al schema Prisma con campi:
    - `id` (String, @id, cuid)
    - `tenantId` (String)
    - `date` (DateTime) — giorno di riferimento (aggregazione giornaliera)
    - `queryCount` (Int, @default(0)) — numero query eseguite
    - `storageBytes` (BigInt, @default(0)) — stima storage usato
    - `activeUsers` (Int, @default(0)) — utenti che hanno effettuato almeno un login nel giorno
    - `vehicleCount` (Int, @default(0)) — veicoli attivi
    - `fuelRecordCount` (Int, @default(0)) — rifornimenti inseriti nel giorno
    - `createdAt` (DateTime, @default(now()))
  - [ ] 2.2 Mapping SQL Server: `@@map("TenantMetrics")`, `@@unique([tenantId, date])`
  - [ ] 2.3 Indici: `@@index([tenantId, date])`
  - [ ] 2.4 Eseguire migrazione Prisma
- [ ] Task 3: Audit Service (AC: #1, #5)
  - [ ] 3.1 Creare `src/lib/services/audit-service.ts` con funzione `createAuditEntry(entry: CreateAuditInput): Promise<void>`
  - [ ] 3.2 Definire type `CreateAuditInput`:
    ```typescript
    type CreateAuditInput = {
      action: AuditAction
      entityType: string
      entityId: string
      tenantId: string
      userId: string
      userName: string
      changes: { field: string; old: unknown; new: unknown }[]
      metadata?: Record<string, unknown>
    }
    ```
  - [ ] 3.3 Serializzare `changes` e `metadata` come JSON string prima di salvare in Prisma
  - [ ] 3.4 Implementare funzione helper `diffObjects(oldObj: Record<string, unknown>, newObj: Record<string, unknown>): Change[]` che compara due oggetti e ritorna i campi modificati
  - [ ] 3.5 L'audit entry e creata in modo fire-and-forget (non blocca la risposta all'utente) — usare `void prisma.auditLog.create(...)` senza await, con catch per loggare errori
  - [ ] 3.6 Loggare con Pino ogni audit entry creata a livello `info`
  - [ ] 3.7 Il servizio NON espone funzioni di update o delete — append-only by design (immutabilita)
- [ ] Task 4: Integrazione Audit nei Service Esistenti (AC: #1)
  - [ ] 4.1 `fuel-record-service.ts`: chiamare `createAuditEntry` dopo ogni create/update/delete di rifornimento
  - [ ] 4.2 `km-reading-service.ts`: chiamare `createAuditEntry` dopo ogni create/update di rilevazione km
  - [ ] 4.3 `emission-factor-service.ts` (o equivalente in settings): chiamare `createAuditEntry` dopo ogni update di fattore emissione
  - [ ] 4.4 `vehicle-service.ts`: chiamare `createAuditEntry` dopo ogni update di dati tecnici del veicolo
  - [ ] 4.5 Per ogni integrazione: passare il `diffObjects` tra dati precedenti e nuovi per popolare il campo `changes`
  - [ ] 4.6 Per import CSV: ogni riga importata genera una audit entry con `metadata: { source: "import_csv", filename: "..." }`
- [ ] Task 5: AuditLogTable con Filtri Avanzati (AC: #2)
  - [ ] 5.1 Creare `src/app/(dashboard)/settings/audit-log/page.tsx` come Server Component che carica le audit entries
  - [ ] 5.2 Creare `src/app/(dashboard)/settings/audit-log/loading.tsx` con skeleton DataTable
  - [ ] 5.3 Creare `src/app/(dashboard)/settings/audit-log/components/AuditLogTable.tsx` con TanStack Table + shadcn/ui DataTable
  - [ ] 5.4 Colonne tabella: Data/Ora, Utente, Azione, Entita, Tipo Entita, Dettaglio modifiche
  - [ ] 5.5 Filtri:
    - **Entita** (entityType): Select con opzioni Vehicle, FuelRecord, KmReading, EmissionFactor, Contract
    - **Utente** (userId): Combobox con ricerca utenti del tenant
    - **Periodo**: DateRangePicker (data inizio, data fine)
    - **Tipo modifica** (action): Select con opzioni created, updated, deleted
  - [ ] 5.6 Filtri attivi visualizzati come chip rimovibili sopra la tabella
  - [ ] 5.7 Sorting: default per timestamp discendente (piu recente prima)
  - [ ] 5.8 Paginazione: default 50 righe, footer "Mostra 1-50 di X"
  - [ ] 5.9 Click su riga: espansione inline con dettaglio completo delle modifiche (campo, valore precedente → valore nuovo) formattato come diff
  - [ ] 5.10 Formattazione: date in "dd MMM yyyy, HH:mm", valori numerici in locale IT
  - [ ] 5.11 EmptyState se nessun risultato: "Nessuna modifica trovata per i filtri selezionati"
- [ ] Task 6: Accesso Admin-Only (AC: #2)
  - [ ] 6.1 La route `/settings/audit-log/` e accessibile solo al ruolo Admin
  - [ ] 6.2 Implementare check RBAC nella page.tsx: se non Admin, redirect a dashboard o mostrare EmptyState variante `permission`
  - [ ] 6.3 La voce "Audit Log" nella sidebar e visibile solo per Admin
  - [ ] 6.4 Le Server Actions di lettura audit verificano il ruolo Admin prima di ritornare dati
- [ ] Task 7: Dashboard Metriche Tenant (AC: #3, #4)
  - [ ] 7.1 Creare `src/app/(dashboard)/settings/metrics/page.tsx` come pagina metriche (Admin-only)
  - [ ] 7.2 Creare `src/app/(dashboard)/settings/metrics/loading.tsx` con skeleton
  - [ ] 7.3 Creare `src/app/(dashboard)/settings/metrics/components/TenantMetricsDashboard.tsx` con:
    - KPICard per metriche aggregate: totale tenant attivi, totale veicoli, totale utenti, storage totale
    - Tabella per-tenant con: nome tenant, veicoli, utenti attivi, query count (ultimo mese), storage
    - Grafico trend query count e storage per gli ultimi 6 mesi (Recharts via shadcn/ui Charts)
  - [ ] 7.4 Indicatori capacity planning:
    - Percentuale utilizzo: veicoli totali / 10.000 (target NFR14: 20 tenant x 500 veicoli)
    - Alert se un tenant supera 500 veicoli (warning) o se il totale supera 8.000 (80% capacita)
    - Proiezione crescita basata su trend ultimi 3 mesi
  - [ ] 7.5 Formattazione: storage in MB/GB con conversione automatica, numeri in locale IT
- [ ] Task 8: Logica Raccolta Metriche (AC: #3, #4)
  - [ ] 8.1 Creare `src/lib/services/metrics-service.ts` con:
    - `collectDailyMetrics(tenantId: string): Promise<void>` — raccoglie e salva le metriche giornaliere per un tenant
    - `getTenantMetrics(tenantId: string, period: DateRange): Promise<TenantMetrics[]>` — recupera le metriche per un periodo
    - `getAllTenantsMetrics(period: DateRange): Promise<TenantMetricsSummary[]>` — aggregazione cross-tenant per Admin
  - [ ] 8.2 Conteggio veicoli attivi: `prisma.vehicle.count({ where: { tenantId, status: "active" } })`
  - [ ] 8.3 Conteggio utenti attivi: utenti con almeno una sessione Better Auth nel giorno corrente
  - [ ] 8.4 Stima storage: conteggio righe * stima media dimensione riga per tabelle principali (vehicles, fuelRecords, kmReadings, auditLogs)
  - [ ] 8.5 Query count: incrementare un contatore nel TenantMetrics ad ogni query significativa (opzionale — puo essere implementato come Prisma middleware o sampling)
  - [ ] 8.6 Creare un endpoint/cron job che esegue `collectDailyMetrics` per tutti i tenant (eseguibile via API route o script esterno)
- [ ] Task 9: Immutabilita Dati Audit (AC: #5)
  - [ ] 9.1 Il modello AuditLog NON ha funzioni update/delete nel service
  - [ ] 9.2 Aggiungere policy RLS SQL Server per la tabella AuditLogs: `DENY UPDATE, DELETE ON AuditLogs` per il ruolo applicativo
  - [ ] 9.3 Aggiungere commento nel schema Prisma: `/// @audit Tabella immutabile — solo INSERT consentito`
  - [ ] 9.4 Nella UI: nessun bottone modifica/elimina sulle righe dell'AuditLogTable
  - [ ] 9.5 Server Action di lettura audit (`getAuditEntries`): solo query SELECT, nessuna mutation esposta

## Dev Notes

### Stack Tecnologico e Versioni

- **Prisma 7.x**: Modelli AuditLog e TenantMetrics con adapter-mssql
- **TanStack Table + shadcn/ui DataTable**: Per AuditLogTable con filtri avanzati
- **Recharts via shadcn/ui Charts**: Per grafici trend metriche
- **Pino**: Logging strutturato di ogni audit entry

### Decisioni Architetturali Rilevanti

- **DA-1 Multi-Tenant**: `tenantId` su AuditLog e TenantMetrics, filtrato automaticamente dal Prisma client extension
- **AC-2 Error Handling**: Server Actions ritornano `ActionResult<T>` per lettura audit
- **ID-4 Logging**: Ogni audit entry loggata con Pino a livello `info`
- **AS-4 RLS**: Policy SQL Server DENY UPDATE/DELETE su tabella AuditLogs
- **AS-2 RBAC**: Solo Admin accede ad audit log e metriche tenant

### Struttura Directory

```
src/
├── app/(dashboard)/settings/
│   ├── audit-log/
│   │   ├── page.tsx                      # Pagina audit log (Admin-only, RSC)
│   │   ├── loading.tsx                   # Skeleton DataTable
│   │   └── components/
│   │       └── AuditLogTable.tsx          # DataTable con filtri avanzati
│   └── metrics/
│       ├── page.tsx                       # Pagina metriche tenant (Admin-only)
│       ├── loading.tsx                    # Skeleton
│       └── components/
│           └── TenantMetricsDashboard.tsx  # Dashboard metriche con KPI + tabella + grafico
├── lib/services/
│   ├── audit-service.ts                   # createAuditEntry, getAuditEntries, diffObjects
│   └── metrics-service.ts                # collectDailyMetrics, getTenantMetrics
├── types/
│   └── audit.ts                           # AuditAction, AuditEntry, Change types
└── prisma/
    ├── schema.prisma                      # + modelli AuditLog, TenantMetrics
    └── sql/
        └── rls-policies.sql               # + DENY UPDATE/DELETE su AuditLogs
```

### AuditAction Type — Valori Ammessi

```typescript
type AuditAction =
  | "vehicle.created" | "vehicle.updated" | "vehicle.deleted"
  | "fuel_record.created" | "fuel_record.updated" | "fuel_record.deleted"
  | "km_reading.created" | "km_reading.updated"
  | "emission_factor.created" | "emission_factor.updated"
  | "contract.created" | "contract.updated" | "contract.deleted"
  | "employee.created" | "employee.updated" | "employee.deleted"
```

### AuditEntry — Schema Completo

```typescript
type AuditEntry = {
  id: string
  action: AuditAction
  entityType: string
  entityId: string
  tenantId: string
  userId: string
  userName: string
  timestamp: Date
  changes: Change[]
  metadata?: Record<string, unknown>
}

type Change = {
  field: string
  old: unknown
  new: unknown
}
```

### Esempio Audit Entry

```json
{
  "id": "clx1234...",
  "action": "fuel_record.updated",
  "entityType": "FuelRecord",
  "entityId": "clx5678...",
  "tenantId": "clxabc...",
  "userId": "clxdef...",
  "userName": "Marco Rossi",
  "timestamp": "2026-02-08T10:30:00.000Z",
  "changes": [
    { "field": "quantity", "old": 45.0, "new": 47.2 },
    { "field": "amount", "old": 67.50, "new": 70.80 }
  ],
  "metadata": { "source": "manual_edit", "reason": "Correzione fattura" }
}
```

### diffObjects Helper

```typescript
function diffObjects(
  oldObj: Record<string, unknown>,
  newObj: Record<string, unknown>
): Change[] {
  const changes: Change[] = []
  const allKeys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)])

  for (const key of allKeys) {
    if (JSON.stringify(oldObj[key]) !== JSON.stringify(newObj[key])) {
      changes.push({ field: key, old: oldObj[key], new: newObj[key] })
    }
  }

  return changes
}
```

### Capacity Planning — Soglie

| Metrica | Target (NFR14) | Warning (80%) | Critico (100%) |
|---|---|---|---|
| Tenant attivi | 20 | 16 | 20 |
| Veicoli per tenant | 500 | 400 | 500 |
| Veicoli totali | 10.000 | 8.000 | 10.000 |
| Storage per tenant | TBD | TBD | TBD |

### Performance Considerazioni

- L'audit table cresce linearmente: ~10 entries/giorno per tenant attivo (CRUD normali), fino a migliaia durante import CSV
- Indice composto `(tenantId, timestamp)` e critico per le query di lettura con filtro per periodo
- Il fire-and-forget per la creazione dell'audit entry evita di rallentare le operazioni CRUD
- La raccolta metriche giornaliera e un batch job leggero, non real-time
- Per flotte mature (3+ anni di storico), la tabella AuditLogs puo raggiungere milioni di righe — paginazione obbligatoria, mai caricare tutto

### RLS Policy SQL Server — AuditLogs

```sql
-- Impedire UPDATE e DELETE sulla tabella AuditLogs
DENY UPDATE ON dbo.AuditLogs TO [greenfleet_app_role];
DENY DELETE ON dbo.AuditLogs TO [greenfleet_app_role];
-- Solo INSERT e SELECT consentiti
GRANT INSERT, SELECT ON dbo.AuditLogs TO [greenfleet_app_role];
```

### Anti-Pattern da Evitare

- NON esporre funzioni update/delete per AuditLog — solo create e read
- NON bloccare la risposta all'utente per scrivere l'audit entry — fire-and-forget con error logging
- NON duplicare la logica audit in ogni Server Action — centralizzare in audit-service
- NON loggare dati sensibili nel campo changes (es. password) — filtrare campi sensibili prima di diffObjects
- NON caricare tutte le audit entries senza paginazione — performance critica su dataset grandi
- NON dare accesso al Fleet Manager all'audit trail completo — solo Admin

### Dipendenze da altre Story

- **Story 1.1 (Scaffold)**: Prisma schema base deve esistere per aggiungere modelli
- **Story 1.3 (RLS)**: Le policy RLS devono essere estese per includere AuditLogs
- **Story 1.4 (RBAC)**: Il sistema di ruoli deve essere funzionante per enforce Admin-only
- **Story 5.1/5.3 (Rifornimenti/Km)**: I service esistenti devono essere integrati con chiamate audit
- **Story 6.1 (Fattori Emissione)**: Il service fattori emissione deve essere integrato con audit
- **Story 7.3 (Design System)**: KPICard, StatusBadge, EmptyState per la UI audit e metriche

### References

- [Source: architecture.md#Communication Patterns] — AuditAction, AuditEntry type definitions
- [Source: architecture.md#AS-4] — Row-Level Security SQL Server
- [Source: architecture.md#ID-4] — Pino logging strutturato
- [Source: architecture.md#DA-1] — Modello multi-tenant con tenantId
- [Source: architecture.md#Enforcement Guidelines] — "Scrivere audit entries per ogni modifica a dati emission-impacting"
- [Source: ux-design-specification.md#Data Display Patterns] — DataTable standard con filtri
- [Source: epics.md#Story 7.4] — Acceptance criteria BDD
- [Source: prd.md#NFR10] — Audit trail: chi, quando, valore precedente, valore nuovo
- [Source: prd.md#NFR14] — 20 tenant x 500 veicoli senza re-architettura
- [Source: prd.md#NFR17] — Metriche per-tenant per capacity planning
