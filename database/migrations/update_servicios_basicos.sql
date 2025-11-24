-- Migration: Split Servicios Básicos into Luz, Agua, Gas
-- Also add missing Arriendo category

-- Delete old Servicios Básicos category
DELETE FROM expense_categories WHERE name = 'Servicios Básicos' AND is_standard = 1;

-- Add Arriendo if missing
INSERT OR IGNORE INTO expense_categories (user_id, name, type, color, icon, is_standard)
VALUES (NULL, 'Arriendo', 'payment', '#EF4444', 'home', 1);

-- Add new categories: Luz, Agua, Gas
INSERT OR IGNORE INTO expense_categories (user_id, name, type, color, icon, is_standard)
VALUES
  (NULL, 'Luz', 'payment', '#F59E0B', 'lightbulb', 1),
  (NULL, 'Agua', 'payment', '#06B6D4', 'droplet', 1),
  (NULL, 'Gas', 'payment', '#DC2626', 'fire', 1);
