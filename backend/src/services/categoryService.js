/**
 * Servicio de Categorías
 * Lógica de negocio para gestión de categorías de gastos
 */

import {
  createCategory,
  getCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
  getCategoriesWithStats
} from '../db/categories.js';
import { sanitizeInput } from '../utils/validators.js';

/**
 * Crear una nueva categoría
 * @param {Object} db - D1 database binding
 * @param {number} userId
 * @param {Object} categoryData - { name, type, color?, icon? }
 * @returns {Promise<Object>} Categoría creada
 */
export async function createCategoryService(db, userId, categoryData) {
  const { name, type, color, icon } = categoryData;

  // Validaciones
  if (!name || sanitizeInput(name).length === 0) {
    throw new Error('El nombre de la categoría es requerido');
  }

  if (!type || !['payment', 'purchase', 'small_expense'].includes(type)) {
    throw new Error('Tipo de categoría inválido. Debe ser: payment, purchase o small_expense');
  }

  // Validar formato de color (hex)
  if (color) {
    const colorRegex = /^#[0-9A-Fa-f]{6}$/;
    if (!colorRegex.test(color)) {
      throw new Error('Color inválido. Usar formato hexadecimal (#RRGGBB)');
    }
  }

  const category = await createCategory(db, {
    user_id: userId,
    name: sanitizeInput(name),
    type,
    color: color || '#3B82F6',
    icon: icon || 'tag'
  });

  return category;
}

/**
 * Obtener categorías del usuario
 * @param {Object} db - D1 database binding
 * @param {number} userId
 * @param {Object} filters - Query params
 * @returns {Promise<Array>} Categorías
 */
export async function getCategoriesService(db, userId, filters = {}) {
  const parsedFilters = {
    type: filters.type
  };

  return await getCategories(db, userId, parsedFilters);
}

/**
 * Obtener una categoría específica
 * @param {Object} db - D1 database binding
 * @param {number} categoryId
 * @param {number} userId
 * @returns {Promise<Object>} Categoría
 */
export async function getCategoryByIdService(db, categoryId, userId) {
  const category = await getCategoryById(db, categoryId, userId);

  if (!category) {
    throw new Error('Categoría no encontrada');
  }

  return category;
}

/**
 * Actualizar una categoría
 * @param {Object} db - D1 database binding
 * @param {number} categoryId
 * @param {number} userId
 * @param {Object} updates
 * @returns {Promise<Object>} Categoría actualizada
 */
export async function updateCategoryService(db, categoryId, userId, updates) {
  // Validaciones
  if (updates.type && !['payment', 'purchase', 'small_expense'].includes(updates.type)) {
    throw new Error('Tipo de categoría inválido');
  }

  if (updates.color) {
    const colorRegex = /^#[0-9A-Fa-f]{6}$/;
    if (!colorRegex.test(updates.color)) {
      throw new Error('Color inválido. Usar formato hexadecimal (#RRGGBB)');
    }
  }

  // Sanitizar inputs de texto
  const cleanUpdates = {
    ...updates,
    name: updates.name ? sanitizeInput(updates.name) : undefined
  };

  return await updateCategory(db, categoryId, userId, cleanUpdates);
}

/**
 * Eliminar una categoría
 * @param {Object} db - D1 database binding
 * @param {number} categoryId
 * @param {number} userId
 * @returns {Promise<boolean>}
 */
export async function deleteCategoryService(db, categoryId, userId) {
  return await deleteCategory(db, categoryId, userId);
}

/**
 * Obtener categorías con estadísticas
 * @param {Object} db - D1 database binding
 * @param {number} userId
 * @param {Object} filters
 * @returns {Promise<Array>} Categorías con stats
 */
export async function getCategoriesWithStatsService(db, userId, filters = {}) {
  return await getCategoriesWithStats(db, userId, filters);
}
