/**
 * Servicio de Analytics
 * Lógica de negocio para análisis y predicciones
 */

import {
  getDashboardMetrics,
  getChartsData,
  getTrends,
  getPredictions,
  comparePeriods,
  getExportData
} from '../db/analytics.js';
import { sanitizeInput } from '../utils/validators.js';

/**
 * Validar y normalizar fechas
 */
function validateDateRange(startDate, endDate) {
  const start = startDate || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
  const end = endDate || new Date().toISOString().slice(0, 10);

  // Validar formato YYYY-MM-DD
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(start) || !dateRegex.test(end)) {
    throw new Error('Formato de fecha inválido. Use YYYY-MM-DD');
  }

  // Validar que start_date <= end_date
  if (start > end) {
    throw new Error('La fecha de inicio debe ser anterior a la fecha de fin');
  }

  return { start, end };
}

/**
 * Obtener métricas del dashboard
 */
export async function getDashboardService(db, userId, filters = {}) {
  const { start_date, end_date } = filters;
  const { start, end } = validateDateRange(start_date, end_date);

  const metrics = await getDashboardMetrics(db, userId, start, end);
  return metrics;
}

/**
 * Obtener datos para gráficos
 */
export async function getChartsService(db, userId, filters = {}) {
  const { start_date, end_date, group_by } = filters;
  const { start, end } = validateDateRange(start_date, end_date);

  // Validar group_by
  const validGroupBy = ['day', 'week', 'month'];
  const groupBy = validGroupBy.includes(group_by) ? group_by : 'day';

  const charts = await getChartsData(db, userId, start, end, groupBy);
  return charts;
}

/**
 * Obtener tendencias
 */
export async function getTrendsService(db, userId, filters = {}) {
  const { periods } = filters;

  // Validar períodos (1-12 meses)
  let periodsNum = parseInt(periods) || 6;
  if (periodsNum < 1) periodsNum = 1;
  if (periodsNum > 12) periodsNum = 12;

  const trends = await getTrends(db, userId, periodsNum);
  return trends;
}

/**
 * Obtener predicciones
 */
export async function getPredictionsService(db, userId, filters = {}) {
  const { months_ahead } = filters;

  // Validar meses adelante (1-6 meses)
  let monthsAhead = parseInt(months_ahead) || 3;
  if (monthsAhead < 1) monthsAhead = 1;
  if (monthsAhead > 6) monthsAhead = 6;

  const predictions = await getPredictions(db, userId, monthsAhead);
  return predictions;
}

/**
 * Comparar períodos
 */
export async function comparePeriodsService(db, userId, filters = {}) {
  const {
    period1_start,
    period1_end,
    period2_start,
    period2_end
  } = filters;

  if (!period1_start || !period1_end || !period2_start || !period2_end) {
    throw new Error('Se requieren las 4 fechas para comparar períodos');
  }

  // Validar ambos períodos
  const period1 = validateDateRange(period1_start, period1_end);
  const period2 = validateDateRange(period2_start, period2_end);

  const comparison = await comparePeriods(
    db,
    userId,
    period1.start,
    period1.end,
    period2.start,
    period2.end
  );

  return comparison;
}

/**
 * Exportar datos a CSV
 */
export async function exportToCSVService(db, userId, filters = {}) {
  const { start_date, end_date, type } = filters;
  const { start, end } = validateDateRange(start_date, end_date);

  // Validar tipo de exportación
  const validTypes = ['all', 'expenses', 'income'];
  const exportType = validTypes.includes(type) ? type : 'all';

  const data = await getExportData(db, userId, start, end, exportType);

  // Generar CSV
  let csv = '';

  // CSV de gastos
  if (data.expenses.length > 0) {
    csv += 'GASTOS\n';
    csv += 'ID,Tipo,Monto,Descripción,Fecha,Categoría,Notas\n';
    for (const expense of data.expenses) {
      csv += `${expense.id},`;
      csv += `${expense.type},`;
      csv += `${expense.amount},`;
      csv += `"${sanitizeInput(expense.description)}",`;
      csv += `${expense.date},`;
      csv += `"${expense.category_name || 'Sin categoría'}",`;
      csv += `"${sanitizeInput(expense.notes || '')}"\n`;
    }
    csv += '\n';
  }

  // CSV de ingresos
  if (data.income.length > 0) {
    csv += 'INGRESOS\n';
    csv += 'ID,Fuente,Monto,Fecha,Recurrente,Frecuencia,Notas\n';
    for (const income of data.income) {
      csv += `${income.id},`;
      csv += `"${sanitizeInput(income.source)}",`;
      csv += `${income.amount},`;
      csv += `${income.date},`;
      csv += `${income.is_recurring ? 'Sí' : 'No'},`;
      csv += `${income.frequency || 'N/A'},`;
      csv += `"${sanitizeInput(income.notes || '')}"\n`;
    }
    csv += '\n';
  }

  // Resumen
  csv += 'RESUMEN\n';
  csv += `Período,${data.summary.period.start_date} a ${data.summary.period.end_date}\n`;
  csv += `Total Ingresos,${data.summary.income.total}\n`;
  csv += `Total Gastos,${data.summary.expenses.total}\n`;
  csv += `Balance,${data.summary.balance}\n`;

  return {
    csv: csv,
    filename: `gastos_${start}_${end}.csv`,
    period: { start_date: start, end_date: end },
    records_count: {
      expenses: data.expenses.length,
      income: data.income.length
    }
  };
}

/**
 * Exportar datos a formato Excel (simplificado como CSV con formato mejorado)
 */
export async function exportToExcelService(db, userId, filters = {}) {
  // Por ahora, usamos el mismo CSV pero con nombre .xlsx
  // En producción, se usaría una librería como exceljs
  const result = await exportToCSVService(db, userId, filters);
  result.filename = result.filename.replace('.csv', '.xlsx');
  return result;
}
