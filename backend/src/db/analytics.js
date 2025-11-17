/**
 * Queries de Analytics
 * Consultas agregadas para estadísticas y análisis
 */

/**
 * Obtener métricas del dashboard
 * Incluye totales de ingresos, gastos, balance, y contadores
 */
export async function getDashboardMetrics(db, userId, startDate, endDate) {
  // Totales de gastos por tipo
  const expensesByType = await db.prepare(`
    SELECT
      type,
      COUNT(*) as count,
      SUM(amount) as total,
      AVG(amount) as average
    FROM expenses
    WHERE user_id = ?
      AND date >= ?
      AND date <= ?
    GROUP BY type
  `).bind(userId, startDate, endDate).all();

  // Total de ingresos
  const incomeTotal = await db.prepare(`
    SELECT
      COUNT(*) as count,
      SUM(amount) as total,
      AVG(amount) as average
    FROM income
    WHERE user_id = ?
      AND date >= ?
      AND date <= ?
  `).bind(userId, startDate, endDate).first();

  // Ingresos recurrentes
  const recurringIncome = await db.prepare(`
    SELECT
      COUNT(*) as count,
      SUM(amount) as total
    FROM income
    WHERE user_id = ?
      AND is_recurring = 1
      AND date >= ?
      AND date <= ?
  `).bind(userId, startDate, endDate).first();

  // Total general de gastos
  const expensesTotal = await db.prepare(`
    SELECT SUM(amount) as total
    FROM expenses
    WHERE user_id = ?
      AND date >= ?
      AND date <= ?
  `).bind(userId, startDate, endDate).first();

  // Calcular balance
  const balance = (incomeTotal?.total || 0) - (expensesTotal?.total || 0);

  // Top 5 categorías con más gastos
  const topCategories = await db.prepare(`
    SELECT
      c.id,
      c.name,
      c.color,
      c.icon,
      COUNT(e.id) as expense_count,
      SUM(e.amount) as total_amount
    FROM expense_categories c
    LEFT JOIN expenses e ON c.id = e.category_id
    WHERE c.user_id = ?
      AND e.date >= ?
      AND e.date <= ?
    GROUP BY c.id
    ORDER BY total_amount DESC
    LIMIT 5
  `).bind(userId, startDate, endDate).all();

  return {
    period: { start_date: startDate, end_date: endDate },
    income: {
      total: incomeTotal?.total || 0,
      count: incomeTotal?.count || 0,
      average: incomeTotal?.average || 0,
      recurring_total: recurringIncome?.total || 0,
      recurring_count: recurringIncome?.count || 0
    },
    expenses: {
      total: expensesTotal?.total || 0,
      by_type: expensesByType.results || []
    },
    balance: balance,
    top_categories: topCategories.results || []
  };
}

/**
 * Obtener datos para gráficos
 * Series de tiempo y distribuciones
 */
export async function getChartsData(db, userId, startDate, endDate, groupBy = 'day') {
  // Gastos por día/semana/mes
  let dateFormat;
  switch (groupBy) {
    case 'week':
      dateFormat = '%Y-W%W';
      break;
    case 'month':
      dateFormat = '%Y-%m';
      break;
    default: // day
      dateFormat = '%Y-%m-%d';
  }

  const expensesTimeSeries = await db.prepare(`
    SELECT
      strftime(?, date) as period,
      type,
      SUM(amount) as total
    FROM expenses
    WHERE user_id = ?
      AND date >= ?
      AND date <= ?
    GROUP BY period, type
    ORDER BY period
  `).bind(dateFormat, userId, startDate, endDate).all();

  // Distribución de gastos por categoría
  const expensesByCategory = await db.prepare(`
    SELECT
      c.id,
      c.name,
      c.color,
      c.type,
      SUM(e.amount) as total,
      COUNT(e.id) as count
    FROM expenses e
    JOIN expense_categories c ON e.category_id = c.id
    WHERE e.user_id = ?
      AND e.date >= ?
      AND e.date <= ?
    GROUP BY c.id
    ORDER BY total DESC
  `).bind(userId, startDate, endDate).all();

  // Comparación ingresos vs gastos por período
  const incomeTimeSeries = await db.prepare(`
    SELECT
      strftime(?, date) as period,
      SUM(amount) as total
    FROM income
    WHERE user_id = ?
      AND date >= ?
      AND date <= ?
    GROUP BY period
    ORDER BY period
  `).bind(dateFormat, userId, startDate, endDate).all();

  return {
    time_series: {
      expenses: expensesTimeSeries.results || [],
      income: incomeTimeSeries.results || []
    },
    distribution: {
      by_category: expensesByCategory.results || []
    },
    group_by: groupBy
  };
}

/**
 * Obtener tendencias y patrones
 * Análisis de cambios y promedios móviles
 */
export async function getTrends(db, userId, periods = 6) {
  // Últimos N meses de datos
  const monthlyTrends = await db.prepare(`
    SELECT
      strftime('%Y-%m', date) as month,
      type,
      SUM(amount) as total,
      COUNT(*) as count,
      AVG(amount) as average
    FROM expenses
    WHERE user_id = ?
      AND date >= date('now', '-' || ? || ' months')
    GROUP BY month, type
    ORDER BY month DESC
  `).bind(userId, periods).all();

  // Promedio mensual por tipo
  const averages = await db.prepare(`
    SELECT
      type,
      AVG(monthly_total) as avg_monthly_total,
      MAX(monthly_total) as max_monthly_total,
      MIN(monthly_total) as min_monthly_total
    FROM (
      SELECT
        strftime('%Y-%m', date) as month,
        type,
        SUM(amount) as monthly_total
      FROM expenses
      WHERE user_id = ?
        AND date >= date('now', '-' || ? || ' months')
      GROUP BY month, type
    )
    GROUP BY type
  `).bind(userId, periods).all();

  // Detección de anomalías (gastos que superan 2x el promedio)
  const anomalies = await db.prepare(`
    SELECT
      e.id,
      e.type,
      e.amount,
      e.description,
      e.date,
      c.name as category_name,
      (SELECT AVG(amount) FROM expenses WHERE user_id = ? AND type = e.type) as type_average
    FROM expenses e
    LEFT JOIN expense_categories c ON e.category_id = c.id
    WHERE e.user_id = ?
      AND e.amount > (SELECT AVG(amount) * 2 FROM expenses WHERE user_id = e.user_id AND type = e.type)
      AND e.date >= date('now', '-3 months')
    ORDER BY e.date DESC
    LIMIT 10
  `).bind(userId, userId).all();

  return {
    monthly_trends: monthlyTrends.results || [],
    averages: averages.results || [],
    anomalies: anomalies.results || [],
    periods_analyzed: periods
  };
}

/**
 * Predicción simple de gastos futuros
 * Basado en promedio móvil de últimos 3 meses
 */
export async function getPredictions(db, userId, monthsAhead = 3) {
  // Calcular promedio de últimos 3 meses por tipo
  const historicalData = await db.prepare(`
    SELECT
      type,
      AVG(monthly_total) as avg_monthly_total,
      COUNT(DISTINCT month) as months_with_data
    FROM (
      SELECT
        strftime('%Y-%m', date) as month,
        type,
        SUM(amount) as monthly_total
      FROM expenses
      WHERE user_id = ?
        AND date >= date('now', '-3 months')
      GROUP BY month, type
    )
    GROUP BY type
  `).bind(userId).all();

  // Promedio de ingresos recurrentes
  const recurringIncome = await db.prepare(`
    SELECT
      SUM(amount) as monthly_income
    FROM income
    WHERE user_id = ?
      AND is_recurring = 1
      AND frequency = 'monthly'
  `).bind(userId).first();

  // Generar predicciones
  const predictions = [];
  const today = new Date();

  for (let i = 1; i <= monthsAhead; i++) {
    const futureDate = new Date(today.getFullYear(), today.getMonth() + i, 1);
    const month = futureDate.toISOString().slice(0, 7);

    const monthPrediction = {
      month: month,
      predicted_income: recurringIncome?.monthly_income || 0,
      predicted_expenses: {},
      predicted_balance: 0
    };

    let totalExpenses = 0;
    for (const row of (historicalData.results || [])) {
      const predicted = row.avg_monthly_total || 0;
      monthPrediction.predicted_expenses[row.type] = predicted;
      totalExpenses += predicted;
    }

    monthPrediction.predicted_balance = monthPrediction.predicted_income - totalExpenses;
    predictions.push(monthPrediction);
  }

  return {
    predictions: predictions,
    based_on_months: 3,
    confidence: 'low' // Predicción simple, baja confianza
  };
}

/**
 * Comparación entre períodos
 * Comparar dos rangos de fechas
 */
export async function comparePeriods(db, userId, period1Start, period1End, period2Start, period2End) {
  // Función auxiliar para obtener métricas de un período
  async function getPeriodMetrics(startDate, endDate) {
    const expenses = await db.prepare(`
      SELECT
        type,
        SUM(amount) as total,
        COUNT(*) as count
      FROM expenses
      WHERE user_id = ?
        AND date >= ?
        AND date <= ?
      GROUP BY type
    `).bind(userId, startDate, endDate).all();

    const income = await db.prepare(`
      SELECT
        SUM(amount) as total,
        COUNT(*) as count
      FROM income
      WHERE user_id = ?
        AND date >= ?
        AND date <= ?
    `).bind(userId, startDate, endDate).first();

    const expensesTotal = expenses.results?.reduce((sum, row) => sum + row.total, 0) || 0;
    const incomeTotal = income?.total || 0;

    return {
      period: { start_date: startDate, end_date: endDate },
      income: {
        total: incomeTotal,
        count: income?.count || 0
      },
      expenses: {
        total: expensesTotal,
        by_type: expenses.results || []
      },
      balance: incomeTotal - expensesTotal
    };
  }

  const period1 = await getPeriodMetrics(period1Start, period1End);
  const period2 = await getPeriodMetrics(period2Start, period2End);

  // Calcular diferencias
  const incomeDiff = period2.income.total - period1.income.total;
  const expensesDiff = period2.expenses.total - period1.expenses.total;
  const balanceDiff = period2.balance - period1.balance;

  const incomeChange = period1.income.total > 0
    ? ((incomeDiff / period1.income.total) * 100).toFixed(2)
    : 0;
  const expensesChange = period1.expenses.total > 0
    ? ((expensesDiff / period1.expenses.total) * 100).toFixed(2)
    : 0;

  return {
    period_1: period1,
    period_2: period2,
    comparison: {
      income: {
        difference: incomeDiff,
        percentage_change: parseFloat(incomeChange)
      },
      expenses: {
        difference: expensesDiff,
        percentage_change: parseFloat(expensesChange)
      },
      balance: {
        difference: balanceDiff
      }
    }
  };
}

/**
 * Obtener datos para exportación CSV
 */
export async function getExportData(db, userId, startDate, endDate, type = 'all') {
  const data = {
    expenses: [],
    income: [],
    summary: {}
  };

  if (type === 'all' || type === 'expenses') {
    const expenses = await db.prepare(`
      SELECT
        e.id,
        e.type,
        e.amount,
        e.description,
        e.date,
        e.notes,
        c.name as category_name,
        c.color as category_color
      FROM expenses e
      LEFT JOIN expense_categories c ON e.category_id = c.id
      WHERE e.user_id = ?
        AND e.date >= ?
        AND e.date <= ?
      ORDER BY e.date DESC
    `).bind(userId, startDate, endDate).all();

    data.expenses = expenses.results || [];
  }

  if (type === 'all' || type === 'income') {
    const income = await db.prepare(`
      SELECT
        id,
        source,
        amount,
        date,
        is_recurring,
        frequency,
        notes
      FROM income
      WHERE user_id = ?
        AND date >= ?
        AND date <= ?
      ORDER BY date DESC
    `).bind(userId, startDate, endDate).all();

    data.income = income.results || [];
  }

  // Resumen
  const summary = await getDashboardMetrics(db, userId, startDate, endDate);
  data.summary = summary;

  return data;
}
