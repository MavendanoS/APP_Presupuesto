/**
 * Servicio de Autenticación
 * Lógica de negocio para registro, login y gestión de usuarios
 */

import { hashPassword, verifyPassword } from '../utils/hash.js';
import { createToken } from '../utils/jwt.js';
import { isValidEmail, validatePassword, validateName, sanitizeInput } from '../utils/validators.js';
import { createUser, findUserByEmail, findUserById } from '../db/users.js';
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

  // Crear categorías predeterminadas para el nuevo usuario
  await createDefaultCategories(db, user.id);

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
  const isValidPassword = await verifyPassword(password, user.password_hash);
  if (!isValidPassword) {
    throw new Error('Credenciales inválidas');
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
 * Crear categorías predeterminadas para un nuevo usuario
 * @param {Object} db - D1 database binding
 * @param {number} userId - ID del usuario
 */
async function createDefaultCategories(db, userId) {
  const defaultCategories = [
    // Pagos (payments)
    { name: 'Arriendo', type: 'payment', color: '#EF4444', icon: 'home' },
    { name: 'Servicios Básicos', type: 'payment', color: '#F59E0B', icon: 'bolt' },
    { name: 'Internet/Teléfono', type: 'payment', color: '#3B82F6', icon: 'wifi' },
    { name: 'Transporte', type: 'payment', color: '#8B5CF6', icon: 'car' },

    // Compras (purchases)
    { name: 'Supermercado', type: 'purchase', color: '#10B981', icon: 'shopping-cart' },
    { name: 'Farmacia', type: 'purchase', color: '#EC4899', icon: 'heart' },
    { name: 'Ropa', type: 'purchase', color: '#6366F1', icon: 'shirt' },
    { name: 'Electrónica', type: 'purchase', color: '#14B8A6', icon: 'laptop' },

    // Gastos hormiga (small_expense)
    { name: 'Café', type: 'small_expense', color: '#92400E', icon: 'coffee' },
    { name: 'Snacks', type: 'small_expense', color: '#F97316', icon: 'cookie' },
    { name: 'Transporte público', type: 'small_expense', color: '#06B6D4', icon: 'bus' },
    { name: 'Otros gastos menores', type: 'small_expense', color: '#64748B', icon: 'dots' }
  ];

  for (const category of defaultCategories) {
    await db.prepare(`
      INSERT INTO expense_categories (user_id, name, type, color, icon)
      VALUES (?, ?, ?, ?, ?)
    `).bind(userId, category.name, category.type, category.color, category.icon).run();
  }
}
