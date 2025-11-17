/**
 * Servicio de Ingresos
 * Lógica de negocio para gestión de ingresos
 */

import {
  createIncome,
  getIncomes,
  getIncomeById,
  updateIncome,
  deleteIncome,
  getIncomesSummary,
  getRecurringIncomes
} from '../db/income.js';
import { sanitizeInput } from '../utils/validators.js';

/**
 * Crear un nuevo ingreso
 * @param {Object} db - D1 database binding
 * @param {number} userId
 * @param {Object} incomeData - { source, amount, date, is_recurring?, frequency?, notes? }
 * @returns {Promise<Object>} Ingreso creado
 */
export async function createIncomeService(db, userId, incomeData) {
  const { source, amount, date, is_recurring, frequency, notes } = incomeData;

  // Validaciones
  if (!source || sanitizeInput(source).length === 0) {
    throw new Error('La fuente del ingreso es requerida');
  }

  if (!amount || amount <= 0) {
    throw new Error('El monto debe ser mayor a 0');
  }

  if (!date) {
    throw new Error('La fecha es requerida');
  }

  // Validar formato de fecha (YYYY-MM-DD)
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) {
    throw new Error('Formato de fecha inválido. Usar YYYY-MM-DD');
  }

  // Validar frecuencia si es recurrente
  if (is_recurring && frequency) {
    const validFrequencies = ['monthly', 'weekly', 'biweekly', 'annual', 'once'];
    if (!validFrequencies.includes(frequency)) {
      throw new Error('Frecuencia inválida. Debe ser: monthly, weekly, biweekly, annual o once');
    }
  }

  const income = await createIncome(db, {
    user_id: userId,
    source: sanitizeInput(source),
    amount: parseFloat(amount),
    date,
    is_recurring: is_recurring || false,
    frequency: frequency || 'once',
    notes: notes ? sanitizeInput(notes) : null
  });

  return income;
}

/**
 * Obtener ingresos del usuario
 * @param {Object} db - D1 database binding
 * @param {number} userId
 * @param {Object} filters - Query params
 * @returns {Promise<Object>} { incomes, total, limit, offset }
 */
export async function getIncomesService(db, userId, filters = {}) {
  const parsedFilters = {
    is_recurring: filters.is_recurring !== undefined ? filters.is_recurring === 'true' : undefined,
    start_date: filters.start_date,
    end_date: filters.end_date,
    limit: filters.limit ? Math.min(parseInt(filters.limit), 100) : 50,
    offset: filters.offset ? parseInt(filters.offset) : 0
  };

  return await getIncomes(db, userId, parsedFilters);
}

/**
 * Obtener un ingreso específico
 * @param {Object} db - D1 database binding
 * @param {number} incomeId
 * @param {number} userId
 * @returns {Promise<Object>} Ingreso
 */
export async function getIncomeByIdService(db, incomeId, userId) {
  const income = await getIncomeById(db, incomeId, userId);

  if (!income) {
    throw new Error('Ingreso no encontrado');
  }

  return income;
}

/**
 * Actualizar un ingreso
 * @param {Object} db - D1 database binding
 * @param {number} incomeId
 * @param {number} userId
 * @param {Object} updates
 * @returns {Promise<Object>} Ingreso actualizado
 */
export async function updateIncomeService(db, incomeId, userId, updates) {
  // Validaciones
  if (updates.amount !== undefined && updates.amount <= 0) {
    throw new Error('El monto debe ser mayor a 0');
  }

  if (updates.date) {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(updates.date)) {
      throw new Error('Formato de fecha inválido. Usar YYYY-MM-DD');
    }
  }

  if (updates.frequency) {
    const validFrequencies = ['monthly', 'weekly', 'biweekly', 'annual', 'once'];
    if (!validFrequencies.includes(updates.frequency)) {
      throw new Error('Frecuencia inválida');
    }
  }

  // Sanitizar inputs de texto
  const cleanUpdates = {
    ...updates,
    source: updates.source ? sanitizeInput(updates.source) : undefined,
    notes: updates.notes !== undefined ? (updates.notes ? sanitizeInput(updates.notes) : null) : undefined,
    amount: updates.amount ? parseFloat(updates.amount) : undefined
  };

  return await updateIncome(db, incomeId, userId, cleanUpdates);
}

/**
 * Eliminar un ingreso
 * @param {Object} db - D1 database binding
 * @param {number} incomeId
 * @param {number} userId
 * @returns {Promise<boolean>}
 */
export async function deleteIncomeService(db, incomeId, userId) {
  return await deleteIncome(db, incomeId, userId);
}

/**
 * Obtener resumen de ingresos
 * @param {Object} db - D1 database binding
 * @param {number} userId
 * @param {Object} filters
 * @returns {Promise<Object>} Resumen
 */
export async function getIncomesSummaryService(db, userId, filters = {}) {
  return await getIncomesSummary(db, userId, filters);
}

/**
 * Obtener ingresos recurrentes
 * @param {Object} db - D1 database binding
 * @param {number} userId
 * @returns {Promise<Array>} Ingresos recurrentes
 */
export async function getRecurringIncomesService(db, userId) {
  return await getRecurringIncomes(db, userId);
}
