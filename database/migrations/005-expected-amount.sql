-- ============================================================================
-- Migración 005: monto esperado manual por servicio
-- Fecha: 2026-04-07 (formalizada 2026-09-25)
--
-- El código de v4 (commit 3b1c612) usa payment_services.expected_amount, pero
-- el cambio de esquema nunca quedó versionado en el repositorio.
--
-- ⚠️ ALTER TABLE ADD COLUMN no es idempotente en SQLite.
--    Ejecutar SOLO si la columna no existe. Para verificarlo:
--
--    npx wrangler d1 execute gastos-db --remote \
--      --command "SELECT name FROM pragma_table_info('payment_services') WHERE name = 'expected_amount'"
--
--    Si devuelve una fila, la columna ya existe: NO ejecutar este archivo.
-- ============================================================================

ALTER TABLE payment_services ADD COLUMN expected_amount REAL DEFAULT NULL;
