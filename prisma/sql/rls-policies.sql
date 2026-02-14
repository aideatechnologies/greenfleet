-- =============================================================================
-- Greenfleet RLS Policies — Defense-in-Depth per isolamento tenant
-- =============================================================================
--
-- STRATEGIA:
--   Prima linea di difesa:  Prisma client extension (auto-filter tenantId)
--   Seconda linea di difesa: SQL Server Row-Level Security (questo file)
--
-- APPLICAZIONE:
--   Questo script va eseguito DOPO le migrazioni Prisma.
--   Ogni volta che si aggiunge una nuova tabella multi-tenant,
--   aggiungere la security policy corrispondente a questo file.
--
-- POLICY: fail-closed in produzione
--   Se SESSION_CONTEXT('tenantId') non e impostato, nessuna riga e visibile.
--   L'Admin che necessita accesso cross-tenant deve usare il base Prisma client
--   (senza RLS) oppure impostare esplicitamente il SESSION_CONTEXT.
--
-- NOTA SUL CONNECTION POOLING:
--   SESSION_CONTEXT e per-connessione. Con Prisma connection pool:
--   - Usare $transaction per garantire coerenza SESSION_CONTEXT
--   - Impostare SESSION_CONTEXT all'inizio di ogni transazione
--   - Non fare affidamento su SESSION_CONTEXT tra query separate
-- =============================================================================

-- 1. Creare schema per le funzioni RLS
IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = 'rls')
BEGIN
    EXEC('CREATE SCHEMA rls')
END
GO

-- 2. Funzione predicato — fail-closed
--    Se SESSION_CONTEXT non e impostato, ritorna 0 (nessun accesso)
IF OBJECT_ID('rls.fn_tenant_access_predicate', 'IF') IS NOT NULL
    DROP FUNCTION rls.fn_tenant_access_predicate
GO

CREATE FUNCTION rls.fn_tenant_access_predicate(@tenantId NVARCHAR(36))
RETURNS TABLE
WITH SCHEMABINDING
AS
RETURN SELECT 1 AS fn_result
WHERE @tenantId = CAST(SESSION_CONTEXT(N'tenantId') AS NVARCHAR(36))
GO

-- =============================================================================
-- 3. Security Policies per tabelle multi-tenant
-- =============================================================================
-- NOTA: Le tabelle sotto verranno create nelle Epic 2-7.
-- Applicare queste policy DOPO la creazione delle rispettive tabelle.
-- Se una tabella non esiste ancora, la policy corrispondente fallira — e normale.
-- =============================================================================

-- Tabelle multi-tenant (colonna: tenant_id mappata da Prisma @map):
-- Le tabelle usano il naming Prisma @@map("table_name") con colonna tenantId

-- Template per ogni tabella multi-tenant:
-- Decommentare quando la tabella esiste.

/*
-- vehicles (Epic 3: Story 3.3)
IF EXISTS (SELECT * FROM sys.security_policies WHERE name = 'VehiclesPolicy')
    DROP SECURITY POLICY rls.VehiclesPolicy
GO
CREATE SECURITY POLICY rls.VehiclesPolicy
ADD FILTER PREDICATE rls.fn_tenant_access_predicate(tenantId) ON dbo.vehicles,
ADD BLOCK PREDICATE rls.fn_tenant_access_predicate(tenantId) ON dbo.vehicles
WITH (STATE = ON);
GO

-- employees (Epic 3: Story 3.1)
IF EXISTS (SELECT * FROM sys.security_policies WHERE name = 'EmployeesPolicy')
    DROP SECURITY POLICY rls.EmployeesPolicy
GO
CREATE SECURITY POLICY rls.EmployeesPolicy
ADD FILTER PREDICATE rls.fn_tenant_access_predicate(tenantId) ON dbo.employees,
ADD BLOCK PREDICATE rls.fn_tenant_access_predicate(tenantId) ON dbo.employees
WITH (STATE = ON);
GO

-- contracts (Epic 4: Story 4.1)
IF EXISTS (SELECT * FROM sys.security_policies WHERE name = 'ContractsPolicy')
    DROP SECURITY POLICY rls.ContractsPolicy
GO
CREATE SECURITY POLICY rls.ContractsPolicy
ADD FILTER PREDICATE rls.fn_tenant_access_predicate(tenantId) ON dbo.contracts,
ADD BLOCK PREDICATE rls.fn_tenant_access_predicate(tenantId) ON dbo.contracts
WITH (STATE = ON);
GO

-- fuel_records (Epic 5: Story 5.1)
IF EXISTS (SELECT * FROM sys.security_policies WHERE name = 'FuelRecordsPolicy')
    DROP SECURITY POLICY rls.FuelRecordsPolicy
GO
CREATE SECURITY POLICY rls.FuelRecordsPolicy
ADD FILTER PREDICATE rls.fn_tenant_access_predicate(tenantId) ON dbo.fuel_records,
ADD BLOCK PREDICATE rls.fn_tenant_access_predicate(tenantId) ON dbo.fuel_records
WITH (STATE = ON);
GO

-- km_readings (Epic 5: Story 5.3)
IF EXISTS (SELECT * FROM sys.security_policies WHERE name = 'KmReadingsPolicy')
    DROP SECURITY POLICY rls.KmReadingsPolicy
GO
CREATE SECURITY POLICY rls.KmReadingsPolicy
ADD FILTER PREDICATE rls.fn_tenant_access_predicate(tenantId) ON dbo.km_readings,
ADD BLOCK PREDICATE rls.fn_tenant_access_predicate(tenantId) ON dbo.km_readings
WITH (STATE = ON);
GO

-- documents (Epic 3: Story 3.7)
IF EXISTS (SELECT * FROM sys.security_policies WHERE name = 'DocumentsPolicy')
    DROP SECURITY POLICY rls.DocumentsPolicy
GO
CREATE SECURITY POLICY rls.DocumentsPolicy
ADD FILTER PREDICATE rls.fn_tenant_access_predicate(tenantId) ON dbo.documents,
ADD BLOCK PREDICATE rls.fn_tenant_access_predicate(tenantId) ON dbo.documents
WITH (STATE = ON);
GO

-- carlists (Epic 3: Story 3.8)
IF EXISTS (SELECT * FROM sys.security_policies WHERE name = 'CarlistsPolicy')
    DROP SECURITY POLICY rls.CarlistsPolicy
GO
CREATE SECURITY POLICY rls.CarlistsPolicy
ADD FILTER PREDICATE rls.fn_tenant_access_predicate(tenantId) ON dbo.carlists,
ADD BLOCK PREDICATE rls.fn_tenant_access_predicate(tenantId) ON dbo.carlists
WITH (STATE = ON);
GO

-- carlist_vehicles (Epic 3: Story 3.8)
IF EXISTS (SELECT * FROM sys.security_policies WHERE name = 'CarlistVehiclesPolicy')
    DROP SECURITY POLICY rls.CarlistVehiclesPolicy
GO
CREATE SECURITY POLICY rls.CarlistVehiclesPolicy
ADD FILTER PREDICATE rls.fn_tenant_access_predicate(tenantId) ON dbo.carlist_vehicles,
ADD BLOCK PREDICATE rls.fn_tenant_access_predicate(tenantId) ON dbo.carlist_vehicles
WITH (STATE = ON);
GO

-- emission_targets (Epic 6: Story 6.3)
IF EXISTS (SELECT * FROM sys.security_policies WHERE name = 'EmissionTargetsPolicy')
    DROP SECURITY POLICY rls.EmissionTargetsPolicy
GO
CREATE SECURITY POLICY rls.EmissionTargetsPolicy
ADD FILTER PREDICATE rls.fn_tenant_access_predicate(tenantId) ON dbo.emission_targets,
ADD BLOCK PREDICATE rls.fn_tenant_access_predicate(tenantId) ON dbo.emission_targets
WITH (STATE = ON);
GO

-- audit_entries (Epic 7: Story 7.4)
IF EXISTS (SELECT * FROM sys.security_policies WHERE name = 'AuditEntriesPolicy')
    DROP SECURITY POLICY rls.AuditEntriesPolicy
GO
CREATE SECURITY POLICY rls.AuditEntriesPolicy
ADD FILTER PREDICATE rls.fn_tenant_access_predicate(tenantId) ON dbo.audit_entries,
ADD BLOCK PREDICATE rls.fn_tenant_access_predicate(tenantId) ON dbo.audit_entries
WITH (STATE = ON);
GO
*/

-- =============================================================================
-- Tabelle SENZA RLS (globali):
-- =============================================================================
-- catalog_vehicles    — catalogo InfocarData condiviso
-- catalog_engines     — motori catalogo condivisi
-- emission_factors    — fattori ISPRA/DEFRA globali
-- users               — Better Auth (isolamento via organization membership)
-- sessions            — Better Auth
-- accounts            — Better Auth
-- verifications       — Better Auth
-- organizations       — Better Auth organization plugin
-- members             — Better Auth organization plugin
-- invitations         — Better Auth organization plugin
-- =============================================================================
