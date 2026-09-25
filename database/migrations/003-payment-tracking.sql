-- ============================================================================
-- Migration: 001-payment-tracking.sql
-- Purpose:   Add payment tracking tables for recurring monthly services/bills.
--
-- Tables created:
--   - payment_services:  Catalog of services/bills a user pays on a recurring
--                        basis (e.g., electricity, internet, streaming).
--   - monthly_payments:  Individual payment records tied to a specific service
--                        and month, tracking amounts, dates, and notes.
--
-- Platform: Cloudflare D1 (SQLite)
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Table: payment_services
-- Stores the list of services/bills each user tracks for monthly payments.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payment_services (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL,
  name        TEXT    NOT NULL,
  icon        TEXT    DEFAULT 'bi-receipt',
  color       TEXT    DEFAULT '#3B82F6',
  is_active   INTEGER DEFAULT 1,
  sort_order  INTEGER DEFAULT 0,
  created_at  TEXT    DEFAULT (datetime('now')),
  updated_at  TEXT    DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ---------------------------------------------------------------------------
-- Table: monthly_payments
-- Records actual payment entries per service per month.
-- The UNIQUE constraint on (user_id, service_id, year_month) ensures a user
-- can only have one payment record per service per month.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS monthly_payments (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL,
  service_id  INTEGER NOT NULL,
  amount      REAL    NOT NULL,
  year_month  TEXT    NOT NULL,       -- Format: 'YYYY-MM'
  paid_date   TEXT,                   -- ISO 8601 date when payment was made
  notes       TEXT,
  created_at  TEXT    DEFAULT (datetime('now')),
  updated_at  TEXT    DEFAULT (datetime('now')),
  FOREIGN KEY (user_id)    REFERENCES users(id)             ON DELETE CASCADE,
  FOREIGN KEY (service_id) REFERENCES payment_services(id)  ON DELETE CASCADE,
  UNIQUE(user_id, service_id, year_month)
);

-- ---------------------------------------------------------------------------
-- Indexes: payment_services
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_payment_services_user_id
  ON payment_services(user_id);

CREATE INDEX IF NOT EXISTS idx_payment_services_user_active
  ON payment_services(user_id, is_active);

-- ---------------------------------------------------------------------------
-- Indexes: monthly_payments
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_monthly_payments_user_id
  ON monthly_payments(user_id);

CREATE INDEX IF NOT EXISTS idx_monthly_payments_service_id
  ON monthly_payments(service_id);

CREATE INDEX IF NOT EXISTS idx_monthly_payments_year_month
  ON monthly_payments(year_month);

CREATE INDEX IF NOT EXISTS idx_monthly_payments_user_year_month
  ON monthly_payments(user_id, year_month);
