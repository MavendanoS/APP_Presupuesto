/**
 * Servicio de Gastos
 * Lógica de negocio para gestión de gastos
 */

import {
  createExpense,
  getExpenses,
  getExpenseById,
  updateExpense,
  deleteExpense,
  getExpensesSummaryByType,
  getExpensesSummaryByCategory
} from '../db/expenses.js';
import { sanitizeInput } from '../utils/validators.js';

/**
 * Crear un nuevo gasto
 * @param {Object} db - D1 database binding
 * @param {number} userId
 * @param {Object} expenseData - { category_id?, type, amount, description, date, notes? }
 * @returns {Promise<Object>} Gasto creado
 */
export async function createExpenseService(db, userId, expenseData) {
  const { category_id, type, amount, description, date, notes } = expenseData;

  // Validaciones
  if (!type || !['payment', 'purchase', 'small_expense'].includes(type)) {
    throw new Error('Tipo de gasto inválido. Debe ser: payment, purchase o small_expense');
  }

  if (!amount || amount <= 0) {
    throw new Error('El monto debe ser mayor a 0');
  }

  if (!description || sanitizeInput(description).length === 0) {
    throw new Error('La descripción es requerida');
  }

  if (!date) {
    throw new Error('La fecha es requerida');
  }

  // Validar formato de fecha (YYYY-MM-DD)
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) {
    throw new Error('Formato de fecha inválido. Usar YYYY-MM-DD');
  }

  const expense = await createExpense(db, {
    user_id: userId,
    category_id: category_id || null,
    type,
    amount: parseFloat(amount),
    description: sanitizeInput(description),
    date,
    notes: notes ? sanitizeInput(notes) : null
  });

  return expense;
}

/**
 * Obtener gastos del usuario
 * @param {Object} db - D1 database binding
 * @param {number} userId
 * @param {Object} filters - Query params
 * @returns {Promise<Object>} { expenses, total, limit, offset }
 */
export async function getExpensesService(db, userId, filters = {}) {
  const parsedFilters = {
    type: filters.type,
    category_id: filters.category_id ? parseInt(filters.category_id) : undefined,
    start_date: filters.start_date,
    end_date: filters.end_date,
    limit: filters.limit ? Math.min(parseInt(filters.limit), 100) : 50,
    offset: filters.offset ? parseInt(filters.offset) : 0
  };

  return await getExpenses(db, userId, parsedFilters);
}

/**
 * Obtener un gasto específico
 * @param {Object} db - D1 database binding
 * @param {number} expenseId
 * @param {number} userId
 * @returns {Promise<Object>} Gasto
 */
export async function getExpenseByIdService(db, expenseId, userId) {
  const expense = await getExpenseById(db, expenseId, userId);

  if (!expense) {
    throw new Error('Gasto no encontrado');
  }

  return expense;
}

/**
 * Actualizar un gasto
 * @param {Object} db - D1 database binding
 * @param {number} expenseId
 * @param {number} userId
 * @param {Object} updates
 * @returns {Promise<Object>} Gasto actualizado
 */
export async function updateExpenseService(db, expenseId, userId, updates) {
  // Validaciones
  if (updates.type && !['payment', 'purchase', 'small_expense'].includes(updates.type)) {
    throw new Error('Tipo de gasto inválido');
  }

  if (updates.amount !== undefined && updates.amount <= 0) {
    throw new Error('El monto debe ser mayor a 0');
  }

  if (updates.date) {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(updates.date)) {
      throw new Error('Formato de fecha inválido. Usar YYYY-MM-DD');
    }
  }

  // Sanitizar inputs de texto
  const cleanUpdates = {
    ...updates,
    description: updates.description ? sanitizeInput(updates.description) : undefined,
    notes: updates.notes !== undefined ? (updates.notes ? sanitizeInput(updates.notes) : null) : undefined,
    amount: updates.amount ? parseFloat(updates.amount) : undefined
  };

  return await updateExpense(db, expenseId, userId, cleanUpdates);
}

/**
 * Eliminar un gasto
 * @param {Object} db - D1 database binding
 * @param {number} expenseId
 * @param {number} userId
 * @returns {Promise<boolean>}
 */
export async function deleteExpenseService(db, expenseId, userId) {
  return await deleteExpense(db, expenseId, userId);
}

/**
 * Obtener resumen de gastos
 * @param {Object} db - D1 database binding
 * @param {number} userId
 * @param {Object} filters
 * @returns {Promise<Object>} Resumen
 */
export async function getExpensesSummaryService(db, userId, filters = {}) {
  const [byType, byCategory] = await Promise.all([
    getExpensesSummaryByType(db, userId, filters),
    getExpensesSummaryByCategory(db, userId, filters)
  ]);

  // Calcular total general
  const totalAmount = byType.reduce((sum, item) => sum + (item.total_amount || 0), 0);
  const totalCount = byType.reduce((sum, item) => sum + (item.count || 0), 0);

  return {
    total_amount: totalAmount,
    total_count: totalCount,
    by_type: byType,
    by_category: byCategory
  };
}
