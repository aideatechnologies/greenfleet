-- =============================================================================
-- Greenfleet RLS Rollback — Rimuove tutte le policy RLS
-- =============================================================================
-- Usare questo script per rimuovere le policy in caso di necessita.
-- Le tabelle e i dati NON vengono toccati.
-- =============================================================================

-- Drop security policies
IF EXISTS (SELECT * FROM sys.security_policies WHERE name = 'VehiclesPolicy')
    DROP SECURITY POLICY rls.VehiclesPolicy
GO

IF EXISTS (SELECT * FROM sys.security_policies WHERE name = 'EmployeesPolicy')
    DROP SECURITY POLICY rls.EmployeesPolicy
GO

IF EXISTS (SELECT * FROM sys.security_policies WHERE name = 'ContractsPolicy')
    DROP SECURITY POLICY rls.ContractsPolicy
GO

IF EXISTS (SELECT * FROM sys.security_policies WHERE name = 'FuelRecordsPolicy')
    DROP SECURITY POLICY rls.FuelRecordsPolicy
GO

IF EXISTS (SELECT * FROM sys.security_policies WHERE name = 'KmReadingsPolicy')
    DROP SECURITY POLICY rls.KmReadingsPolicy
GO

IF EXISTS (SELECT * FROM sys.security_policies WHERE name = 'DocumentsPolicy')
    DROP SECURITY POLICY rls.DocumentsPolicy
GO

IF EXISTS (SELECT * FROM sys.security_policies WHERE name = 'CarlistsPolicy')
    DROP SECURITY POLICY rls.CarlistsPolicy
GO

IF EXISTS (SELECT * FROM sys.security_policies WHERE name = 'CarlistVehiclesPolicy')
    DROP SECURITY POLICY rls.CarlistVehiclesPolicy
GO

IF EXISTS (SELECT * FROM sys.security_policies WHERE name = 'EmissionTargetsPolicy')
    DROP SECURITY POLICY rls.EmissionTargetsPolicy
GO

IF EXISTS (SELECT * FROM sys.security_policies WHERE name = 'AuditEntriesPolicy')
    DROP SECURITY POLICY rls.AuditEntriesPolicy
GO

-- Drop predicate function
IF OBJECT_ID('rls.fn_tenant_access_predicate', 'IF') IS NOT NULL
    DROP FUNCTION rls.fn_tenant_access_predicate
GO

-- Drop RLS schema (only if empty)
IF EXISTS (SELECT * FROM sys.schemas WHERE name = 'rls')
BEGIN
    EXEC('DROP SCHEMA rls')
END
GO
