-- ============================================================================
-- Esquema completo v4 para Cloudflare D1 (SQLite)
-- PWA de seguimiento de pagos e ingresos mensuales
--
-- Usar SOLO para crear una base de datos nueva (local o un entorno nuevo).
-- Es equivalente a aplicar database/migrations/001..006 sobre una base vacía,
-- sin las tablas del modelo anterior (expenses, income, expense_categories,
-- budget_limits, savings_*), que v4 ya no usa.
--
-- Para una base existente, aplicar las migraciones pendientes en orden
-- (ver database/migrations/README.md).
-- ============================================================================

-- Usuarios
CREATE TABLE IF NOT EXISTS users (
  id                   INTEGER PRIMARY KEY AUTOINCREMENT,
  email                TEXT    UNIQUE NOT NULL,
  password_hash        TEXT    NOT NULL,
  name                 TEXT    NOT NULL,
  language             TEXT    DEFAULT 'es'  CHECK(language IN ('es', 'en')),
  currency             TEXT    DEFAULT 'CLP' CHECK(currency IN ('CLP', 'USD')),
  password_changed_at  INTEGER DEFAULT NULL,   -- unix seconds; JWT anteriores quedan revocados
  created_at           DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at           DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Tokens de recuperación de contraseña (token = SHA-256 hex)
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL,
  token       TEXT    NOT NULL UNIQUE,
  expires_at  INTEGER NOT NULL,
  used        INTEGER NOT NULL DEFAULT 0,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user ON password_reset_tokens(user_id);

-- Servicios de pago del usuario (catálogo)
CREATE TABLE IF NOT EXISTS payment_services (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id          INTEGER NOT NULL,
  name             TEXT    NOT NULL,
  icon             TEXT    DEFAULT 'bi-receipt',
  color            TEXT    DEFAULT '#3B82F6',
  is_active        INTEGER DEFAULT 1,
  sort_order       INTEGER DEFAULT 0,
  expected_amount  REAL    DEFAULT NULL,
  created_at       TEXT    DEFAULT (datetime('now')),
  updated_at       TEXT    DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_payment_services_user_id     ON payment_services(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_services_user_active ON payment_services(user_id, is_active);

-- Pagos mensuales (uno por servicio y mes)
CREATE TABLE IF NOT EXISTS monthly_payments (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL,
  service_id  INTEGER NOT NULL,
  amount      REAL    NOT NULL CHECK(amount > 0),
  year_month  TEXT    NOT NULL,   -- 'YYYY-MM'
  paid_date   TEXT,               -- 'YYYY-MM-DD'
  notes       TEXT,
  created_at  TEXT    DEFAULT (datetime('now')),
  updated_at  TEXT    DEFAULT (datetime('now')),
  FOREIGN KEY (user_id)    REFERENCES users(id)            ON DELETE CASCADE,
  FOREIGN KEY (service_id) REFERENCES payment_services(id) ON DELETE CASCADE,
  UNIQUE(user_id, service_id, year_month)
);

CREATE INDEX IF NOT EXISTS idx_monthly_payments_user_id         ON monthly_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_monthly_payments_service_id      ON monthly_payments(service_id);
CREATE INDEX IF NOT EXISTS idx_monthly_payments_year_month      ON monthly_payments(year_month);
CREATE INDEX IF NOT EXISTS idx_monthly_payments_user_year_month ON monthly_payments(user_id, year_month);

-- Ingresos mensuales (descripción libre + monto + mes)
CREATE TABLE IF NOT EXISTS monthly_incomes (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id        INTEGER NOT NULL,
  description    TEXT    NOT NULL,
  amount         REAL    NOT NULL CHECK(amount > 0),
  year_month     TEXT    NOT NULL,   -- 'YYYY-MM'
  received_date  DATE,               -- 'YYYY-MM-DD'
  notes          TEXT,
  created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_monthly_incomes_user       ON monthly_incomes(user_id);
CREATE INDEX IF NOT EXISTS idx_monthly_incomes_user_month ON monthly_incomes(user_id, year_month);
CREATE INDEX IF NOT EXISTS idx_monthly_incomes_year_month ON monthly_incomes(year_month);

-- Caché de indicadores económicos (dólar y UF)
CREATE TABLE IF NOT EXISTS indicators_cache (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  indicator_name  TEXT    NOT NULL UNIQUE,
  value           INTEGER NOT NULL,
  fecha           TEXT    NOT NULL,
  updated_at      INTEGER NOT NULL DEFAULT (unixepoch()),
  CONSTRAINT valid_indicator CHECK (indicator_name IN ('dolar', 'uf'))
);

-- Rate limiting compartido entre instancias del Worker
CREATE TABLE IF NOT EXISTS rate_limits (
  key           TEXT    PRIMARY KEY,
  window_start  INTEGER NOT NULL,
  count         INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_window_start ON rate_limits(window_start);
