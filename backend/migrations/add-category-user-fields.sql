-- Agregar columnas para sistema de categorías estándar vs personalizadas
ALTER TABLE expense_categories ADD COLUMN user_id INTEGER DEFAULT NULL;
ALTER TABLE expense_categories ADD COLUMN is_standard INTEGER DEFAULT 0;

-- Marcar todas las categorías existentes como estándar
UPDATE expense_categories SET is_standard = 1 WHERE user_id IS NULL;
