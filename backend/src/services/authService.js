/**
 * Servicio de Autenticación
 * Lógica de negocio para registro, login y gestión de usuarios
 */

import { hashPassword, verifyPassword } from '../utils/hash.js';
import { createToken } from '../utils/jwt.js';
import { isValidEmail, validatePassword, validateName, sanitizeInput } from '../utils/validators.js';
import { HttpError } from '../utils/http.js';
import {
  createUser,
  deleteUser,
  findUserByEmail,
  findUserById,
  findUserWithPasswordById,
  updateUserPasswordHash,
  updateUserProfileData
} from '../db/users.js';
import { createDefaultServices } from '../db/paymentServices.js';
import { sendPasswordResetEmail, sendPasswordChangedEmail } from './emailService.js';

/**
 * Quitar password_hash de un usuario antes de devolverlo
 */
function toPublicUser(user) {
  const { password_hash: _, ...publicUser } = user;
  return publicUser;
}

/**
 * Hash SHA-256 (hex) de un token de recuperación.
 * En la base de datos solo se guarda el hash, nunca el token en claro.
 */
async function hashResetToken(token) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Verificar la contraseña actual de un usuario
 * @returns {Promise<Object>} usuario (con password_hash)
 */
async function assertCurrentPassword(db, userId, password, message = 'Contraseña actual incorrecta') {
  const user = await findUserWithPasswordById(db, userId);
  if (!user) {
    throw new HttpError(404, 'Usuario no encontrado');
  }

  const { isValid } = await verifyPassword(password, user.password_hash);
  if (!isValid) {
    throw new HttpError(400, message);
  }

  return user;
}

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
    throw new HttpError(409, 'El email ya está registrado');
  }

  // Hashear password
  const password_hash = await hashPassword(password);

  // Crear usuario
  let user;
  try {
    user = await createUser(db, {
      email: cleanEmail,
      password_hash,
      name: cleanName
    });
  } catch (error) {
    // Registro concurrente con el mismo email
    if (/UNIQUE/i.test(error.message || '')) {
      throw new HttpError(409, 'El email ya está registrado');
    }
    throw error;
  }

  // Crear servicios de pago predeterminados; si falla, revertir el usuario
  try {
    await createDefaultServices(db, user.id);
  } catch (error) {
    console.error('Error al crear servicios por defecto, revirtiendo registro:', error);
    await deleteUser(db, user.id);
    throw new HttpError(500, 'No se pudo completar el registro. Intenta nuevamente');
  }

  // Generar token JWT
  const token = await createToken(
    { userId: user.id, email: user.email },
    jwtSecret
  );

  return {
    user: toPublicUser(user),
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
  const invalidCredentials = () => new HttpError(401, 'Credenciales inválidas');

  // Validar email
  const cleanEmail = sanitizeInput(email).toLowerCase(); // Convertir a minúsculas
  if (!isValidEmail(cleanEmail)) {
    throw invalidCredentials();
  }

  // Buscar usuario
  const user = await findUserByEmail(db, cleanEmail);
  if (!user) {
    throw invalidCredentials();
  }

  // Verificar password
  const { isValid, needsRehash } = await verifyPassword(password, user.password_hash);
  if (!isValid) {
    throw invalidCredentials();
  }

  // Si el password usa formato legacy SHA-256, actualizar a bcrypt
  if (needsRehash) {
    try {
      const newHash = await hashPassword(password);
      await updateUserPasswordHash(db, user.id, newHash);
    } catch (error) {
      // No fallar el login si falla la actualización, solo loguear
      console.error(`Error al actualizar password a bcrypt para usuario ${user.id}:`, error);
    }
  }

  // Generar token JWT
  const token = await createToken(
    { userId: user.id, email: user.email },
    jwtSecret
  );

  return {
    user: toPublicUser(user),
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
    throw new HttpError(404, 'Usuario no encontrado');
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
  const genericMessage = { message: 'Si el email existe, se enviará un enlace de recuperación' };

  const cleanEmail = sanitizeInput(email).toLowerCase(); // Convertir a minúsculas
  if (!isValidEmail(cleanEmail)) {
    throw new Error('Email inválido');
  }

  // Buscar usuario
  const user = await findUserByEmail(db, cleanEmail);
  if (!user) {
    // Por seguridad, no revelar si el email existe o no
    return genericMessage;
  }

  // Generar token aleatorio (32 bytes = 64 caracteres hex)
  const tokenBytes = new Uint8Array(32);
  crypto.getRandomValues(tokenBytes);
  const token = Array.from(tokenBytes, byte => byte.toString(16).padStart(2, '0')).join('');
  const tokenHash = await hashResetToken(token);

  // Expiración: 1 hora
  const expiresAt = Math.floor(Date.now() / 1000) + (60 * 60);

  // Invalidar tokens anteriores y guardar el nuevo en una sola transacción
  await db.batch([
    db.prepare(`
      UPDATE password_reset_tokens
      SET used = 1
      WHERE user_id = ? AND used = 0
    `).bind(user.id),
    db.prepare(`
      INSERT INTO password_reset_tokens (user_id, token, expires_at)
      VALUES (?, ?, ?)
    `).bind(user.id, tokenHash, expiresAt)
  ]);

  // Enviar email con el link de recuperación (token en claro solo en el email)
  try {
    await sendPasswordResetEmail(resendApiKey, user.email, token, frontendUrl);
  } catch (error) {
    console.error('Error al enviar email de recuperación:', error);
    // No fallar el proceso si el email falla
  }

  return genericMessage;
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
  if (typeof token !== 'string' || !/^[0-9a-f]{64}$/i.test(token)) {
    throw new Error('Token inválido o expirado');
  }

  // Validar nueva contraseña antes de consumir el token
  const passwordValidation = validatePassword(newPassword);
  if (!passwordValidation.isValid) {
    throw new Error(passwordValidation.errors.join(', '));
  }

  const now = Math.floor(Date.now() / 1000);
  const tokenHash = await hashResetToken(token.toLowerCase());

  // Consumir el token de forma atómica: solo una request puede marcarlo como usado
  const claimed = await db.prepare(`
    UPDATE password_reset_tokens
    SET used = 1
    WHERE token = ? AND used = 0 AND expires_at > ?
    RETURNING user_id
  `).bind(tokenHash, now).first();

  if (!claimed) {
    throw new Error('Token inválido o expirado');
  }

  const user = await findUserById(db, claimed.user_id);
  if (!user) {
    throw new HttpError(404, 'Usuario no encontrado');
  }

  // Actualizar contraseña y revocar sesiones existentes
  const password_hash = await hashPassword(newPassword);
  await updateUserPasswordHash(db, user.id, password_hash, { revokeSessions: true });

  // Enviar email de confirmación
  if (resendApiKey) {
    try {
      await sendPasswordChangedEmail(resendApiKey, user.email);
    } catch (error) {
      console.error('Error al enviar email de confirmación:', error);
      // No fallar el proceso si el email falla
    }
  }
}

/**
 * Actualizar perfil de usuario
 * Cambiar el email requiere la contraseña actual.
 * @param {Object} db - D1 database binding
 * @param {number} userId - ID del usuario
 * @param {Object} userData - { name, email, currentPassword? }
 * @returns {Promise<Object>} Usuario actualizado
 */
export async function updateUserProfile(db, userId, userData) {
  const { name, email, currentPassword } = userData;

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

  const currentUser = await findUserById(db, userId);
  if (!currentUser) {
    throw new HttpError(404, 'Usuario no encontrado');
  }

  const emailChanged = currentUser.email.toLowerCase() !== cleanEmail;

  if (emailChanged) {
    if (!currentPassword) {
      throw new Error('Debes ingresar tu contraseña actual para cambiar el email');
    }
    await assertCurrentPassword(db, userId, currentPassword, 'Contraseña incorrecta');

    // Verificar si el email ya está en uso por otro usuario
    const existingUser = await findUserByEmail(db, cleanEmail);
    if (existingUser && existingUser.id !== userId) {
      throw new HttpError(409, 'El email ya está en uso');
    }
  }

  return await updateUserProfileData(db, userId, { name: cleanName, email: cleanEmail });
}

/**
 * Cambiar contraseña de usuario
 * Revoca las demás sesiones; el llamador debe emitir un token nuevo.
 * @param {Object} db - D1 database binding
 * @param {number} userId - ID del usuario
 * @param {Object} passwordData - { currentPassword, newPassword }
 * @param {string} resendApiKey - API key de Resend (opcional)
 * @returns {Promise<Object>} usuario público
 */
export async function changeUserPassword(db, userId, passwordData, resendApiKey) {
  const { currentPassword, newPassword } = passwordData;

  // Verificar contraseña actual
  const user = await assertCurrentPassword(db, userId, currentPassword);

  // Validar nueva contraseña
  const passwordValidation = validatePassword(newPassword);
  if (!passwordValidation.isValid) {
    throw new Error(passwordValidation.errors.join(', '));
  }

  if (currentPassword === newPassword) {
    throw new Error('La nueva contraseña debe ser distinta a la actual');
  }

  // Hashear y guardar nueva contraseña, revocando sesiones existentes
  const password_hash = await hashPassword(newPassword);
  await updateUserPasswordHash(db, userId, password_hash, { revokeSessions: true });

  if (resendApiKey) {
    try {
      await sendPasswordChangedEmail(resendApiKey, user.email);
    } catch (error) {
      console.error('Error al enviar email de confirmación:', error);
    }
  }

  return toPublicUser(user);
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
  const user = await findUserWithPasswordById(db, userId);
  if (!user) {
    throw new HttpError(404, 'Usuario no encontrado');
  }

  const { isValid } = await verifyPassword(password, user.password_hash);

  return isValid;
}
