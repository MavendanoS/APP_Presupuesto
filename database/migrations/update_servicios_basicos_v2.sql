-- Migration: Split Servicios Básicos into Luz, Agua, Gas for all users
-- Also add missing Arriendo category for all users

-- Delete old Servicios Básicos category for all users
DELETE FROM expense_categories WHERE name = 'Servicios Básicos' AND is_standard = 1;

-- Add new categories for all existing users
-- User 1: mavendanosuazo@gmail.com
INSERT INTO expense_categories (user_id, name, type, color, icon, is_standard)
VALUES
  (1, 'Arriendo', 'payment', '#EF4444', 'home', 1),
  (1, 'Luz', 'payment', '#F59E0B', 'lightbulb', 1),
  (1, 'Agua', 'payment', '#06B6D4', 'droplet', 1),
  (1, 'Gas', 'payment', '#DC2626', 'fire', 1);

-- User 2: javi.92@gmail.com
INSERT INTO expense_categories (user_id, name, type, color, icon, is_standard)
VALUES
  (2, 'Arriendo', 'payment', '#EF4444', 'home', 1),
  (2, 'Luz', 'payment', '#F59E0B', 'lightbulb', 1),
  (2, 'Agua', 'payment', '#06B6D4', 'droplet', 1),
  (2, 'Gas', 'payment', '#DC2626', 'fire', 1);

-- User 3: jeancardenasbeiza@gmail.com
INSERT INTO expense_categories (user_id, name, type, color, icon, is_standard)
VALUES
  (3, 'Arriendo', 'payment', '#EF4444', 'home', 1),
  (3, 'Luz', 'payment', '#F59E0B', 'lightbulb', 1),
  (3, 'Agua', 'payment', '#06B6D4', 'droplet', 1),
  (3, 'Gas', 'payment', '#DC2626', 'fire', 1);

-- User 4: avendanomarco1986@gmail.com
INSERT INTO expense_categories (user_id, name, type, color, icon, is_standard)
VALUES
  (4, 'Arriendo', 'payment', '#EF4444', 'home', 1),
  (4, 'Luz', 'payment', '#F59E0B', 'lightbulb', 1),
  (4, 'Agua', 'payment', '#06B6D4', 'droplet', 1),
  (4, 'Gas', 'payment', '#DC2626', 'fire', 1);

-- User 5: lordsextra100@gmail.com
INSERT INTO expense_categories (user_id, name, type, color, icon, is_standard)
VALUES
  (5, 'Arriendo', 'payment', '#EF4444', 'home', 1),
  (5, 'Luz', 'payment', '#F59E0B', 'lightbulb', 1),
  (5, 'Agua', 'payment', '#06B6D4', 'droplet', 1),
  (5, 'Gas', 'payment', '#DC2626', 'fire', 1);
