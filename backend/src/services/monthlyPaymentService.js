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

/**
 * Crear o actualizar un pago mensual
 * @param {Object} db - D1 database binding
 * @param {number} userId
 * @param {Object} data - { service_id, amount, year_month, paid_date?, notes? }
 * @returns {Promise<Object>} Pago creado/actualizado
 */
export async function upsertPaymentSvc(db, userId, data) {
  // Validar que el servicio existe y pertenece al usuario
  const service = await getPaymentServiceById(db, data.service_id, userId);
  if (!service) {
    throw new Error('Servicio no encontrado');
  }

  // Validar monto
  if (!data.amount || data.amount <= 0) {
    throw new Error('El monto debe ser mayor a 0');
  }

  // Validar formato year_month
  const yearMonthRegex = /^\d{4}-(0[1-9]|1[0-2])$/;
  if (!data.year_month || !yearMonthRegex.test(data.year_month)) {
    throw new Error('Formato de mes invalido. Usar YYYY-MM');
  }

  // Validar paid_date si se proporciona
  if (data.paid_date) {
    const dateObj = new Date(data.paid_date);
    if (isNaN(dateObj.getTime())) {
      throw new Error('Fecha de pago invalida');
    }
  }

  return await upsertMonthlyPayment(db, {
    ...data,
    user_id: userId
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
  const yearMonthRegex = /^\d{4}-(0[1-9]|1[0-2])$/;
  if (!yearMonth || !yearMonthRegex.test(yearMonth)) {
    throw new Error('Formato de mes invalido. Usar YYYY-MM');
  }

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
  const parsedFilters = { ...filters };

  if (filters.service_ids && typeof filters.service_ids === 'string') {
    parsedFilters.service_ids = filters.service_ids
      .split(',')
      .map(id => parseInt(id))
      .filter(id => !isNaN(id));
  }

  return await getPaymentHistory(db, userId, parsedFilters);
}

/**
 * Obtener promedios de servicios
 * @param {Object} db - D1 database binding
 * @param {number} userId
 * @param {number} months - Cantidad de meses para promediar
 * @param {string|null} serviceIds - IDs separados por coma
 * @returns {Promise<Array>} Promedios
 */
export async function getAveragesSvc(db, userId, months = 3, serviceIds = null) {
  const m = parseInt(months);
  if (isNaN(m) || m < 1 || m > 24) {
    throw new Error('Meses debe ser entre 1 y 24');
  }

  let parsedServiceIds = null;
  if (serviceIds && typeof serviceIds === 'string') {
    parsedServiceIds = serviceIds
      .split(',')
      .map(id => parseInt(id))
      .filter(id => !isNaN(id));
  }

  return await getServiceAverages(db, userId, m, parsedServiceIds);
}

/**
 * Obtener resumen de presupuesto mensual
 * @param {Object} db - D1 database binding
 * @param {number} userId
 * @param {string} yearMonth - Formato YYYY-MM
 * @param {number} avgMonths - Meses para promediar
 * @returns {Promise<Object>} Resumen con checklist enriquecido
 */
export async function getBudgetSummarySvc(db, userId, yearMonth, avgMonths = 3) {
  const yearMonthRegex = /^\d{4}-(0[1-9]|1[0-2])$/;
  if (!yearMonth || !yearMonthRegex.test(yearMonth)) {
    throw new Error('Formato de mes invalido. Usar YYYY-MM');
  }

  const parsedAvgMonths = parseInt(avgMonths) || 3;

  // Obtener checklist, promedios, totales e ingresos en paralelo
  const [checklist, averages, totals, incomes, incomesTotal] = await Promise.all([
    getMonthlyChecklist(db, userId, yearMonth),
    getServiceAverages(db, userId, parsedAvgMonths),
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
    .reduce((sum, item) => sum + item.amount, 0);
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
