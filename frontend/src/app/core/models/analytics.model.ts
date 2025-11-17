import { ExpenseType } from './expense.model';

export interface DashboardMetrics {
  period: {
    start_date: string;
    end_date: string;
  };
  income: {
    total: number;
    count: number;
    average: number;
    recurring_total: number;
    recurring_count: number;
  };
  expenses: {
    total: number;
    by_type: {
      type: ExpenseType;
      count: number;
      total: number;
      average: number;
    }[];
  };
  balance: number;
  top_categories: {
    id: number;
    name: string;
    color: string;
    icon: string;
    expense_count: number;
    total_amount: number;
  }[];
}

export interface ChartsData {
  time_series: {
    expenses: {
      period: string;
      type: ExpenseType;
      total: number;
    }[];
    income: {
      period: string;
      total: number;
    }[];
  };
  distribution: {
    by_category: {
      id: number;
      name: string;
      color: string;
      type: ExpenseType;
      total: number;
      count: number;
    }[];
  };
  group_by: 'day' | 'week' | 'month';
}

export interface TrendsData {
  monthly_trends: {
    month: string;
    type: ExpenseType;
    total: number;
    count: number;
    average: number;
  }[];
  averages: {
    type: ExpenseType;
    avg_monthly_total: number;
    max_monthly_total: number;
    min_monthly_total: number;
  }[];
  anomalies: {
    id: number;
    type: ExpenseType;
    amount: number;
    description: string;
    date: string;
    category_name: string;
    type_average: number;
  }[];
  periods_analyzed: number;
}

export interface PredictionsData {
  predictions: {
    month: string;
    predicted_income: number;
    predicted_expenses: {
      [key in ExpenseType]?: number;
    };
    predicted_balance: number;
  }[];
  based_on_months: number;
  confidence: 'low' | 'medium' | 'high';
}
