-- Migración: Módulo de Ingresos (modelo simple)
-- Fecha: 2026-04-28
-- Descripción: Tabla para registrar ingresos mensuales sin catálogo de fuentes.
--              Cada registro es independiente: descripción libre + monto + mes.
--              Pensado para sueldo + bonos ocasionales.

-- Tabla: monthly_incomes
CREATE TABLE IF NOT EXISTS monthly_incomes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  description TEXT NOT NULL,
  amount REAL NOT NULL CHECK(amount > 0),
  year_month TEXT NOT NULL,                -- formato YYYY-MM
  received_date DATE,                       -- fecha en que se recibió (opcional)
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Índices para mejorar rendimiento de consultas frecuentes
CREATE INDEX IF NOT EXISTS idx_monthly_incomes_user
  ON monthly_incomes(user_id);

CREATE INDEX IF NOT EXISTS idx_monthly_incomes_user_month
  ON monthly_incomes(user_id, year_month);

CREATE INDEX IF NOT EXISTS idx_monthly_incomes_year_month
  ON monthly_incomes(year_month);
