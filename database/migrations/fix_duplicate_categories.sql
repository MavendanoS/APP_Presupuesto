-- Fix: Delete duplicate categories and keep only one of each
-- Standard categories (is_standard = 1) are shown to all users automatically

-- Delete all the duplicate categories I created
DELETE FROM expense_categories
WHERE name IN ('Arriendo', 'Luz', 'Agua', 'Gas')
  AND is_standard = 1;

-- Now insert only ONE row for each category
-- These will be shown to all users because is_standard = 1
INSERT INTO expense_categories (user_id, name, type, color, icon, is_standard)
VALUES
  (1, 'Arriendo', 'payment', '#EF4444', 'home', 1),
  (1, 'Luz', 'payment', '#F59E0B', 'lightbulb', 1),
  (1, 'Agua', 'payment', '#06B6D4', 'droplet', 1),
  (1, 'Gas', 'payment', '#DC2626', 'fire', 1);
