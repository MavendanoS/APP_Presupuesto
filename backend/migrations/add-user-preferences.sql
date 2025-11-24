-- Migration: Add user preferences (language and currency)
-- Date: 2025-11-24
-- Description: Add language (es/en) and currency (CLP/USD) preferences to users table

-- Add language column (default: Spanish)
ALTER TABLE users ADD COLUMN language TEXT DEFAULT 'es' CHECK(language IN ('es', 'en'));

-- Add currency column (default: Chilean Peso)
ALTER TABLE users ADD COLUMN currency TEXT DEFAULT 'CLP' CHECK(currency IN ('CLP', 'USD'));

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_users_language ON users(language);
CREATE INDEX IF NOT EXISTS idx_users_currency ON users(currency);

-- Verify migration
SELECT 'Migration completed successfully' AS status;
