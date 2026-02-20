-- Migration: Remove issuer column from fuel_cards, make supplier_id required
-- Run this BEFORE prisma db push if the table has data

-- 1. Update any NULL supplier_id rows (set to a default supplier or handle manually)
-- UPDATE [dbo].[fuel_cards] SET supplier_id = <default_supplier_id> WHERE supplier_id IS NULL;

-- 2. Make supplier_id NOT NULL
-- ALTER TABLE [dbo].[fuel_cards] ALTER COLUMN supplier_id BIGINT NOT NULL;

-- 3. Drop issuer column
-- ALTER TABLE [dbo].[fuel_cards] DROP COLUMN issuer;

-- NOTE: prisma db push will handle these changes automatically.
-- This script is for reference if manual migration is needed.
