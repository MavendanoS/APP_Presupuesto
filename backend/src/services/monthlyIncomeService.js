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
import { sanitizeInput, parseAmount, sanitizeNotes } from '../utils/validators.js';
import { isValidYearMonth, isValidDate } from '../utils/dates.js';
import { notFound } from '../utils/http.js';

function assertYearMonth(value, label = 'mes') {
  if (!isValidYearMonth(value)) {
    throw new Error(`Formato de ${label} invalido. Usar YYYY-MM`);
  }
}

function parseReceivedDate(value) {
  if (!value) return null;
  if (!isValidDate(value)) {
    throw new Error('Fecha de recepcion invalida. Usar YYYY-MM-DD');
  }
  return value;
}

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
  const amount = parseAmount(data.amount);

  // Validar formato year_month
  assertYearMonth(data.year_month);
  const receivedDate = parseReceivedDate(data.received_date);

  return await createMonthlyIncome(db, {
    user_id: userId,
    description,
    amount,
    year_month: data.year_month,
    received_date: receivedDate,
    notes: sanitizeNotes(data.notes)
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
    cleanUpdates.amount = parseAmount(updates.amount);
  }

  if (updates.year_month !== undefined) {
    assertYearMonth(updates.year_month);
    cleanUpdates.year_month = updates.year_month;
  }

  if (updates.received_date !== undefined) {
    cleanUpdates.received_date = parseReceivedDate(updates.received_date);
  }

  if (updates.notes !== undefined) {
    cleanUpdates.notes = sanitizeNotes(updates.notes);
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
    throw notFound('Ingreso no encontrado');
  }
  return income;
}

/**
 * Obtener historial de ingresos
 */
export async function getIncomeHistorySvc(db, userId, filters = {}) {
  if (filters.start_month) assertYearMonth(filters.start_month, 'start_month');
  if (filters.end_month) assertYearMonth(filters.end_month, 'end_month');
  return await getIncomeHistory(db, userId, filters);
}

/**
 * Obtener resumen mensual de ingresos
 * Retorna lista de ingresos + total + count
 */
export async function getIncomeMonthlySummarySvc(db, userId, yearMonth) {
  assertYearMonth(yearMonth);

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
  if (filters.start_month) assertYearMonth(filters.start_month, 'start_month');
  if (filters.end_month) assertYearMonth(filters.end_month, 'end_month');
  return await getIncomeTotalsByMonth(db, userId, filters);
}
