-- Migración para corregir categorías duplicadas
-- Problema: Al crear usuarios, se creaban categorías con user_id específico
-- en lugar de usar las categorías transversales (user_id = NULL, is_standard = 1)

-- 1. Insertar categorías estándar si no existen
INSERT OR IGNORE INTO expense_categories (user_id, name, type, color, icon, is_standard)
VALUES
  -- Pagos (payments)
  (NULL, 'Arriendo', 'payment', '#EF4444', 'home', 1),
  (NULL, 'Servicios Básicos', 'payment', '#F59E0B', 'bolt', 1),
  (NULL, 'Internet/Teléfono', 'payment', '#3B82F6', 'wifi', 1),
  (NULL, 'Transporte', 'payment', '#8B5CF6', 'car', 1),
  -- Compras (purchases)
  (NULL, 'Supermercado', 'purchase', '#10B981', 'shopping-cart', 1),
  (NULL, 'Farmacia', 'purchase', '#EC4899', 'heart', 1),
  (NULL, 'Ropa', 'purchase', '#6366F1', 'shirt', 1),
  (NULL, 'Electrónica', 'purchase', '#14B8A6', 'laptop', 1),
  -- Gastos hormiga (small_expense)
  (NULL, 'Café', 'small_expense', '#92400E', 'coffee', 1),
  (NULL, 'Snacks', 'small_expense', '#F97316', 'cookie', 1),
  (NULL, 'Transporte público', 'small_expense', '#06B6D4', 'bus', 1),
  (NULL, 'Otros gastos menores', 'small_expense', '#64748B', 'dots', 1);

-- 2. Actualizar gastos que usan categorías duplicadas para que usen las estándar
-- Para cada categoría duplicada (user_id NOT NULL), buscar la estándar equivalente
UPDATE expenses
SET category_id = (
  SELECT standard_cat.id
  FROM expense_categories AS standard_cat
  WHERE standard_cat.name = (
    SELECT user_cat.name
    FROM expense_categories AS user_cat
    WHERE user_cat.id = expenses.category_id
  )
  AND standard_cat.is_standard = 1
  AND standard_cat.user_id IS NULL
)
WHERE category_id IN (
  SELECT id
  FROM expense_categories
  WHERE user_id IS NOT NULL
  AND is_standard = 0
  AND name IN (
    'Arriendo', 'Servicios Básicos', 'Internet/Teléfono', 'Transporte',
    'Supermercado', 'Farmacia', 'Ropa', 'Electrónica',
    'Café', 'Snacks', 'Transporte público', 'Otros gastos menores'
  )
);

-- 3. Eliminar categorías duplicadas (categorías con user_id que son duplicados de las estándar)
DELETE FROM expense_categories
WHERE user_id IS NOT NULL
AND is_standard = 0
AND name IN (
  'Arriendo', 'Servicios Básicos', 'Internet/Teléfono', 'Transporte',
  'Supermercado', 'Farmacia', 'Ropa', 'Electrónica',
  'Café', 'Snacks', 'Transporte público', 'Otros gastos menores'
);
