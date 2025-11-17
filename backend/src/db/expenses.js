/**
 * Queries de base de datos para gastos
 */

/**
 * Crear un nuevo gasto
 * @param {Object} db - D1 database binding
 * @param {Object} expenseData - { user_id, category_id, type, amount, description, date, notes }
 * @returns {Promise<Object>} Gasto creado
 */
export async function createExpense(db, expenseData) {
  const { user_id, category_id, type, amount, description, date, notes } = expenseData;

  const result = await db.prepare(`
    INSERT INTO expenses (user_id, category_id, type, amount, description, date, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(user_id, category_id || null, type, amount, description, date, notes || null).run();

  if (!result.success) {
    throw new Error('Error al crear gasto');
  }

  // Obtener el gasto creado con información de categoría
  const expense = await db.prepare(`
    SELECT
      e.id,
      e.user_id,
      e.category_id,
      c.name as category_name,
      c.color as category_color,
      c.icon as category_icon,
      e.type,
      e.amount,
      e.description,
      e.date,
      e.notes,
      e.created_at,
      e.updated_at
    FROM expenses e
    LEFT JOIN expense_categories c ON e.category_id = c.id
    WHERE e.id = ?
  `).bind(result.meta.last_row_id).first();

  return expense;
}

/**
 * Obtener gastos del usuario con filtros
 * @param {Object} db - D1 database binding
 * @param {number} userId
 * @param {Object} filters - { type?, category_id?, start_date?, end_date?, limit?, offset? }
 * @returns {Promise<Object>} { expenses, total }
 */
export async function getExpenses(db, userId, filters = {}) {
  const { type, category_id, start_date, end_date, limit = 50, offset = 0 } = filters;

  let whereConditions = ['e.user_id = ?'];
  let params = [userId];

  if (type) {
    whereConditions.push('e.type = ?');
    params.push(type);
  }

  if (category_id) {
    whereConditions.push('e.category_id = ?');
    params.push(category_id);
  }

  if (start_date) {
    whereConditions.push('e.date >= ?');
    params.push(start_date);
  }

  if (end_date) {
    whereConditions.push('e.date <= ?');
    params.push(end_date);
  }

  const whereClause = whereConditions.join(' AND ');

  // Obtener total de registros
  const countResult = await db.prepare(`
    SELECT COUNT(*) as total
    FROM expenses e
    WHERE ${whereClause}
  `).bind(...params).first();

  // Obtener gastos con paginación
  const expenses = await db.prepare(`
    SELECT
      e.id,
      e.user_id,
      e.category_id,
      c.name as category_name,
      c.color as category_color,
      c.icon as category_icon,
      e.type,
      e.amount,
      e.description,
      e.date,
      e.notes,
      e.created_at,
      e.updated_at
    FROM expenses e
    LEFT JOIN expense_categories c ON e.category_id = c.id
    WHERE ${whereClause}
    ORDER BY e.date DESC, e.created_at DESC
    LIMIT ? OFFSET ?
  `).bind(...params, limit, offset).all();

  return {
    expenses: expenses.results || [],
    total: countResult.total,
    limit,
    offset
  };
}

/**
 * Obtener un gasto por ID
 * @param {Object} db - D1 database binding
 * @param {number} expenseId
 * @param {number} userId - Para verificar que pertenece al usuario
 * @returns {Promise<Object|null>} Gasto o null
 */
export async function getExpenseById(db, expenseId, userId) {
  const expense = await db.prepare(`
    SELECT
      e.id,
      e.user_id,
      e.category_id,
      c.name as category_name,
      c.color as category_color,
      c.icon as category_icon,
      e.type,
      e.amount,
      e.description,
      e.date,
      e.notes,
      e.created_at,
      e.updated_at
    FROM expenses e
    LEFT JOIN expense_categories c ON e.category_id = c.id
    WHERE e.id = ? AND e.user_id = ?
  `).bind(expenseId, userId).first();

  return expense || null;
}

/**
 * Actualizar un gasto
 * @param {Object} db - D1 database binding
 * @param {number} expenseId
 * @param {number} userId
 * @param {Object} updates - { category_id?, type?, amount?, description?, date?, notes? }
 * @returns {Promise<Object>} Gasto actualizado
 */
export async function updateExpense(db, expenseId, userId, updates) {
  const fields = [];
  const values = [];

  if (updates.category_id !== undefined) {
    fields.push('category_id = ?');
    values.push(updates.category_id);
  }

  if (updates.type) {
    fields.push('type = ?');
    values.push(updates.type);
  }

  if (updates.amount !== undefined) {
    fields.push('amount = ?');
    values.push(updates.amount);
  }

  if (updates.description !== undefined) {
    fields.push('description = ?');
    values.push(updates.description);
  }

  if (updates.date) {
    fields.push('date = ?');
    values.push(updates.date);
  }

  if (updates.notes !== undefined) {
    fields.push('notes = ?');
    values.push(updates.notes);
  }

  if (fields.length === 0) {
    // No hay cambios, retornar el gasto actual
    return await getExpenseById(db, expenseId, userId);
  }

  fields.push('updated_at = CURRENT_TIMESTAMP');
  values.push(expenseId, userId);

  const result = await db.prepare(`
    UPDATE expenses
    SET ${fields.join(', ')}
    WHERE id = ? AND user_id = ?
  `).bind(...values).run();

  if (!result.success || result.meta.changes === 0) {
    throw new Error('Gasto no encontrado o no autorizado');
  }

  return await getExpenseById(db, expenseId, userId);
}

/**
 * Eliminar un gasto
 * @param {Object} db - D1 database binding
 * @param {number} expenseId
 * @param {number} userId
 * @returns {Promise<boolean>} true si se eliminó
 */
export async function deleteExpense(db, expenseId, userId) {
  const result = await db.prepare(`
    DELETE FROM expenses
    WHERE id = ? AND user_id = ?
  `).bind(expenseId, userId).run();

  if (!result.success || result.meta.changes === 0) {
    throw new Error('Gasto no encontrado o no autorizado');
  }

  return true;
}

/**
 * Obtener resumen de gastos por tipo
 * @param {Object} db - D1 database binding
 * @param {number} userId
 * @param {Object} filters - { start_date?, end_date? }
 * @returns {Promise<Array>} Resumen por tipo
 */
export async function getExpensesSummaryByType(db, userId, filters = {}) {
  const { start_date, end_date } = filters;

  let whereConditions = ['user_id = ?'];
  let params = [userId];

  if (start_date) {
    whereConditions.push('date >= ?');
    params.push(start_date);
  }

  if (end_date) {
    whereConditions.push('date <= ?');
    params.push(end_date);
  }

  const whereClause = whereConditions.join(' AND ');

  const summary = await db.prepare(`
    SELECT
      type,
      COUNT(*) as count,
      SUM(amount) as total_amount,
      AVG(amount) as avg_amount,
      MIN(amount) as min_amount,
      MAX(amount) as max_amount
    FROM expenses
    WHERE ${whereClause}
    GROUP BY type
    ORDER BY total_amount DESC
  `).bind(...params).all();

  return summary.results || [];
}

/**
 * Obtener resumen de gastos por categoría
 * @param {Object} db - D1 database binding
 * @param {number} userId
 * @param {Object} filters - { type?, start_date?, end_date? }
 * @returns {Promise<Array>} Resumen por categoría
 */
export async function getExpensesSummaryByCategory(db, userId, filters = {}) {
  const { type, start_date, end_date } = filters;

  let whereConditions = ['e.user_id = ?'];
  let params = [userId];

  if (type) {
    whereConditions.push('e.type = ?');
    params.push(type);
  }

  if (start_date) {
    whereConditions.push('e.date >= ?');
    params.push(start_date);
  }

  if (end_date) {
    whereConditions.push('e.date <= ?');
    params.push(end_date);
  }

  const whereClause = whereConditions.join(' AND ');

  const summary = await db.prepare(`
    SELECT
      e.category_id,
      c.name as category_name,
      c.color as category_color,
      c.icon as category_icon,
      e.type,
      COUNT(*) as count,
      SUM(e.amount) as total_amount,
      AVG(e.amount) as avg_amount
    FROM expenses e
    LEFT JOIN expense_categories c ON e.category_id = c.id
    WHERE ${whereClause}
    GROUP BY e.category_id, c.name, c.color, c.icon, e.type
    ORDER BY total_amount DESC
  `).bind(...params).all();

  return summary.results || [];
}
