-- Schema para Cloudflare D1
-- PWA de Gestión de Gastos Personales

-- Tabla de usuarios
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Tabla de categorías de gastos
-- user_id NULL = categoría transversal (para todos los usuarios)
-- user_id NOT NULL = categoría personalizada del usuario
CREATE TABLE IF NOT EXISTS expense_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER DEFAULT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('payment', 'purchase', 'small_expense')),
    color TEXT DEFAULT '#3B82F6',
    icon TEXT DEFAULT 'shopping-cart',
    is_standard INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_categories_user ON expense_categories(user_id);
CREATE INDEX IF NOT EXISTS idx_categories_type ON expense_categories(type);

-- Tabla de gastos
CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    category_id INTEGER,
    type TEXT NOT NULL CHECK(type IN ('payment', 'purchase', 'small_expense')),
    amount REAL NOT NULL,
    description TEXT NOT NULL,
    date DATE NOT NULL,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES expense_categories(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_expenses_user ON expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
CREATE INDEX IF NOT EXISTS idx_expenses_type ON expenses(type);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category_id);

-- Tabla de ingresos
CREATE TABLE IF NOT EXISTS income (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    source TEXT NOT NULL,
    amount REAL NOT NULL,
    date DATE NOT NULL,
    is_recurring BOOLEAN DEFAULT 0,
    frequency TEXT CHECK(frequency IN ('monthly', 'weekly', 'biweekly', 'annual', 'once')),
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_income_user ON income(user_id);
CREATE INDEX IF NOT EXISTS idx_income_date ON income(date);

-- Tabla de límites de presupuesto
CREATE TABLE IF NOT EXISTS budget_limits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    category_id INTEGER,
    type TEXT CHECK(type IN ('payment', 'purchase', 'small_expense', 'total')),
    limit_amount REAL NOT NULL,
    period TEXT NOT NULL CHECK(period IN ('daily', 'weekly', 'monthly', 'annual')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES expense_categories(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_budget_user ON budget_limits(user_id);

-- Datos iniciales: Categorías predeterminadas transversales
-- Estas categorías están disponibles para todos los usuarios (user_id = NULL, is_standard = 1)

-- Pagos (payments)
INSERT OR IGNORE INTO expense_categories (user_id, name, type, color, icon, is_standard)
VALUES
  (NULL, 'Arriendo', 'payment', '#EF4444', 'home', 1),
  (NULL, 'Servicios Básicos', 'payment', '#F59E0B', 'bolt', 1),
  (NULL, 'Internet/Teléfono', 'payment', '#3B82F6', 'wifi', 1),
  (NULL, 'Transporte', 'payment', '#8B5CF6', 'car', 1);

-- Compras (purchases)
INSERT OR IGNORE INTO expense_categories (user_id, name, type, color, icon, is_standard)
VALUES
  (NULL, 'Supermercado', 'purchase', '#10B981', 'shopping-cart', 1),
  (NULL, 'Farmacia', 'purchase', '#EC4899', 'heart', 1),
  (NULL, 'Ropa', 'purchase', '#6366F1', 'shirt', 1),
  (NULL, 'Electrónica', 'purchase', '#14B8A6', 'laptop', 1);

-- Gastos hormiga (small_expense)
INSERT OR IGNORE INTO expense_categories (user_id, name, type, color, icon, is_standard)
VALUES
  (NULL, 'Café', 'small_expense', '#92400E', 'coffee', 1),
  (NULL, 'Snacks', 'small_expense', '#F97316', 'cookie', 1),
  (NULL, 'Transporte público', 'small_expense', '#06B6D4', 'bus', 1),
  (NULL, 'Otros gastos menores', 'small_expense', '#64748B', 'dots', 1);
