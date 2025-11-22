/**
 * Queries de base de datos para ingresos
 *
 * SEGURIDAD: Todos los queries usan prepared statements con parámetros
 * y validación de campos mediante whitelist para prevenir SQL injection
 */

import { buildIncomeWhereClause, buildIncomeSetClause } from '../utils/queryValidators.js';

/**
 * Crear un nuevo ingreso
 * @param {Object} db - D1 database binding
 * @param {Object} incomeData - { user_id, source, amount, date, is_recurring, frequency, notes }
 * @returns {Promise<Object>} Ingreso creado
 */
export async function createIncome(db, incomeData) {
  const { user_id, source, amount, date, is_recurring, frequency, notes } = incomeData;

  const result = await db.prepare(`
    INSERT INTO income (user_id, source, amount, date, is_recurring, frequency, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(
    user_id,
    source,
    amount,
    date,
    is_recurring ? 1 : 0,
    frequency || 'once',
    notes || null
  ).run();

  if (!result.success) {
    throw new Error('Error al crear ingreso');
  }

  // Obtener el ingreso creado
  const income = await db.prepare(`
    SELECT
      id,
      user_id,
      source,
      amount,
      date,
      is_recurring,
      frequency,
      notes,
      created_at,
      updated_at
    FROM income
    WHERE id = ?
  `).bind(result.meta.last_row_id).first();

  return income;
}

/**
 * Obtener ingresos del usuario con filtros
 * @param {Object} db - D1 database binding
 * @param {number} userId
 * @param {Object} filters - { is_recurring?, start_date?, end_date?, limit?, offset? }
 * @returns {Promise<Object>} { incomes, total }
 */
export async function getIncomes(db, userId, filters = {}) {
  const { limit = 50, offset = 0 } = filters;

  // Construir WHERE clause de forma segura con whitelist de campos
  const { whereClause, params } = buildIncomeWhereClause(userId, filters);

  // Obtener total de registros
  const countResult = await db.prepare(`
    SELECT COUNT(*) as total
    FROM income
    WHERE ${whereClause}
  `).bind(...params).first();

  // Obtener ingresos con paginación
  const incomes = await db.prepare(`
    SELECT
      id,
      user_id,
      source,
      amount,
      date,
      is_recurring,
      frequency,
      notes,
      created_at,
      updated_at
    FROM income
    WHERE ${whereClause}
    ORDER BY date DESC, created_at DESC
    LIMIT ? OFFSET ?
  `).bind(...params, limit, offset).all();

  return {
    incomes: incomes.results || [],
    total: countResult.total,
    limit,
    offset
  };
}

/**
 * Obtener un ingreso por ID
 * @param {Object} db - D1 database binding
 * @param {number} incomeId
 * @param {number} userId - Para verificar que pertenece al usuario
 * @returns {Promise<Object|null>} Ingreso o null
 */
export async function getIncomeById(db, incomeId, userId) {
  const income = await db.prepare(`
    SELECT
      id,
      user_id,
      source,
      amount,
      date,
      is_recurring,
      frequency,
      notes,
      created_at,
      updated_at
    FROM income
    WHERE id = ? AND user_id = ?
  `).bind(incomeId, userId).first();

  return income || null;
}

/**
 * Actualizar un ingreso
 * @param {Object} db - D1 database binding
 * @param {number} incomeId
 * @param {number} userId
 * @param {Object} updates - { source?, amount?, date?, is_recurring?, frequency?, notes? }
 * @returns {Promise<Object>} Ingreso actualizado
 */
export async function updateIncome(db, incomeId, userId, updates) {
  // Construir SET clause de forma segura con whitelist de campos
  const { setClause, values } = buildIncomeSetClause(updates);

  if (values.length === 0) {
    // No hay cambios válidos, retornar el ingreso actual
    return await getIncomeById(db, incomeId, userId);
  }

  // Agregar ID y userId para la cláusula WHERE
  values.push(incomeId, userId);

  const result = await db.prepare(`
    UPDATE income
    SET ${setClause}
    WHERE id = ? AND user_id = ?
  `).bind(...values).run();

  if (!result.success || result.meta.changes === 0) {
    throw new Error('Ingreso no encontrado o no autorizado');
  }

  return await getIncomeById(db, incomeId, userId);
}

/**
 * Eliminar un ingreso
 * @param {Object} db - D1 database binding
 * @param {number} incomeId
 * @param {number} userId
 * @returns {Promise<boolean>} true si se eliminó
 */
export async function deleteIncome(db, incomeId, userId) {
  const result = await db.prepare(`
    DELETE FROM income
    WHERE id = ? AND user_id = ?
  `).bind(incomeId, userId).run();

  if (!result.success || result.meta.changes === 0) {
    throw new Error('Ingreso no encontrado o no autorizado');
  }

  return true;
}

/**
 * Obtener resumen de ingresos
 * @param {Object} db - D1 database binding
 * @param {number} userId
 * @param {Object} filters - { start_date?, end_date? }
 * @returns {Promise<Object>} Resumen de ingresos
 */
export async function getIncomesSummary(db, userId, filters = {}) {
  // Construir WHERE clause de forma segura
  const { whereClause, params } = buildIncomeWhereClause(userId, filters);

  const summary = await db.prepare(`
    SELECT
      COUNT(*) as total_count,
      SUM(amount) as total_amount,
      AVG(amount) as avg_amount,
      SUM(CASE WHEN is_recurring = 1 THEN amount ELSE 0 END) as recurring_amount,
      SUM(CASE WHEN is_recurring = 0 THEN amount ELSE 0 END) as one_time_amount
    FROM income
    WHERE ${whereClause}
  `).bind(...params).first();

  return summary || {
    total_count: 0,
    total_amount: 0,
    avg_amount: 0,
    recurring_amount: 0,
    one_time_amount: 0
  };
}

/**
 * Obtener ingresos recurrentes activos
 * @param {Object} db - D1 database binding
 * @param {number} userId
 * @returns {Promise<Array>} Ingresos recurrentes
 */
export async function getRecurringIncomes(db, userId) {
  const incomes = await db.prepare(`
    SELECT
      id,
      user_id,
      source,
      amount,
      date,
      is_recurring,
      frequency,
      notes,
      created_at,
      updated_at
    FROM income
    WHERE user_id = ? AND is_recurring = 1
    ORDER BY amount DESC
  `).bind(userId).all();

  return incomes.results || [];
}
