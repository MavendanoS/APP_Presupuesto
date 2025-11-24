/**
 * Queries de base de datos para usuarios
 */

/**
 * Crear un nuevo usuario
 * @param {Object} db - Binding de D1
 * @param {Object} userData - { email, password_hash, name }
 * @returns {Promise<Object>} Usuario creado
 */
export async function createUser(db, userData) {
  const { email, password_hash, name } = userData;

  const result = await db.prepare(`
    INSERT INTO users (email, password_hash, name)
    VALUES (?, ?, ?)
  `).bind(email, password_hash, name).run();

  if (!result.success) {
    throw new Error('Error al crear usuario');
  }

  // Obtener el usuario creado
  const user = await db.prepare(`
    SELECT id, email, name, created_at
    FROM users
    WHERE id = ?
  `).bind(result.meta.last_row_id).first();

  return user;
}

/**
 * Buscar usuario por email (case-insensitive)
 * @param {Object} db - Binding de D1
 * @param {string} email
 * @returns {Promise<Object|null>} Usuario o null si no existe
 */
export async function findUserByEmail(db, email) {
  const user = await db.prepare(`
    SELECT id, email, password_hash, name, language, currency, created_at
    FROM users
    WHERE LOWER(email) = LOWER(?)
  `).bind(email).first();

  return user || null;
}

/**
 * Buscar usuario por ID
 * @param {Object} db - Binding de D1
 * @param {number} userId
 * @returns {Promise<Object|null>} Usuario o null si no existe
 */
export async function findUserById(db, userId) {
  const user = await db.prepare(`
    SELECT id, email, name, language, currency, created_at
    FROM users
    WHERE id = ?
  `).bind(userId).first();

  return user || null;
}

/**
 * Actualizar información del usuario
 * @param {Object} db - Binding de D1
 * @param {number} userId
 * @param {Object} updates - { name?, email? }
 * @returns {Promise<Object>} Usuario actualizado
 */
export async function updateUser(db, userId, updates) {
  const fields = [];
  const values = [];

  if (updates.name) {
    fields.push('name = ?');
    values.push(updates.name);
  }

  if (updates.email) {
    fields.push('email = ?');
    values.push(updates.email);
  }

  fields.push('updated_at = CURRENT_TIMESTAMP');
  values.push(userId);

  if (fields.length === 1) {
    // Solo updated_at, no hay cambios
    return await findUserById(db, userId);
  }

  await db.prepare(`
    UPDATE users
    SET ${fields.join(', ')}
    WHERE id = ?
  `).bind(...values).run();

  return await findUserById(db, userId);
}

/**
 * Actualizar el password hash de un usuario
 * @param {Object} db - Binding de D1
 * @param {number} userId
 * @param {string} newPasswordHash - Nuevo hash del password
 * @returns {Promise<boolean>} True si se actualizó correctamente
 */
export async function updateUserPasswordHash(db, userId, newPasswordHash) {
  const result = await db.prepare(`
    UPDATE users
    SET password_hash = ?,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).bind(newPasswordHash, userId).run();

  return result.success;
}

/**
 * Actualizar preferencias del usuario (idioma y moneda)
 * @param {Object} db - Binding de D1
 * @param {number} userId
 * @param {Object} preferences - { language?, currency? }
 * @returns {Promise<Object>} Usuario actualizado
 */
export async function updateUserPreferences(db, userId, preferences) {
  const fields = [];
  const values = [];

  if (preferences.language) {
    // Validar idioma
    if (!['es', 'en'].includes(preferences.language)) {
      throw new Error('Idioma inválido. Debe ser "es" o "en"');
    }
    fields.push('language = ?');
    values.push(preferences.language);
  }

  if (preferences.currency) {
    // Validar moneda
    if (!['CLP', 'USD'].includes(preferences.currency)) {
      throw new Error('Moneda inválida. Debe ser "CLP" o "USD"');
    }
    fields.push('currency = ?');
    values.push(preferences.currency);
  }

  if (fields.length === 0) {
    // No hay preferencias para actualizar
    return await findUserById(db, userId);
  }

  fields.push('updated_at = CURRENT_TIMESTAMP');
  values.push(userId);

  await db.prepare(`
    UPDATE users
    SET ${fields.join(', ')}
    WHERE id = ?
  `).bind(...values).run();

  return await findUserById(db, userId);
}
