/**
 * Servicio de Ingresos Mensuales
 * Logica de negocio + validaciones para tracking de ingresos
 */

import {
  createMonthlyIncome,
  updateMonthlyIncome,
  deleteMonthlyIncome,
  getMonthlyIncomeById,
  getIncomesByMonth,
  getIncomeHistory,
  getMonthlyIncomeTotal,
  getIncomeTotalsByMonth
} from '../db/monthlyIncomes.js';
import { sanitizeInput } from '../utils/validators.js';

const YEAR_MONTH_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;

/**
 * Crear un ingreso mensual
 * @param {Object} db - D1 database binding
 * @param {number} userId
 * @param {Object} data - { description, amount, year_month, received_date?, notes? }
 * @returns {Promise<Object>}
 */
export async function createIncomeSvc(db, userId, data) {
  // Validar descripcion
  const description = sanitizeInput(data.description || '');
  if (!description || description.length < 2) {
    throw new Error('La descripcion es requerida (minimo 2 caracteres)');
  }
  if (description.length > 100) {
    throw new Error('La descripcion es demasiado larga (maximo 100 caracteres)');
  }

  // Validar monto
  const amount = Number(data.amount);
  if (!amount || isNaN(amount) || amount <= 0) {
    throw new Error('El monto debe ser un numero mayor a 0');
  }

  // Validar formato year_month
  if (!data.year_month || !YEAR_MONTH_REGEX.test(data.year_month)) {
    throw new Error('Formato de mes invalido. Usar YYYY-MM');
  }

  // Validar received_date si se proporciona
  if (data.received_date) {
    const dateObj = new Date(data.received_date);
    if (isNaN(dateObj.getTime())) {
      throw new Error('Fecha de recepcion invalida');
    }
  }

  return await createMonthlyIncome(db, {
    user_id: userId,
    description,
    amount,
    year_month: data.year_month,
    received_date: data.received_date || null,
    notes: data.notes ? sanitizeInput(data.notes) : null
  });
}

/**
 * Actualizar un ingreso mensual
 * @param {Object} db - D1 database binding
 * @param {number} incomeId
 * @param {number} userId
 * @param {Object} updates
 * @returns {Promise<Object>}
 */
export async function updateIncomeSvc(db, incomeId, userId, updates) {
  if (isNaN(incomeId)) {
    throw new Error('ID de ingreso invalido');
  }

  const cleanUpdates = {};

  if (updates.description !== undefined) {
    const description = sanitizeInput(updates.description);
    if (!description || description.length < 2) {
      throw new Error('La descripcion es requerida (minimo 2 caracteres)');
    }
    if (description.length > 100) {
      throw new Error('La descripcion es demasiado larga (maximo 100 caracteres)');
    }
    cleanUpdates.description = description;
  }

  if (updates.amount !== undefined) {
    const amount = Number(updates.amount);
    if (!amount || isNaN(amount) || amount <= 0) {
      throw new Error('El monto debe ser un numero mayor a 0');
    }
    cleanUpdates.amount = amount;
  }

  if (updates.year_month !== undefined) {
    if (!YEAR_MONTH_REGEX.test(updates.year_month)) {
      throw new Error('Formato de mes invalido. Usar YYYY-MM');
    }
    cleanUpdates.year_month = updates.year_month;
  }

  if (updates.received_date !== undefined) {
    if (updates.received_date) {
      const dateObj = new Date(updates.received_date);
      if (isNaN(dateObj.getTime())) {
        throw new Error('Fecha de recepcion invalida');
      }
    }
    cleanUpdates.received_date = updates.received_date || null;
  }

  if (updates.notes !== undefined) {
    cleanUpdates.notes = updates.notes ? sanitizeInput(updates.notes) : null;
  }

  return await updateMonthlyIncome(db, incomeId, userId, cleanUpdates);
}

/**
 * Eliminar un ingreso
 */
export async function deleteIncomeSvc(db, incomeId, userId) {
  if (isNaN(incomeId)) {
    throw new Error('ID de ingreso invalido');
  }
  return await deleteMonthlyIncome(db, incomeId, userId);
}

/**
 * Obtener un ingreso por ID
 */
export async function getIncomeByIdSvc(db, incomeId, userId) {
  if (isNaN(incomeId)) {
    throw new Error('ID de ingreso invalido');
  }
  const income = await getMonthlyIncomeById(db, incomeId, userId);
  if (!income) {
    throw new Error('Ingreso no encontrado');
  }
  return income;
}

/**
 * Obtener ingresos de un mes especifico
 */
export async function getIncomesByMonthSvc(db, userId, yearMonth) {
  if (!yearMonth || !YEAR_MONTH_REGEX.test(yearMonth)) {
    throw new Error('Formato de mes invalido. Usar YYYY-MM');
  }
  return await getIncomesByMonth(db, userId, yearMonth);
}

/**
 * Obtener historial de ingresos
 */
export async function getIncomeHistorySvc(db, userId, filters = {}) {
  if (filters.start_month && !YEAR_MONTH_REGEX.test(filters.start_month)) {
    throw new Error('Formato de start_month invalido. Usar YYYY-MM');
  }
  if (filters.end_month && !YEAR_MONTH_REGEX.test(filters.end_month)) {
    throw new Error('Formato de end_month invalido. Usar YYYY-MM');
  }
  return await getIncomeHistory(db, userId, filters);
}

/**
 * Obtener resumen mensual de ingresos
 * Retorna lista de ingresos + total + count
 */
export async function getIncomeMonthlySummarySvc(db, userId, yearMonth) {
  if (!yearMonth || !YEAR_MONTH_REGEX.test(yearMonth)) {
    throw new Error('Formato de mes invalido. Usar YYYY-MM');
  }

  const [incomes, totals] = await Promise.all([
    getIncomesByMonth(db, userId, yearMonth),
    getMonthlyIncomeTotal(db, userId, yearMonth)
  ]);

  return {
    year_month: yearMonth,
    incomes,
    total: totals.total,
    count: totals.count
  };
}

/**
 * Obtener evolucion de totales por mes (para graficos)
 */
export async function getIncomeTotalsByMonthSvc(db, userId, filters = {}) {
  if (filters.start_month && !YEAR_MONTH_REGEX.test(filters.start_month)) {
    throw new Error('Formato de start_month invalido. Usar YYYY-MM');
  }
  if (filters.end_month && !YEAR_MONTH_REGEX.test(filters.end_month)) {
    throw new Error('Formato de end_month invalido. Usar YYYY-MM');
  }
  return await getIncomeTotalsByMonth(db, userId, filters);
}
