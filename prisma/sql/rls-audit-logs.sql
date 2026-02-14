-- Impedire UPDATE e DELETE sulla tabella AuditLogs
-- Solo INSERT e SELECT consentiti per garantire immutabilita del trail
DENY UPDATE ON dbo.AuditLogs TO [greenfleet_app_role];
DENY DELETE ON dbo.AuditLogs TO [greenfleet_app_role];
GRANT INSERT, SELECT ON dbo.AuditLogs TO [greenfleet_app_role];
