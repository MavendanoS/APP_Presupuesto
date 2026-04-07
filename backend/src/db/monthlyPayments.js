/**
 * Queries de base de datos para pagos mensuales
 *
 * SEGURIDAD: Todos los queries usan prepared statements con parametros
 * para prevenir SQL injection
 */

/**
 * Crear o actualizar un pago mensual (upsert)
 * @param {Object} db - D1 database binding
 * @param {Object} data - { user_id, service_id, amount, year_month, paid_date, notes }
 * @returns {Promise<Object>} Pago creado o actualizado
 */
export async function upsertMonthlyPayment(db, data) {
  const { user_id, service_id, amount, year_month, paid_date, notes } = data;

  const result = await db.prepare(`
    INSERT INTO monthly_payments (user_id, service_id, amount, year_month, paid_date, notes)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id, service_id, year_month) DO UPDATE SET
      amount = excluded.amount,
      paid_date = excluded.paid_date,
      notes = excluded.notes,
      updated_at = datetime('now')
  `).bind(
    user_id,
    service_id,
    amount,
    year_month,
    paid_date || null,
    notes || null
  ).run();

  if (!result.success) {
    throw new Error('Error al registrar pago mensual');
  }

  // Obtener el pago con informacion del servicio
  const payment = await db.prepare(`
    SELECT
      mp.id,
      mp.user_id,
      mp.service_id,
      mp.amount,
      mp.year_month,
      mp.paid_date,
      mp.notes,
      mp.created_at,
      mp.updated_at,
      ps.name as service_name,
      ps.icon as service_icon,
      ps.color as service_color
    FROM monthly_payments mp
    JOIN payment_services ps ON mp.service_id = ps.id
    WHERE mp.user_id = ? AND mp.service_id = ? AND mp.year_month = ?
  `).bind(user_id, service_id, year_month).first();

  return payment;
}

/**
 * Eliminar un pago mensual
 * @param {Object} db - D1 database binding
 * @param {number} paymentId
 * @param {number} userId
 * @returns {Promise<boolean>} true si se elimino
 */
export async function deleteMonthlyPayment(db, paymentId, userId) {
  const result = await db.prepare(`
    DELETE FROM monthly_payments
    WHERE id = ? AND user_id = ?
  `).bind(paymentId, userId).run();

  if (!result.success || result.meta.changes === 0) {
    throw new Error('Pago mensual no encontrado o no autorizado');
  }

  return true;
}

/**
 * Obtener checklist mensual (todos los servicios con su estado de pago para un mes)
 * @param {Object} db - D1 database binding
 * @param {number} userId
 * @param {string} yearMonth - Formato 'YYYY-MM'
 * @returns {Promise<Array>} Checklist con estado de pago por servicio
 */
export async function getMonthlyChecklist(db, userId, yearMonth) {
  const checklist = await db.prepare(`
    SELECT
      ps.id as service_id,
      ps.name,
      ps.icon,
      ps.color,
      ps.sort_order,
      ps.expected_amount,
      mp.id as payment_id,
      mp.amount,
      mp.paid_date,
      mp.notes,
      mp.year_month
    FROM payment_services ps
    LEFT JOIN monthly_payments mp
      ON ps.id = mp.service_id
      AND mp.year_month = ?
      AND mp.user_id = ?
    WHERE ps.user_id = ? AND ps.is_active = 1
    ORDER BY ps.sort_order ASC
  `).bind(yearMonth, userId, userId).all();

  const results = checklist.results || [];

  // Agregar campo computado is_paid
  return results.map(row => ({
    ...row,
    is_paid: row.payment_id !== null,
  }));
}

/**
 * Obtener historial de pagos con filtros
 * @param {Object} db - D1 database binding
 * @param {number} userId
 * @param {Object} filters - { service_ids?, start_month?, end_month? }
 * @returns {Promise<Array>} Historial de pagos
 */
export async function getPaymentHistory(db, userId, filters = {}) {
  const { service_ids, start_month, end_month } = filters;

  let whereConditions = ['mp.user_id = ?'];
  let params = [userId];

  if (service_ids && service_ids.length > 0) {
    const placeholders = service_ids.map(() => '?').join(', ');
    whereConditions.push(`mp.service_id IN (${placeholders})`);
    params.push(...service_ids);
  }

  if (start_month) {
    whereConditions.push('mp.year_month >= ?');
    params.push(start_month);
  }

  if (end_month) {
    whereConditions.push('mp.year_month <= ?');
    params.push(end_month);
  }

  const whereClause = whereConditions.join(' AND ');

  const history = await db.prepare(`
    SELECT
      mp.id,
      mp.user_id,
      mp.service_id,
      mp.amount,
      mp.year_month,
      mp.paid_date,
      mp.notes,
      mp.created_at,
      mp.updated_at,
      ps.name as service_name,
      ps.icon as service_icon,
      ps.color as service_color
    FROM monthly_payments mp
    JOIN payment_services ps ON mp.service_id = ps.id
    WHERE ${whereClause}
    ORDER BY mp.year_month DESC, ps.sort_order ASC
  `).bind(...params).all();

  return history.results || [];
}

/**
 * Obtener promedios de servicios en los ultimos N meses
 * @param {Object} db - D1 database binding
 * @param {number} userId
 * @param {number} months - Cantidad de meses hacia atras (default 3)
 * @param {Array<number>|null} serviceIds - IDs de servicios a filtrar (null = todos)
 * @returns {Promise<Array>} Promedios por servicio
 */
export async function getServiceAverages(db, userId, months = 3, serviceIds = null) {
  // Calcular mes de inicio y mes actual
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth() - months, 1);
  const startMonth = startDate.getFullYear() + '-' + String(startDate.getMonth() + 1).padStart(2, '0');
  const currentMonth = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');

  let whereConditions = ['mp.user_id = ?', 'mp.year_month >= ?', 'mp.year_month < ?'];
  let params = [userId, startMonth, currentMonth];

  if (serviceIds && serviceIds.length > 0) {
    const placeholders = serviceIds.map(() => '?').join(', ');
    whereConditions.push(`mp.service_id IN (${placeholders})`);
    params.push(...serviceIds);
  }

  const whereClause = whereConditions.join(' AND ');

  const averages = await db.prepare(`
    SELECT
      mp.service_id,
      ps.name,
      ps.icon,
      ps.color,
      AVG(mp.amount) as average_amount,
      MIN(mp.amount) as min_amount,
      MAX(mp.amount) as max_amount,
      COUNT(*) as months_with_data
    FROM monthly_payments mp
    JOIN payment_services ps ON mp.service_id = ps.id
    WHERE ${whereClause}
    GROUP BY mp.service_id
    ORDER BY ps.sort_order ASC
  `).bind(...params).all();

  return averages.results || [];
}

/**
 * Obtener totales de un mes (suma de todos los pagos en un mes)
 * @param {Object} db - D1 database binding
 * @param {number} userId
 * @param {string} yearMonth - Formato 'YYYY-MM'
 * @returns {Promise<Object>} { total, count }
 */
export async function getMonthlyTotals(db, userId, yearMonth) {
  const totals = await db.prepare(`
    SELECT
      COALESCE(SUM(amount), 0) as total,
      COUNT(*) as count
    FROM monthly_payments
    WHERE user_id = ? AND year_month = ?
  `).bind(userId, yearMonth).first();

  return totals || { total: 0, count: 0 };
}
