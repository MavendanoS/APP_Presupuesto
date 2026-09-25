/**
 * Queries de base de datos para ingresos mensuales (modelo simple)
 *
 * SEGURIDAD: Todos los queries usan prepared statements con parametros
 * para prevenir SQL injection
 *
 * NOTA: A diferencia de monthly_payments, los ingresos no tienen un catalogo
 * de "fuentes". Cada registro es independiente con descripcion libre.
 */

import { notFound } from '../utils/http.js';

/**
 * Crear un nuevo ingreso mensual
 * @param {Object} db - D1 database binding
 * @param {Object} data - { user_id, description, amount, year_month, received_date, notes }
 * @returns {Promise<Object>} Ingreso creado
 */
export async function createMonthlyIncome(db, data) {
  const { user_id, description, amount, year_month, received_date, notes } = data;

  const result = await db.prepare(`
    INSERT INTO monthly_incomes (user_id, description, amount, year_month, received_date, notes)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(
    user_id,
    description,
    amount,
    year_month,
    received_date || null,
    notes || null
  ).run();

  if (!result.success) {
    throw new Error('Error al registrar ingreso mensual');
  }

  const income = await db.prepare(`
    SELECT id, user_id, description, amount, year_month, received_date, notes,
           created_at, updated_at
    FROM monthly_incomes
    WHERE id = ?
  `).bind(result.meta.last_row_id).first();

  return income;
}

/**
 * Actualizar un ingreso mensual existente
 * @param {Object} db - D1 database binding
 * @param {number} incomeId
 * @param {number} userId
 * @param {Object} updates - { description?, amount?, year_month?, received_date?, notes? }
 * @returns {Promise<Object>} Ingreso actualizado
 */
export async function updateMonthlyIncome(db, incomeId, userId, updates) {
  const existing = await getMonthlyIncomeById(db, incomeId, userId);
  if (!existing) {
    throw notFound('Ingreso no encontrado');
  }

  const fields = [];
  const values = [];

  if (updates.description !== undefined) {
    fields.push('description = ?');
    values.push(updates.description);
  }

  if (updates.amount !== undefined) {
    fields.push('amount = ?');
    values.push(updates.amount);
  }

  if (updates.year_month !== undefined) {
    fields.push('year_month = ?');
    values.push(updates.year_month);
  }

  if (updates.received_date !== undefined) {
    fields.push('received_date = ?');
    values.push(updates.received_date || null);
  }

  if (updates.notes !== undefined) {
    fields.push('notes = ?');
    values.push(updates.notes || null);
  }

  if (fields.length === 0) {
    return existing;
  }

  fields.push("updated_at = datetime('now')");
  values.push(incomeId, userId);

  const result = await db.prepare(`
    UPDATE monthly_incomes
    SET ${fields.join(', ')}
    WHERE id = ? AND user_id = ?
  `).bind(...values).run();

  if (!result.success || result.meta.changes === 0) {
    throw notFound('Ingreso no encontrado o no autorizado');
  }

  return await getMonthlyIncomeById(db, incomeId, userId);
}

/**
 * Eliminar un ingreso mensual
 * @param {Object} db - D1 database binding
 * @param {number} incomeId
 * @param {number} userId
 * @returns {Promise<boolean>}
 */
export async function deleteMonthlyIncome(db, incomeId, userId) {
  const result = await db.prepare(`
    DELETE FROM monthly_incomes
    WHERE id = ? AND user_id = ?
  `).bind(incomeId, userId).run();

  if (!result.success || result.meta.changes === 0) {
    throw notFound('Ingreso no encontrado o no autorizado');
  }

  return true;
}

/**
 * Obtener un ingreso por ID (verifica propiedad)
 * @param {Object} db - D1 database binding
 * @param {number} incomeId
 * @param {number} userId
 * @returns {Promise<Object|null>}
 */
export async function getMonthlyIncomeById(db, incomeId, userId) {
  const income = await db.prepare(`
    SELECT id, user_id, description, amount, year_month, received_date, notes,
           created_at, updated_at
    FROM monthly_incomes
    WHERE id = ? AND user_id = ?
  `).bind(incomeId, userId).first();

  return income || null;
}

/**
 * Obtener todos los ingresos de un mes especifico
 * @param {Object} db - D1 database binding
 * @param {number} userId
 * @param {string} yearMonth - Formato 'YYYY-MM'
 * @returns {Promise<Array>}
 */
export async function getIncomesByMonth(db, userId, yearMonth) {
  const incomes = await db.prepare(`
    SELECT id, user_id, description, amount, year_month, received_date, notes,
           created_at, updated_at
    FROM monthly_incomes
    WHERE user_id = ? AND year_month = ?
    ORDER BY received_date DESC NULLS LAST, created_at DESC
  `).bind(userId, yearMonth).all();

  return incomes.results || [];
}

/**
 * Obtener historial de ingresos con filtros opcionales
 * @param {Object} db - D1 database binding
 * @param {number} userId
 * @param {Object} filters - { start_month?, end_month? }
 * @returns {Promise<Array>}
 */
export async function getIncomeHistory(db, userId, filters = {}) {
  const { start_month, end_month } = filters;

  let whereConditions = ['user_id = ?'];
  let params = [userId];

  if (start_month) {
    whereConditions.push('year_month >= ?');
    params.push(start_month);
  }

  if (end_month) {
    whereConditions.push('year_month <= ?');
    params.push(end_month);
  }

  const whereClause = whereConditions.join(' AND ');

  const history = await db.prepare(`
    SELECT id, user_id, description, amount, year_month, received_date, notes,
           created_at, updated_at
    FROM monthly_incomes
    WHERE ${whereClause}
    ORDER BY year_month DESC, received_date DESC NULLS LAST, created_at DESC
  `).bind(...params).all();

  return history.results || [];
}

/**
 * Obtener total de ingresos de un mes
 * @param {Object} db - D1 database binding
 * @param {number} userId
 * @param {string} yearMonth
 * @returns {Promise<{total: number, count: number}>}
 */
export async function getMonthlyIncomeTotal(db, userId, yearMonth) {
  const totals = await db.prepare(`
    SELECT
      COALESCE(SUM(amount), 0) as total,
      COUNT(*) as count
    FROM monthly_incomes
    WHERE user_id = ? AND year_month = ?
  `).bind(userId, yearMonth).first();

  return totals || { total: 0, count: 0 };
}

/**
 * Obtener totales de ingresos agrupados por mes
 * Util para historial / graficos de evolucion
 * @param {Object} db - D1 database binding
 * @param {number} userId
 * @param {Object} filters - { start_month?, end_month? }
 * @returns {Promise<Array>} [{ year_month, total, count }, ...]
 */
export async function getIncomeTotalsByMonth(db, userId, filters = {}) {
  const { start_month, end_month } = filters;

  let whereConditions = ['user_id = ?'];
  let params = [userId];

  if (start_month) {
    whereConditions.push('year_month >= ?');
    params.push(start_month);
  }

  if (end_month) {
    whereConditions.push('year_month <= ?');
    params.push(end_month);
  }

  const whereClause = whereConditions.join(' AND ');

  const totals = await db.prepare(`
    SELECT year_month,
           SUM(amount) as total,
           COUNT(*) as count
    FROM monthly_incomes
    WHERE ${whereClause}
    GROUP BY year_month
    ORDER BY year_month ASC
  `).bind(...params).all();

  return totals.results || [];
}
