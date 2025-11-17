/**
 * Queries de base de datos para categorías de gastos
 */

/**
 * Crear una nueva categoría
 * @param {Object} db - D1 database binding
 * @param {Object} categoryData - { user_id, name, type, color, icon }
 * @returns {Promise<Object>} Categoría creada
 */
export async function createCategory(db, categoryData) {
  const { user_id, name, type, color, icon } = categoryData;

  const result = await db.prepare(`
    INSERT INTO expense_categories (user_id, name, type, color, icon)
    VALUES (?, ?, ?, ?, ?)
  `).bind(user_id, name, type, color || '#3B82F6', icon || 'tag').run();

  if (!result.success) {
    throw new Error('Error al crear categoría');
  }

  // Obtener la categoría creada
  const category = await db.prepare(`
    SELECT
      id,
      user_id,
      name,
      type,
      color,
      icon,
      created_at
    FROM expense_categories
    WHERE id = ?
  `).bind(result.meta.last_row_id).first();

  return category;
}

/**
 * Obtener categorías del usuario
 * @param {Object} db - D1 database binding
 * @param {number} userId
 * @param {Object} filters - { type? }
 * @returns {Promise<Array>} Categorías
 */
export async function getCategories(db, userId, filters = {}) {
  const { type } = filters;

  let whereConditions = ['user_id = ?'];
  let params = [userId];

  if (type) {
    whereConditions.push('type = ?');
    params.push(type);
  }

  const whereClause = whereConditions.join(' AND ');

  const categories = await db.prepare(`
    SELECT
      id,
      user_id,
      name,
      type,
      color,
      icon,
      created_at
    FROM expense_categories
    WHERE ${whereClause}
    ORDER BY name ASC
  `).bind(...params).all();

  return categories.results || [];
}

/**
 * Obtener una categoría por ID
 * @param {Object} db - D1 database binding
 * @param {number} categoryId
 * @param {number} userId - Para verificar que pertenece al usuario
 * @returns {Promise<Object|null>} Categoría o null
 */
export async function getCategoryById(db, categoryId, userId) {
  const category = await db.prepare(`
    SELECT
      id,
      user_id,
      name,
      type,
      color,
      icon,
      created_at
    FROM expense_categories
    WHERE id = ? AND user_id = ?
  `).bind(categoryId, userId).first();

  return category || null;
}

/**
 * Actualizar una categoría
 * @param {Object} db - D1 database binding
 * @param {number} categoryId
 * @param {number} userId
 * @param {Object} updates - { name?, type?, color?, icon? }
 * @returns {Promise<Object>} Categoría actualizada
 */
export async function updateCategory(db, categoryId, userId, updates) {
  const fields = [];
  const values = [];

  if (updates.name) {
    fields.push('name = ?');
    values.push(updates.name);
  }

  if (updates.type) {
    fields.push('type = ?');
    values.push(updates.type);
  }

  if (updates.color) {
    fields.push('color = ?');
    values.push(updates.color);
  }

  if (updates.icon) {
    fields.push('icon = ?');
    values.push(updates.icon);
  }

  if (fields.length === 0) {
    // No hay cambios, retornar la categoría actual
    return await getCategoryById(db, categoryId, userId);
  }

  values.push(categoryId, userId);

  const result = await db.prepare(`
    UPDATE expense_categories
    SET ${fields.join(', ')}
    WHERE id = ? AND user_id = ?
  `).bind(...values).run();

  if (!result.success || result.meta.changes === 0) {
    throw new Error('Categoría no encontrada o no autorizada');
  }

  return await getCategoryById(db, categoryId, userId);
}

/**
 * Eliminar una categoría
 * @param {Object} db - D1 database binding
 * @param {number} categoryId
 * @param {number} userId
 * @returns {Promise<boolean>} true si se eliminó
 */
export async function deleteCategory(db, categoryId, userId) {
  // Verificar si hay gastos usando esta categoría
  const expensesCount = await db.prepare(`
    SELECT COUNT(*) as count
    FROM expenses
    WHERE category_id = ? AND user_id = ?
  `).bind(categoryId, userId).first();

  if (expensesCount.count > 0) {
    throw new Error(`No se puede eliminar la categoría porque tiene ${expensesCount.count} gasto(s) asociado(s)`);
  }

  const result = await db.prepare(`
    DELETE FROM expense_categories
    WHERE id = ? AND user_id = ?
  `).bind(categoryId, userId).run();

  if (!result.success || result.meta.changes === 0) {
    throw new Error('Categoría no encontrada o no autorizada');
  }

  return true;
}

/**
 * Obtener categorías con conteo de gastos
 * @param {Object} db - D1 database binding
 * @param {number} userId
 * @param {Object} filters - { type?, start_date?, end_date? }
 * @returns {Promise<Array>} Categorías con estadísticas
 */
export async function getCategoriesWithStats(db, userId, filters = {}) {
  const { type, start_date, end_date } = filters;

  let categoryWhere = ['c.user_id = ?'];
  let categoryParams = [userId];

  if (type) {
    categoryWhere.push('c.type = ?');
    categoryParams.push(type);
  }

  let expenseWhere = ['e.user_id = ?'];
  let expenseParams = [userId];

  if (start_date) {
    expenseWhere.push('e.date >= ?');
    expenseParams.push(start_date);
  }

  if (end_date) {
    expenseWhere.push('e.date <= ?');
    expenseParams.push(end_date);
  }

  const categories = await db.prepare(`
    SELECT
      c.id,
      c.user_id,
      c.name,
      c.type,
      c.color,
      c.icon,
      c.created_at,
      COUNT(e.id) as expense_count,
      COALESCE(SUM(e.amount), 0) as total_amount
    FROM expense_categories c
    LEFT JOIN expenses e ON c.id = e.category_id AND ${expenseWhere.join(' AND ')}
    WHERE ${categoryWhere.join(' AND ')}
    GROUP BY c.id, c.user_id, c.name, c.type, c.color, c.icon, c.created_at
    ORDER BY c.name ASC
  `).bind(...categoryParams, ...expenseParams).all();

  return categories.results || [];
}
