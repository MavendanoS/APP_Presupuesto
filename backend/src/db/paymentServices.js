/**
 * Queries de base de datos para servicios de pago
 *
 * SEGURIDAD: Todos los queries usan prepared statements con parametros
 * para prevenir SQL injection
 */

/**
 * Crear un nuevo servicio de pago
 * @param {Object} db - D1 database binding
 * @param {Object} data - { user_id, name, icon, color, sort_order }
 * @returns {Promise<Object>} Servicio creado
 */
export async function createPaymentService(db, data) {
  const { user_id, name, icon, color, sort_order } = data;

  const result = await db.prepare(`
    INSERT INTO payment_services (user_id, name, icon, color, sort_order)
    VALUES (?, ?, ?, ?, ?)
  `).bind(user_id, name, icon || 'bi-credit-card', color || '#3B82F6', sort_order ?? 0).run();

  if (!result.success) {
    throw new Error('Error al crear servicio de pago');
  }

  // Obtener el servicio creado
  const service = await db.prepare(`
    SELECT
      id,
      user_id,
      name,
      icon,
      color,
      is_active,
      sort_order,
      expected_amount,
      created_at,
      updated_at
    FROM payment_services
    WHERE id = ?
  `).bind(result.meta.last_row_id).first();

  return service;
}

/**
 * Obtener servicios de pago del usuario
 * @param {Object} db - D1 database binding
 * @param {number} userId
 * @param {Object} filters - { is_active? }
 * @returns {Promise<Array>} Servicios de pago
 */
export async function getPaymentServices(db, userId, filters = {}) {
  const { is_active } = filters;

  let whereConditions = ['user_id = ?'];
  let params = [userId];

  if (is_active !== undefined) {
    whereConditions.push('is_active = ?');
    params.push(is_active ? 1 : 0);
  }

  const whereClause = whereConditions.join(' AND ');

  const services = await db.prepare(`
    SELECT
      id,
      user_id,
      name,
      icon,
      color,
      is_active,
      sort_order,
      expected_amount,
      created_at,
      updated_at
    FROM payment_services
    WHERE ${whereClause}
    ORDER BY sort_order ASC, name ASC
  `).bind(...params).all();

  return services.results || [];
}

/**
 * Obtener un servicio de pago por ID
 * @param {Object} db - D1 database binding
 * @param {number} serviceId
 * @param {number} userId - Para verificar que pertenece al usuario
 * @returns {Promise<Object|null>} Servicio o null
 */
export async function getPaymentServiceById(db, serviceId, userId) {
  const service = await db.prepare(`
    SELECT
      id,
      user_id,
      name,
      icon,
      color,
      is_active,
      sort_order,
      expected_amount,
      created_at,
      updated_at
    FROM payment_services
    WHERE id = ? AND user_id = ?
  `).bind(serviceId, userId).first();

  return service || null;
}

/**
 * Actualizar un servicio de pago
 * @param {Object} db - D1 database binding
 * @param {number} serviceId
 * @param {number} userId
 * @param {Object} updates - { name?, icon?, color?, is_active?, sort_order? }
 * @returns {Promise<Object>} Servicio actualizado
 */
export async function updatePaymentService(db, serviceId, userId, updates) {
  const service = await getPaymentServiceById(db, serviceId, userId);
  if (!service) {
    throw new Error('Servicio de pago no encontrado');
  }

  const fields = [];
  const values = [];

  if (updates.name !== undefined) {
    fields.push('name = ?');
    values.push(updates.name);
  }

  if (updates.icon !== undefined) {
    fields.push('icon = ?');
    values.push(updates.icon);
  }

  if (updates.color !== undefined) {
    fields.push('color = ?');
    values.push(updates.color);
  }

  if (updates.is_active !== undefined) {
    fields.push('is_active = ?');
    values.push(updates.is_active ? 1 : 0);
  }

  if (updates.sort_order !== undefined) {
    fields.push('sort_order = ?');
    values.push(updates.sort_order);
  }

  if (updates.expected_amount !== undefined) {
    fields.push('expected_amount = ?');
    values.push(updates.expected_amount === null ? null : updates.expected_amount);
  }

  if (fields.length === 0) {
    // No hay cambios, retornar el servicio actual
    return service;
  }

  // Siempre actualizar updated_at
  fields.push("updated_at = datetime('now')");

  values.push(serviceId, userId);

  const result = await db.prepare(`
    UPDATE payment_services
    SET ${fields.join(', ')}
    WHERE id = ? AND user_id = ?
  `).bind(...values).run();

  if (!result.success || result.meta.changes === 0) {
    throw new Error('Servicio de pago no encontrado o no autorizado');
  }

  return await getPaymentServiceById(db, serviceId, userId);
}

/**
 * Eliminar un servicio de pago (cascade elimina monthly_payments via FK)
 * @param {Object} db - D1 database binding
 * @param {number} serviceId
 * @param {number} userId
 * @returns {Promise<boolean>} true si se elimino
 */
export async function deletePaymentService(db, serviceId, userId) {
  // Verificar propiedad antes de eliminar
  const service = await getPaymentServiceById(db, serviceId, userId);
  if (!service) {
    throw new Error('Servicio de pago no encontrado');
  }

  const result = await db.prepare(`
    DELETE FROM payment_services
    WHERE id = ? AND user_id = ?
  `).bind(serviceId, userId).run();

  if (!result.success || result.meta.changes === 0) {
    throw new Error('Servicio de pago no encontrado o no autorizado');
  }

  return true;
}

/**
 * Crear los 7 servicios por defecto para un nuevo usuario
 * @param {Object} db - D1 database binding
 * @param {number} userId
 * @returns {Promise<Array>} Servicios creados
 */
export async function createDefaultServices(db, userId) {
  const defaultServices = [
    { name: 'Arriendo', icon: 'bi-house', color: '#EF4444', sort_order: 0 },
    { name: 'Luz', icon: 'bi-lightbulb', color: '#F59E0B', sort_order: 1 },
    { name: 'Agua', icon: 'bi-droplet', color: '#06B6D4', sort_order: 2 },
    { name: 'Gas', icon: 'bi-fire', color: '#DC2626', sort_order: 3 },
    { name: 'Internet', icon: 'bi-wifi', color: '#3B82F6', sort_order: 4 },
    { name: 'Telefono', icon: 'bi-phone', color: '#8B5CF6', sort_order: 5 },
    { name: 'Transporte', icon: 'bi-bus-front', color: '#10B981', sort_order: 6 },
  ];

  const createdServices = [];

  for (const svc of defaultServices) {
    const result = await db.prepare(`
      INSERT INTO payment_services (user_id, name, icon, color, sort_order)
      VALUES (?, ?, ?, ?, ?)
    `).bind(userId, svc.name, svc.icon, svc.color, svc.sort_order).run();

    if (result.success) {
      const service = await db.prepare(`
        SELECT
          id,
          user_id,
          name,
          icon,
          color,
          is_active,
          sort_order,
          created_at,
          updated_at
        FROM payment_services
        WHERE id = ?
      `).bind(result.meta.last_row_id).first();

      if (service) {
        createdServices.push(service);
      }
    }
  }

  return createdServices;
}

/**
 * Reordenar servicios de pago
 * @param {Object} db - D1 database binding
 * @param {number} userId
 * @param {Array<number>} orderedIds - IDs en el orden deseado
 * @returns {Promise<boolean>} true si se reordeno correctamente
 */
export async function reorderServices(db, userId, orderedIds) {
  // Validar que todos los IDs pertenecen al usuario
  const placeholders = orderedIds.map(() => '?').join(', ');
  const existing = await db.prepare(`
    SELECT id
    FROM payment_services
    WHERE user_id = ? AND id IN (${placeholders})
  `).bind(userId, ...orderedIds).all();

  const existingIds = (existing.results || []).map(r => r.id);

  if (existingIds.length !== orderedIds.length) {
    throw new Error('Uno o mas servicios no pertenecen al usuario');
  }

  // Actualizar sort_order para cada servicio
  for (let i = 0; i < orderedIds.length; i++) {
    await db.prepare(`
      UPDATE payment_services
      SET sort_order = ?, updated_at = datetime('now')
      WHERE id = ? AND user_id = ?
    `).bind(i, orderedIds[i], userId).run();
  }

  return true;
}
