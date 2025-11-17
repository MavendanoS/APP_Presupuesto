/**
 * Servicio de Autenticación
 * Lógica de negocio para registro, login y gestión de usuarios
 */

import { hashPassword, verifyPassword } from '../utils/hash.js';
import { createToken } from '../utils/jwt.js';
import { isValidEmail, validatePassword, validateName, sanitizeInput } from '../utils/validators.js';
import { createUser, findUserByEmail, findUserById } from '../db/users.js';

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
  const cleanEmail = sanitizeInput(email);
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
  const cleanEmail = sanitizeInput(email);
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
