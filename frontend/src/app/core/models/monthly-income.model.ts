/**
 * Modelo de ingreso mensual (modelo simple, sin catálogo de fuentes)
 */
export interface MonthlyIncome {
  id: number;
  user_id: number;
  description: string;
  amount: number;
  year_month: string; // YYYY-MM
  received_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Payload para crear un ingreso
 */
export interface CreateIncomeRequest {
  description: string;
  amount: number;
  year_month: string;
  received_date?: string;
  notes?: string;
}

/**
 * Payload para actualizar un ingreso (campos opcionales)
 */
export interface UpdateIncomeRequest {
  description?: string;
  amount?: number;
  year_month?: string;
  received_date?: string | null;
  notes?: string | null;
}

/**
 * Resumen mensual de ingresos
 */
export interface IncomeMonthlySummary {
  year_month: string;
  incomes: MonthlyIncome[];
  total: number;
  count: number;
}

/**
 * Total de ingresos agrupado por mes (para gráficos de evolución)
 */
export interface IncomeTotalByMonth {
  year_month: string;
  total: number;
  count: number;
}

/**
 * Filtros para historial de ingresos
 */
export interface IncomeHistoryFilters {
  start_month?: string;
  end_month?: string;
}
