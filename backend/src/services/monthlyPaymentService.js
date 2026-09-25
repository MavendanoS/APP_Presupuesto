/**
 * Servicio de Pagos Mensuales
 * Logica de negocio para tracking de pagos mensuales
 */

import {
  upsertMonthlyPayment,
  deleteMonthlyPayment,
  getMonthlyChecklist,
  getPaymentHistory,
  getServiceAverages,
  getMonthlyTotals
} from '../db/monthlyPayments.js';
import { getPaymentServiceById } from '../db/paymentServices.js';
import { getMonthlyIncomeTotal, getIncomesByMonth } from '../db/monthlyIncomes.js';
import { notFound } from '../utils/http.js';
import { isValidYearMonth, isValidDate } from '../utils/dates.js';
import { parseAmount, sanitizeNotes } from '../utils/validators.js';
import { parseIdList } from '../utils/ids.js';

const MIN_AVG_MONTHS = 1;
const MAX_AVG_MONTHS = 24;

function assertYearMonth(value, label = 'mes') {
  if (!isValidYearMonth(value)) {
    throw new Error(`Formato de ${label} invalido. Usar YYYY-MM`);
  }
}

function parseAvgMonths(value, fallback = 3) {
  if (value === undefined || value === null || value === '') return fallback;
  const m = Number(value);
  if (!Number.isInteger(m) || m < MIN_AVG_MONTHS || m > MAX_AVG_MONTHS) {
    throw new Error(`Meses debe ser un entero entre ${MIN_AVG_MONTHS} y ${MAX_AVG_MONTHS}`);
  }
  return m;
}

/**
 * Crear o actualizar un pago mensual
 * @param {Object} db - D1 database binding
 * @param {number} userId
 * @param {Object} data - { service_id, amount, year_month, paid_date?, notes? }
 * @returns {Promise<Object>} Pago creado/actualizado
 */
export async function upsertPaymentSvc(db, userId, data) {
  const serviceId = Number(data.service_id);
  if (!Number.isInteger(serviceId) || serviceId <= 0) {
    throw new Error('Servicio invalido');
  }

  // Validar que el servicio existe, pertenece al usuario y está activo
  const service = await getPaymentServiceById(db, serviceId, userId);
  if (!service) {
    throw notFound('Servicio no encontrado');
  }
  if (!service.is_active) {
    throw new Error('No se pueden registrar pagos en un servicio inactivo');
  }

  const amount = parseAmount(data.amount);
  assertYearMonth(data.year_month);

  // paid_date: fecha estricta YYYY-MM-DD
  let paidDate = null;
  if (data.paid_date) {
    if (!isValidDate(data.paid_date)) {
      throw new Error('Fecha de pago invalida. Usar YYYY-MM-DD');
    }
    paidDate = data.paid_date;
  }

  return await upsertMonthlyPayment(db, {
    user_id: userId,
    service_id: serviceId,
    amount,
    year_month: data.year_month,
    paid_date: paidDate,
    notes: sanitizeNotes(data.notes)
  });
}

/**
 * Eliminar un pago mensual
 * @param {Object} db - D1 database binding
 * @param {number} paymentId
 * @param {number} userId
 * @returns {Promise<boolean>}
 */
export async function deletePaymentSvc(db, paymentId, userId) {
  return await deleteMonthlyPayment(db, paymentId, userId);
}

/**
 * Obtener checklist mensual de pagos
 * @param {Object} db - D1 database binding
 * @param {number} userId
 * @param {string} yearMonth - Formato YYYY-MM
 * @returns {Promise<Array>} Checklist
 */
export async function getChecklistSvc(db, userId, yearMonth) {
  assertYearMonth(yearMonth);
  return await getMonthlyChecklist(db, userId, yearMonth);
}

/**
 * Obtener historial de pagos
 * @param {Object} db - D1 database binding
 * @param {number} userId
 * @param {Object} filters - { service_ids?, start_month?, end_month? }
 * @returns {Promise<Array>} Historial
 */
export async function getHistorySvc(db, userId, filters = {}) {
  if (filters.start_month) assertYearMonth(filters.start_month, 'start_month');
  if (filters.end_month) assertYearMonth(filters.end_month, 'end_month');

  return await getPaymentHistory(db, userId, {
    service_ids: parseIdList(filters.service_ids),
    start_month: filters.start_month || null,
    end_month: filters.end_month || null
  });
}

/**
 * Obtener promedios de servicios (N meses anteriores al mes actual)
 * @param {Object} db - D1 database binding
 * @param {number} userId
 * @param {number} months - Cantidad de meses para promediar
 * @param {string|null} serviceIds - IDs separados por coma
 * @returns {Promise<Array>} Promedios
 */
export async function getAveragesSvc(db, userId, months = 3, serviceIds = null) {
  const m = parseAvgMonths(months);
  return await getServiceAverages(db, userId, m, parseIdList(serviceIds));
}

/**
 * Obtener resumen de presupuesto mensual
 * Los promedios se calculan sobre los N meses anteriores al mes consultado.
 * @param {Object} db - D1 database binding
 * @param {number} userId
 * @param {string} yearMonth - Formato YYYY-MM
 * @param {number} avgMonths - Meses para promediar
 * @returns {Promise<Object>} Resumen con checklist enriquecido
 */
export async function getBudgetSummarySvc(db, userId, yearMonth, avgMonths = 3) {
  assertYearMonth(yearMonth);
  const parsedAvgMonths = parseAvgMonths(avgMonths);

  // Obtener checklist, promedios, totales e ingresos en paralelo
  const [checklist, averages, totals, incomes, incomesTotal] = await Promise.all([
    getMonthlyChecklist(db, userId, yearMonth),
    getServiceAverages(db, userId, parsedAvgMonths, null, yearMonth),
    getMonthlyTotals(db, userId, yearMonth),
    getIncomesByMonth(db, userId, yearMonth),
    getMonthlyIncomeTotal(db, userId, yearMonth)
  ]);

  // Construir mapa de promedios
  const avgMap = {};
  for (const avg of averages) {
    avgMap[avg.service_id] = avg;
  }

  // Enriquecer checklist con promedios y expected_amount
  const enrichedChecklist = checklist.map(item => {
    const avg = avgMap[item.service_id];
    // Si el servicio tiene expected_amount manual, usarlo; si no, usar promedio
    const effectiveExpected = item.expected_amount != null ? item.expected_amount : (avg?.average_amount || 0);
    return {
      ...item,
      average_amount: avg?.average_amount || 0,
      min_amount: avg?.min_amount || 0,
      max_amount: avg?.max_amount || 0,
      months_with_data: avg?.months_with_data || 0,
      effective_expected: effectiveExpected
    };
  });

  const totalExpected = enrichedChecklist.reduce(
    (sum, item) => sum + (item.effective_expected || 0), 0
  );
  const totalPaid = enrichedChecklist
    .filter(i => i.is_paid)
    .reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const paidCount = enrichedChecklist.filter(i => i.is_paid).length;

  return {
    year_month: yearMonth,
    avg_months: parsedAvgMonths,
    checklist: enrichedChecklist,
    totals,
    incomes: {
      list: incomes,
      total: incomesTotal.total,
      count: incomesTotal.count
    },
    summary: {
      total_expected: totalExpected,
      total_paid: totalPaid,
      remaining: totalExpected - totalPaid,
      paid_count: paidCount,
      total_count: enrichedChecklist.length,
      total_incomes: incomesTotal.total,
      balance: incomesTotal.total - totalPaid,
      projected_balance: incomesTotal.total - totalExpected
    }
  };
}
