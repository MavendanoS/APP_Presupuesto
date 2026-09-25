-- ============================================================================
-- Migración 006: endurecimiento de seguridad (v4.0.1)
-- Fecha: 2026-09-25
--
-- 1. password_reset_tokens: se versiona la tabla (existía en producción pero
--    no en el repositorio). Desde esta versión la columna `token` guarda el
--    hash SHA-256 del token, no el token en claro.
-- 2. users.password_changed_at: permite revocar los JWT emitidos antes de un
--    cambio o reset de contraseña.
-- 3. rate_limits: contadores de rate limiting compartidos entre instancias.
-- 4. Normaliza iconos de servicios sin prefijo "bi-".
--
-- ⚠️ Ejecutar ANTES de desplegar el backend v4.0.1: el middleware de
--    autenticación lee users.password_changed_at en cada request.
--
-- La sentencia ALTER TABLE (paso 2) no es idempotente. Si la migración falla
-- con "duplicate column name: password_changed_at", la columna ya existe y
-- el resto de sentencias pueden ejecutarse por separado.
-- ============================================================================

-- 1. Tokens de recuperación de contraseña
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL,
  token       TEXT    NOT NULL UNIQUE,   -- SHA-256 hex del token enviado por email
  expires_at  INTEGER NOT NULL,          -- unix seconds
  used        INTEGER NOT NULL DEFAULT 0,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user
  ON password_reset_tokens(user_id);

-- Los tokens pendientes se guardaron en claro: invalidarlos
UPDATE password_reset_tokens SET used = 1 WHERE used = 0;

-- 3. Rate limiting
CREATE TABLE IF NOT EXISTS rate_limits (
  key           TEXT    PRIMARY KEY,     -- "<bucket>:<ip>"
  window_start  INTEGER NOT NULL,        -- unix seconds
  count         INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_window_start
  ON rate_limits(window_start);

-- 4. Iconos sin prefijo (ej: 'credit-card' → 'bi-credit-card')
UPDATE payment_services
SET icon = 'bi-' || icon
WHERE icon IS NOT NULL AND icon NOT LIKE 'bi-%';

-- 2. Revocación de sesiones (último: única sentencia no idempotente)
ALTER TABLE users ADD COLUMN password_changed_at INTEGER DEFAULT NULL;
