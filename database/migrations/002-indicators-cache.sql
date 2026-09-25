-- Tabla para cachear indicadores económicos
-- Permite mostrar valores del día anterior si la API falla

CREATE TABLE IF NOT EXISTS indicators_cache (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  indicator_name TEXT NOT NULL UNIQUE, -- 'dolar' o 'uf'
  value INTEGER NOT NULL,
  fecha TEXT NOT NULL,
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  CONSTRAINT valid_indicator CHECK (indicator_name IN ('dolar', 'uf'))
);

-- Índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_indicators_name ON indicators_cache(indicator_name);

-- Insertar valores iniciales (aproximados) para tener algo en caso de primera consulta
INSERT OR IGNORE INTO indicators_cache (indicator_name, value, fecha) VALUES
  ('dolar', 950, datetime('now')),
  ('uf', 39000, datetime('now'));
