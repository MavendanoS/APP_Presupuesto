/**
 * Servicio de Autenticación
 * Lógica de negocio para registro, login y gestión de usuarios
 */

import { hashPassword, verifyPassword } from '../utils/hash.js';
import { createToken } from '../utils/jwt.js';
import { isValidEmail, validatePassword, validateName, sanitizeInput } from '../utils/validators.js';
import { createUser, findUserByEmail, findUserById, updateUserPasswordHash } from '../db/users.js';
import { sendPasswordResetEmail, sendPasswordChangedEmail } from './emailService.js';

/**
 * Registrar un nuevo usuario
 * @param {Object} db - D1 database binding
 * @param {Object} userData - { email, password, name }
 * @param {string} jwtSecret - Secret para firmar JWT
 * @returns {Promise<Object>} { user, token }
 */
export async function registerUser(db, userData, jwtSecret) {
  const { email, password, name } = userData;

  // Validar email
  const cleanEmail = sanitizeInput(email).toLowerCase(); // Convertir a minúsculas
  if (!isValidEmail(cleanEmail)) {
    throw new Error('Email inválido');
  }

  // Validar password
  const passwordValidation = validatePassword(password);
  if (!passwordValidation.isValid) {
    throw new Error(passwordValidation.errors.join(', '));
  }

  // Validar nombre
  const cleanName = sanitizeInput(name);
  const nameValidation = validateName(cleanName);
  if (!nameValidation.isValid) {
    throw new Error(nameValidation.errors.join(', '));
  }

  // Verificar si el usuario ya existe
  const existingUser = await findUserByEmail(db, cleanEmail);
  if (existingUser) {
    throw new Error('El email ya está registrado');
  }

  // Hashear password
  const password_hash = await hashPassword(password);

  // Crear usuario
  const user = await createUser(db, {
    email: cleanEmail,
    password_hash,
    name: cleanName
  });

  // Generar token JWT
  const token = await createToken(
    { userId: user.id, email: user.email },
    jwtSecret
  );

  // Retornar usuario (sin password_hash) y token
  const { password_hash: _, ...userWithoutPassword } = user;

  return {
    user: userWithoutPassword,
    token
  };
}

/**
 * Login de usuario
 * @param {Object} db - D1 database binding
 * @param {Object} credentials - { email, password }
 * @param {string} jwtSecret - Secret para firmar JWT
 * @returns {Promise<Object>} { user, token }
 */
export async function loginUser(db, credentials, jwtSecret) {
  const { email, password } = credentials;

  // Validar email
  const cleanEmail = sanitizeInput(email).toLowerCase(); // Convertir a minúsculas
  if (!isValidEmail(cleanEmail)) {
    throw new Error('Credenciales inválidas');
  }

  // Buscar usuario
  const user = await findUserByEmail(db, cleanEmail);
  if (!user) {
    throw new Error('Credenciales inválidas');
  }

  // Verificar password
  const { isValid, needsRehash } = await verifyPassword(password, user.password_hash);
  if (!isValid) {
    throw new Error('Credenciales inválidas');
  }

  // Si el password usa formato legacy SHA-256, actualizar a bcrypt
  if (needsRehash) {
    try {
      const newHash = await hashPassword(password);
      await updateUserPasswordHash(db, user.id, newHash);
      console.log(`✅ Password actualizado a bcrypt para usuario ${user.id}`);
    } catch (error) {
      // No fallar el login si falla la actualización, solo loguear
      console.error(`⚠️ Error al actualizar password a bcrypt para usuario ${user.id}:`, error);
    }
  }

  // Generar token JWT
  const token = await createToken(
    { userId: user.id, email: user.email },
    jwtSecret
  );

  // Retornar usuario (sin password_hash) y token
  const { password_hash: _, ...userWithoutPassword } = user;

  return {
    user: userWithoutPassword,
    token
  };
}

/**
 * Obtener información del usuario actual
 * @param {Object} db - D1 database binding
 * @param {number} userId - ID del usuario
 * @returns {Promise<Object>} Usuario
 */
export async function getCurrentUser(db, userId) {
  const user = await findUserById(db, userId);

  if (!user) {
    throw new Error('Usuario no encontrado');
  }

  return user;
}

/**
 * Generar token de recuperación de contraseña y enviar email
 * @param {Object} db - D1 database binding
 * @param {string} email - Email del usuario
 * @param {string} resendApiKey - API key de Resend
 * @param {string} frontendUrl - URL del frontend
 * @returns {Promise<Object>} { message }
 */
export async function generatePasswordResetToken(db, email, resendApiKey, frontendUrl) {
  const cleanEmail = sanitizeInput(email).toLowerCase(); // Convertir a minúsculas
  if (!isValidEmail(cleanEmail)) {
    throw new Error('Email inválido');
  }

  // Buscar usuario
  const user = await findUserByEmail(db, cleanEmail);
  if (!user) {
    // Por seguridad, no revelar si el email existe o no
    // Retornar mensaje genérico
    return { message: 'Si el email existe, se enviará un enlace de recuperación' };
  }

  // Generar token aleatorio (32 bytes = 64 caracteres hex)
  const tokenBytes = new Uint8Array(32);
  crypto.getRandomValues(tokenBytes);
  const token = Array.from(tokenBytes, byte => byte.toString(16).padStart(2, '0')).join('');

  // Expiración: 1 hora
  const expiresAt = Math.floor(Date.now() / 1000) + (60 * 60);

  // Invalidar tokens anteriores del usuario
  await db.prepare(`
    UPDATE password_reset_tokens
    SET used = 1
    WHERE user_id = ? AND used = 0
  `).bind(user.id).run();

  // Guardar nuevo token
  await db.prepare(`
    INSERT INTO password_reset_tokens (user_id, token, expires_at)
    VALUES (?, ?, ?)
  `).bind(user.id, token, expiresAt).run();

  // Enviar email con el link de recuperación
  try {
    await sendPasswordResetEmail(resendApiKey, user.email, token, frontendUrl);
  } catch (error) {
    console.error('❌ Error al enviar email de recuperación:', error);
    // No fallar el proceso si el email falla
  }

  return { message: 'Si el email existe, se enviará un enlace de recuperación' };
}

/**
 * Resetear contraseña con token
 * @param {Object} db - D1 database binding
 * @param {string} token - Token de recuperación
 * @param {string} newPassword - Nueva contraseña
 * @param {string} resendApiKey - API key de Resend (opcional)
 * @returns {Promise<void>}
 */
export async function resetPasswordWithToken(db, token, newPassword, resendApiKey) {
  // Validar nueva contraseña
  const passwordValidation = validatePassword(newPassword);
  if (!passwordValidation.isValid) {
    throw new Error(passwordValidation.errors.join(', '));
  }

  const now = Math.floor(Date.now() / 1000);

  // Buscar token válido
  const resetToken = await db.prepare(`
    SELECT * FROM password_reset_tokens
    WHERE token = ? AND used = 0 AND expires_at > ?
  `).bind(token, now).first();

  if (!resetToken) {
    throw new Error('Token inválido o expirado');
  }

  // Obtener email del usuario
  const user = await findUserById(db, resetToken.user_id);
  if (!user) {
    throw new Error('Usuario no encontrado');
  }

  // Hashear nueva contraseña
  const password_hash = await hashPassword(newPassword);

  // Actualizar contraseña del usuario
  await db.prepare(`
    UPDATE users
    SET password_hash = ?, updated_at = unixepoch()
    WHERE id = ?
  `).bind(password_hash, resetToken.user_id).run();

  // Marcar token como usado
  await db.prepare(`
    UPDATE password_reset_tokens
    SET used = 1
    WHERE id = ?
  `).bind(resetToken.id).run();

  // Enviar email de confirmación
  if (resendApiKey) {
    try {
      await sendPasswordChangedEmail(resendApiKey, user.email);
    } catch (error) {
      console.error('❌ Error al enviar email de confirmación:', error);
      // No fallar el proceso si el email falla
    }
  }
}

/**
 * Actualizar perfil de usuario
 * @param {Object} db - D1 database binding
 * @param {number} userId - ID del usuario
 * @param {Object} userData - { name, email }
 * @returns {Promise<Object>} Usuario actualizado
 */
export async function updateUserProfile(db, userId, userData) {
  const { name, email } = userData;

  // Validar email
  const cleanEmail = sanitizeInput(email).toLowerCase();
  if (!isValidEmail(cleanEmail)) {
    throw new Error('Email inválido');
  }

  // Validar nombre
  const cleanName = sanitizeInput(name);
  const nameValidation = validateName(cleanName);
  if (!nameValidation.isValid) {
    throw new Error(nameValidation.errors.join(', '));
  }

  // Verificar si el email ya está en uso por otro usuario
  const existingUser = await findUserByEmail(db, cleanEmail);
  if (existingUser && existingUser.id !== userId) {
    throw new Error('El email ya está en uso');
  }

  // Actualizar usuario
  await db.prepare(`
    UPDATE users
    SET name = ?, email = ?, updated_at = unixepoch()
    WHERE id = ?
  `).bind(cleanName, cleanEmail, userId).run();

  // Obtener usuario actualizado
  const updatedUser = await findUserById(db, userId);

  return updatedUser;
}

/**
 * Cambiar contraseña de usuario
 * @param {Object} db - D1 database binding
 * @param {number} userId - ID del usuario
 * @param {Object} passwordData - { currentPassword, newPassword }
 * @returns {Promise<void>}
 */
export async function changeUserPassword(db, userId, passwordData) {
  const { currentPassword, newPassword } = passwordData;

  // Obtener usuario
  const user = await findUserById(db, userId);
  if (!user) {
    throw new Error('Usuario no encontrado');
  }

  // Verificar contraseña actual
  const isValidPassword = await verifyPassword(currentPassword, user.password_hash);
  if (!isValidPassword) {
    throw new Error('Contraseña actual incorrecta');
  }

  // Validar nueva contraseña
  const passwordValidation = validatePassword(newPassword);
  if (!passwordValidation.isValid) {
    throw new Error(passwordValidation.errors.join(', '));
  }

  // Hashear nueva contraseña
  const password_hash = await hashPassword(newPassword);

  // Actualizar contraseña
  await db.prepare(`
    UPDATE users
    SET password_hash = ?, updated_at = unixepoch()
    WHERE id = ?
  `).bind(password_hash, userId).run();
}

/**
 * Re-autenticar usuario después de inactividad
 * Valida la contraseña del usuario actual sin generar nuevo token
 * @param {Object} db - D1 database binding
 * @param {number} userId - ID del usuario
 * @param {string} password - Contraseña a validar
 * @returns {Promise<boolean>} true si la contraseña es correcta
 */
export async function reAuthenticateUser(db, userId, password) {
  // Obtener usuario
  const user = await findUserById(db, userId);
  if (!user) {
    throw new Error('Usuario no encontrado');
  }

  // Verificar contraseña
  const { isValid } = await verifyPassword(password, user.password_hash);

  return isValid;
}

