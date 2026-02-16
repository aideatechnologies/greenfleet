# Story 1.3: Isolamento Dati Tenant e RLS

Status: ready-for-dev

## Story

As a **Admin**,
I want **la garanzia che nessun dato sia accessibile tra tenant diversi**,
So that **ogni azienda operi in completo isolamento e sicurezza**.

## Acceptance Criteria

1. Due o piu tenant esistenti con dati propri: zero dati cross-tenant sono visibili o accessibili da qualsiasi query, API o report (NFR6)
2. Row-Level Security SQL Server e configurata con SESSION_CONTEXT come seconda linea di difesa per isolamento tenant (NFR13)
3. Esistono test automatici di leak detection che verificano l'isolamento su query dirette, Server Actions e report
4. I dati a riposo (database, backup) sono cifrati (NFR8)
5. La doppia protezione (Prisma client extension + RLS) e verificata: anche bypassando il filtro applicativo, RLS blocca l'accesso cross-tenant
6. Il SESSION_CONTEXT viene impostato ad ogni request prima di qualsiasi operazione sul database

## Tasks / Subtasks

- [ ] Task 1: Creare file SQL con RLS policies per SQL Server (AC: #2, #6)
  - [ ] 1.1 Creare `prisma/sql/rls-policies.sql` con le seguenti policy:
    - Creare una funzione predicato `rls.fn_tenant_access_predicate(@tenantId NVARCHAR(36))` che confronta `@tenantId` con `CAST(SESSION_CONTEXT(N'tenantId') AS NVARCHAR(36))`
    - Creare una security policy per ogni tabella multi-tenant: `Vehicles`, `Contracts`, `Employees`, `FuelRecords`, `KmReadings`, `Documents`, `Carlists`, `AuditEntries` (tutte le tabelle con colonna `tenant_id`)
    - Ogni policy applica FILTER PREDICATE (blocca lettura) e BLOCK PREDICATE (blocca insert/update/delete con tenantId diverso)
    - Le tabelle globali (catalogo veicoli InfocarData, fattori emissione, utenti/sessioni Better Auth) NON hanno RLS
  - [ ] 1.2 Creare lo schema `rls` nel database per contenere la funzione predicato
  - [ ] 1.3 Aggiungere commenti SQL che spiegano la strategia di defense-in-depth (Prisma extension = prima linea, RLS = seconda linea)
  - [ ] 1.4 Aggiungere script di rollback per rimuovere le policy in caso di necessita
  - [ ] 1.5 Documentare nel file SQL che le policy vanno applicate DOPO le migrazioni Prisma (Prisma Migrate non gestisce RLS)

- [ ] Task 2: Creare helper rls-context.ts per impostare SESSION_CONTEXT (AC: #2, #6)
  - [ ] 2.1 Creare `src/lib/db/rls-context.ts` con funzione `setTenantContext(tenantId: string): Promise<void>`
    - Esegue `EXEC sp_set_session_context @key = N'tenantId', @value = @tenantId, @read_only = 1` tramite Prisma `$executeRawUnsafe` o `$executeRaw`
    - Il flag `@read_only = 1` impedisce che il tenantId venga modificato durante la sessione/transazione
    - Se `tenantId` e vuoto o undefined, lancia un errore esplicito (mai impostare SESSION_CONTEXT vuoto)
  - [ ] 2.2 Creare funzione `clearTenantContext(): Promise<void>` per reset (usata nei test e in caso di utente Admin cross-tenant)
  - [ ] 2.3 Gestire il caso Admin (super-admin cross-tenant): l'Admin puo operare su tenant specifici impostando il context del tenant target, oppure senza RLS per operazioni globali
  - [ ] 2.4 Aggiungere logging (Pino) per tracciare ogni impostazione di SESSION_CONTEXT con tenantId e userId

- [ ] Task 3: Integrare il setting del RLS context nel flusso request (AC: #6)
  - [ ] 3.1 Modificare `src/middleware.ts` (o il layer che inietta il tenant nel Prisma client) per invocare `setTenantContext(tenantId)` PRIMA di qualsiasi operazione Prisma
  - [ ] 3.2 Assicurarsi che il flusso sia: Request → Middleware auth → Extract tenantId da sessione Better Auth → Set Prisma client extension filter → Set SQL Server SESSION_CONTEXT → Operazione DB
  - [ ] 3.3 Gestire il caso in cui la sessione non ha un tenant attivo (utente appena registrato, Admin senza org selezionata): bloccare l'accesso alle route (dashboard) con redirect o errore appropriato
  - [ ] 3.4 Verificare che il SESSION_CONTEXT sia impostato per-connection e non persista tra request diverse (importante con connection pooling)

- [ ] Task 4: Scrivere test di leak detection (AC: #1, #3, #5)
  - [ ] 4.1 Creare `src/lib/db/__tests__/tenant-isolation.test.ts` con Vitest
  - [ ] 4.2 Test: creare 2 tenant (A e B) con dati propri. Eseguire query come Tenant A e verificare che zero risultati del Tenant B siano visibili
  - [ ] 4.3 Test: tentare INSERT con tenantId diverso dal SESSION_CONTEXT — deve fallire per la BLOCK PREDICATE RLS
  - [ ] 4.4 Test: tentare UPDATE di un record del Tenant B mentre SESSION_CONTEXT e impostato su Tenant A — deve fallire
  - [ ] 4.5 Test: tentare DELETE di un record del Tenant B mentre SESSION_CONTEXT e impostato su Tenant A — deve fallire
  - [ ] 4.6 Test: verificare che la Prisma client extension (prima linea) filtra correttamente senza bisogno di RLS
  - [ ] 4.7 Test: verificare che RLS (seconda linea) blocca anche se si usa `$queryRaw` o `$executeRaw` che bypassano la Prisma extension
  - [ ] 4.8 Test: verificare che senza SESSION_CONTEXT impostato, nessuna riga multi-tenant e accessibile (fail-closed, non fail-open)
  - [ ] 4.9 Test: verificare isolamento su aggregazioni (COUNT, SUM) — le funzioni aggregate non devono includere dati di altri tenant

- [ ] Task 5: Verificare configurazione cifratura dati a riposo (AC: #4)
  - [ ] 5.1 Verificare che SQL Server 2022 in Docker ha Transparent Data Encryption (TDE) abilitato o documentare la configurazione necessaria
  - [ ] 5.2 Se TDE non e disponibile nell'edizione Developer/Express, documentare l'alternativa: cifratura volume Docker (LUKS/dm-crypt su Linux) o cifratura a livello applicativo per i campi sensibili
  - [ ] 5.3 Creare script `prisma/sql/enable-tde.sql` con i comandi per abilitare TDE sul database (se disponibile nell'edizione)
  - [ ] 5.4 Verificare che i backup SQL Server siano cifrati (BACKUP DATABASE ... WITH ENCRYPTION) o documentare la configurazione
  - [ ] 5.5 Aggiungere una nota nella documentazione: i dati personali dei Driver (GDPR) richiedono cifratura at-rest come requisito normativo

- [ ] Task 6: Test di integrazione Prisma extension + RLS (doppia protezione) (AC: #5)
  - [ ] 6.1 Creare `src/lib/db/__tests__/double-protection.test.ts`
  - [ ] 6.2 Test: con Prisma extension attiva e RLS attiva, query normale ritorna solo dati del tenant corretto
  - [ ] 6.3 Test: simulare un bug nella Prisma extension (query raw senza filtro) e verificare che RLS comunque blocca
  - [ ] 6.4 Test: con SESSION_CONTEXT impostato su Tenant A, eseguire `prisma.$queryRaw('SELECT * FROM Vehicles')` e verificare che ritorna solo veicoli del Tenant A (grazie a RLS, anche senza WHERE applicativo)
  - [ ] 6.5 Test: verificare che l'Admin con contesto globale puo accedere a dati di piu tenant quando necessario (con gestione appropriata del SESSION_CONTEXT)

## Dev Notes

### SQL Server RLS — Sintassi e Concetti

Row-Level Security (RLS) in SQL Server funziona con 3 elementi:

1. **Funzione predicato (predicate function):** una inline table-valued function che ritorna 1 (accesso permesso) o 0 (accesso negato)
2. **Security policy:** associa la funzione predicato a una o piu tabelle
3. **SESSION_CONTEXT:** meccanismo per passare valori dalla connessione applicativa al motore RLS

```sql
-- 1. Creare schema per le funzioni RLS
CREATE SCHEMA rls;
GO

-- 2. Funzione predicato
CREATE FUNCTION rls.fn_tenant_access_predicate(@tenantId NVARCHAR(36))
RETURNS TABLE
WITH SCHEMABINDING
AS
RETURN SELECT 1 AS fn_result
WHERE @tenantId = CAST(SESSION_CONTEXT(N'tenantId') AS NVARCHAR(36))
   OR SESSION_CONTEXT(N'tenantId') IS NULL; -- Admin/system: se non impostato, vede tutto
GO

-- Nota sulla riga "OR SESSION_CONTEXT IS NULL":
-- DECISIONE CRITICA: fail-open vs fail-closed
-- fail-open (IS NULL → accesso): piu semplice per Admin, ma rischioso se si dimentica di impostare il context
-- fail-closed (IS NULL → negato): piu sicuro, richiede gestione esplicita per Admin
-- RACCOMANDAZIONE: fail-closed in produzione. Il predicato sopra e fail-open per semplicita dev iniziale.
-- In produzione cambiare a:
-- WHERE @tenantId = CAST(SESSION_CONTEXT(N'tenantId') AS NVARCHAR(36))

-- 3. Security policy per una tabella
CREATE SECURITY POLICY rls.VehiclesPolicy
ADD FILTER PREDICATE rls.fn_tenant_access_predicate(tenant_id) ON dbo.Vehicles,
ADD BLOCK PREDICATE rls.fn_tenant_access_predicate(tenant_id) ON dbo.Vehicles
WITH (STATE = ON);
GO
```

### SESSION_CONTEXT — Come Funziona

`SESSION_CONTEXT` e un key-value store per-sessione in SQL Server. Si imposta con `sp_set_session_context` e si legge con `SESSION_CONTEXT(N'key')`.

```typescript
// src/lib/db/rls-context.ts — pattern di implementazione
import { PrismaClient } from '../../generated/prisma'

export async function setTenantContext(prisma: PrismaClient, tenantId: string): Promise<void> {
  if (!tenantId) {
    throw new Error('tenantId is required for RLS context')
  }
  await prisma.$executeRaw`
    EXEC sp_set_session_context @key = N'tenantId', @value = ${tenantId}, @read_only = 1
  `
}
```

**Attenzione al connection pooling:** Il SESSION_CONTEXT e legato alla connessione SQL Server, non alla request HTTP. Con Prisma + connection pool:
- Ogni `$transaction` usa una singola connessione → il SESSION_CONTEXT e coerente dentro la transazione
- Fuori da una transazione, Prisma puo usare connessioni diverse → il SESSION_CONTEXT va impostato ad ogni operazione o dentro un `$transaction` wrapper
- Pattern raccomandato: wrappare le operazioni critiche in `prisma.$transaction(async (tx) => { await setTenantContext(tx, tenantId); ... })` per garantire coerenza

### Tabelle Multi-Tenant vs Globali

**Tabelle con RLS (hanno tenant_id):**
- `Vehicles` (veicoli operativi del tenant)
- `Employees`
- `Contracts`
- `FuelRecords`
- `KmReadings`
- `Documents`
- `Carlists`
- `CarlistVehicles`
- `AuditEntries`
- `EmissionTargets`

**Tabelle SENZA RLS (globali):**
- `CatalogVehicles` (catalogo InfocarData, condiviso)
- `CatalogEngines` (motori catalogo, condivisi)
- `EmissionFactors` (fattori emissione ISPRA/DEFRA, globali)
- `User`, `Session`, `Account`, `Verification` (Better Auth, la separazione tenant e gestita da organization membership)
- `Organization`, `Member` (Better Auth organization plugin)
- `FeatureToggle` (configurazione per tenant, ma gestita solo da Admin)

### Strategia di Test — Leak Detection

L'approccio di test prevede 3 livelli:

1. **Unit test del predicato SQL:** verificare la funzione `fn_tenant_access_predicate` con valori diversi di SESSION_CONTEXT
2. **Integration test Prisma + RLS:** creare tenant di test, inserire dati, verificare isolamento via Prisma client
3. **E2E test API:** chiamare endpoint API con autenticazione di tenant diversi e verificare che le response non contengano dati cross-tenant

Per i test di integrazione, serve un'istanza SQL Server di test con RLS policies applicate. Si puo usare lo stesso container Docker del dev.

```typescript
// Pattern test leak detection
describe('Tenant Isolation', () => {
  const TENANT_A = 'tenant-a-uuid'
  const TENANT_B = 'tenant-b-uuid'

  beforeAll(async () => {
    // Setup: creare dati per entrambi i tenant
    await seedTenantData(TENANT_A, { vehicles: 5, employees: 3 })
    await seedTenantData(TENANT_B, { vehicles: 3, employees: 2 })
  })

  it('should return zero cross-tenant results on SELECT', async () => {
    await setTenantContext(prisma, TENANT_A)
    const vehicles = await prisma.vehicle.findMany()
    // Tutti i veicoli devono appartenere al Tenant A
    expect(vehicles.every(v => v.tenantId === TENANT_A)).toBe(true)
    expect(vehicles.some(v => v.tenantId === TENANT_B)).toBe(false)
  })

  it('should block cross-tenant INSERT via RLS', async () => {
    await setTenantContext(prisma, TENANT_A)
    // Tentare di inserire con tenantId di B → deve fallire
    await expect(
      prisma.$executeRaw`INSERT INTO Vehicles (id, tenant_id, ...) VALUES (NEWID(), ${TENANT_B}, ...)`
    ).rejects.toThrow()
  })

  it('should block access when SESSION_CONTEXT is not set (fail-closed)', async () => {
    // Nessun SESSION_CONTEXT impostato
    const vehicles = await prisma.$queryRaw`SELECT * FROM Vehicles`
    expect(vehicles).toHaveLength(0) // fail-closed: nessuna riga visibile
  })
})
```

### Cifratura Dati a Riposo (NFR8)

SQL Server 2022 Developer Edition supporta Transparent Data Encryption (TDE). Per abilitarlo:

```sql
-- Creare master key nel database master
USE master;
CREATE MASTER KEY ENCRYPTION BY PASSWORD = 'StrongPassword!123';

-- Creare certificato
CREATE CERTIFICATE GreenfleetTDECert WITH SUBJECT = 'Greenfleet TDE Certificate';

-- Abilitare TDE sul database
USE Greenfleet;
CREATE DATABASE ENCRYPTION KEY WITH ALGORITHM = AES_256
ENCRYPTION BY SERVER CERTIFICATE GreenfleetTDECert;
ALTER DATABASE Greenfleet SET ENCRYPTION ON;
```

**Nota:** SQL Server Express NON supporta TDE. Se si usa Express, le alternative sono:
- Cifratura del volume Docker con LUKS (Linux)
- Cifratura a livello applicativo per i campi sensibili (dati personali Driver per GDPR)
- Always Encrypted per colonne specifiche (supportato anche in Express)

### Impatto Performance RLS

L'impatto di RLS e minimo se gli indici includono `tenant_id`:
- Assicurarsi che tutte le tabelle multi-tenant abbiano un indice su `(tenant_id)` o un indice composito che inizia con `tenant_id`
- Il query optimizer di SQL Server integra il predicato RLS nel piano di esecuzione
- Non c'e overhead significativo se gli indici sono corretti

### Anti-Pattern da Evitare

- **NON** disabilitare RLS per "semplificare" il codice — e una linea di difesa critica
- **NON** usare `EXECUTE AS` o `SUSER_NAME()` per il filtro tenant — usare SESSION_CONTEXT che e piu flessibile
- **NON** passare tenantId come parametro URL o query string — estrarre SEMPRE dalla sessione Better Auth
- **NON** creare una policy RLS fail-open in produzione (dove SESSION_CONTEXT NULL = accesso a tutto)
- **NON** dimenticare di applicare le RLS policies dopo ogni migrazione Prisma che aggiunge nuove tabelle multi-tenant
- **NON** usare `@read_only = 0` in `sp_set_session_context` — sempre `@read_only = 1` per prevenire modifiche del contesto a runtime

### Dipendenze da Story Precedenti

- **Story 1.1:** Scaffold progetto, Prisma client, middleware base
- **Story 1.2:** Schema multi-tenant con `tenantId` su tutte le entita, Prisma client extension per auto-filter, Better Auth organization plugin — tutto questo deve essere in place prima di implementare RLS

### References

- [Source: architecture.md#AS-4] — RLS SQL Server con SESSION_CONTEXT come seconda linea di difesa
- [Source: architecture.md#DA-1] — Modello multi-tenant con tenantId pervasivo
- [Source: architecture.md#Tenant Context Injection Flow] — Request → Middleware → Extract tenantId → SET SESSION_CONTEXT → RLS
- [Source: architecture.md#Project Structure] — `prisma/sql/rls-policies.sql`, `src/lib/db/rls-context.ts`
- [Source: epics.md#Story 1.3] — Acceptance criteria BDD
- [Source: prd.md#NFR6] — Zero data leak tra tenant
- [Source: prd.md#NFR8] — Cifratura dati a riposo
- [Source: prd.md#NFR13] — RLS SQL Server come seconda linea di difesa

## Dev Agent Record

### Agent Model Used



### Debug Log References

### Completion Notes List

### File List

