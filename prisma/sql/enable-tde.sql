-- =============================================================================
-- Greenfleet TDE (Transparent Data Encryption) — Cifratura dati a riposo
-- =============================================================================
--
-- PREREQUISITI:
--   SQL Server Enterprise o Developer edition (Express NON supporta TDE)
--
-- ALTERNATIVE per SQL Server Express:
--   - Cifratura volume Docker (LUKS/dm-crypt su Linux)
--   - Always Encrypted per colonne sensibili (supportato in Express)
--   - Cifratura a livello applicativo per dati GDPR (dati personali Driver)
--
-- BACKUP:
--   Dopo aver abilitato TDE, fare backup del certificato e della master key.
--   Senza il certificato, i backup NON possono essere ripristinati.
--
-- NOTA GDPR:
--   I dati personali dei Driver (nome, email, documenti) richiedono
--   cifratura at-rest come requisito normativo GDPR.
-- =============================================================================

-- 1. Creare master key nel database master
USE master;
GO

IF NOT EXISTS (SELECT * FROM sys.symmetric_keys WHERE name = '##MS_DatabaseMasterKey##')
BEGIN
    CREATE MASTER KEY ENCRYPTION BY PASSWORD = 'CHANGE-THIS-STRONG-PASSWORD-IN-PRODUCTION!';
END
GO

-- 2. Creare certificato per TDE
IF NOT EXISTS (SELECT * FROM sys.certificates WHERE name = 'GreenfleetTDECert')
BEGIN
    CREATE CERTIFICATE GreenfleetTDECert
    WITH SUBJECT = 'Greenfleet TDE Certificate';
END
GO

-- 3. Backup del certificato (CRITICO — conservare in luogo sicuro)
-- BACKUP CERTIFICATE GreenfleetTDECert
-- TO FILE = '/var/opt/mssql/backup/GreenfleetTDECert.cer'
-- WITH PRIVATE KEY (
--     FILE = '/var/opt/mssql/backup/GreenfleetTDECert.pvk',
--     ENCRYPTION BY PASSWORD = 'CHANGE-THIS-BACKUP-PASSWORD!'
-- );
-- GO

-- 4. Abilitare TDE sul database Greenfleet
USE GREENFLEET;
GO

IF NOT EXISTS (SELECT * FROM sys.dm_database_encryption_keys WHERE database_id = DB_ID())
BEGIN
    CREATE DATABASE ENCRYPTION KEY
    WITH ALGORITHM = AES_256
    ENCRYPTION BY SERVER CERTIFICATE GreenfleetTDECert;
END
GO

ALTER DATABASE GREENFLEET SET ENCRYPTION ON;
GO

-- 5. Verificare stato TDE
-- SELECT db.name, dek.encryption_state, dek.key_algorithm, dek.key_length
-- FROM sys.dm_database_encryption_keys dek
-- JOIN sys.databases db ON dek.database_id = db.database_id;
