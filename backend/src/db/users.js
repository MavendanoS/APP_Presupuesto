/**
 * Queries de base de datos para usuarios
 */

const PUBLIC_USER_COLUMNS = 'id, email, name, language, currency, created_at';

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

  return await findUserById(db, result.meta.last_row_id);
}

/**
 * Eliminar un usuario (usado para revertir un registro fallido)
 * @param {Object} db - Binding de D1
 * @param {number} userId
 */
export async function deleteUser(db, userId) {
  await db.prepare('DELETE FROM users WHERE id = ?').bind(userId).run();
}

/**
 * Buscar usuario por email (case-insensitive). Incluye password_hash.
 * @param {Object} db - Binding de D1
 * @param {string} email
 * @returns {Promise<Object|null>} Usuario o null si no existe
 */
export async function findUserByEmail(db, email) {
  const user = await db.prepare(`
    SELECT ${PUBLIC_USER_COLUMNS}, password_hash
    FROM users
    WHERE LOWER(email) = LOWER(?)
  `).bind(email).first();

  return user || null;
}

/**
 * Buscar usuario por ID (sin datos sensibles)
 * @param {Object} db - Binding de D1
 * @param {number} userId
 * @returns {Promise<Object|null>} Usuario o null si no existe
 */
export async function findUserById(db, userId) {
  const user = await db.prepare(`
    SELECT ${PUBLIC_USER_COLUMNS}
    FROM users
    WHERE id = ?
  `).bind(userId).first();

  return user || null;
}

/**
 * Buscar usuario por ID incluyendo password_hash (solo para verificar contraseña)
 * @param {Object} db - Binding de D1
 * @param {number} userId
 * @returns {Promise<Object|null>}
 */
export async function findUserWithPasswordById(db, userId) {
  const user = await db.prepare(`
    SELECT ${PUBLIC_USER_COLUMNS}, password_hash
    FROM users
    WHERE id = ?
  `).bind(userId).first();

  return user || null;
}

/**
 * Obtener el momento (unix seconds) del último cambio de contraseña.
 * Los JWT emitidos antes de ese momento se consideran revocados.
 * @param {Object} db - Binding de D1
 * @param {number} userId
 * @returns {Promise<{exists: boolean, passwordChangedAt: number|null}>}
 */
export async function getUserSessionInfo(db, userId) {
  const row = await db.prepare(`
    SELECT password_changed_at
    FROM users
    WHERE id = ?
  `).bind(userId).first();

  return {
    exists: !!row,
    passwordChangedAt: row?.password_changed_at ?? null
  };
}

/**
 * Actualizar el password hash de un usuario
 * @param {Object} db - Binding de D1
 * @param {number} userId
 * @param {string} newPasswordHash - Nuevo hash del password
 * @param {Object} options - { revokeSessions?: boolean } marca password_changed_at
 * @returns {Promise<boolean>} True si se actualizó correctamente
 */
export async function updateUserPasswordHash(db, userId, newPasswordHash, { revokeSessions = false } = {}) {
  const statement = revokeSessions
    ? db.prepare(`
        UPDATE users
        SET password_hash = ?,
            password_changed_at = unixepoch(),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `)
    : db.prepare(`
        UPDATE users
        SET password_hash = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);

  const result = await statement.bind(newPasswordHash, userId).run();

  return result.success;
}

/**
 * Actualizar nombre y email del usuario
 * @param {Object} db - Binding de D1
 * @param {number} userId
 * @param {Object} data - { name, email }
 * @returns {Promise<Object>} Usuario actualizado
 */
export async function updateUserProfileData(db, userId, { name, email }) {
  await db.prepare(`
    UPDATE users
    SET name = ?, email = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).bind(name, email, userId).run();

  return await findUserById(db, userId);
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
