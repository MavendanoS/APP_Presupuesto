export type ExpenseType = 'payment' | 'purchase' | 'small_expense';

export interface Expense {
  id: number;
  user_id: number;
  category_id?: number;
  type: ExpenseType;
  amount: number;
  description: string;
  date: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  category_name?: string;
  category_color?: string;
  category_icon?: string;
}

export interface CreateExpenseRequest {
  type: ExpenseType;
  category_id?: number;
  amount: number;
  description: string;
  date: string;
  notes?: string;
}

export interface ExpenseSummary {
  by_type: {
    type: ExpenseType;
    count: number;
    total: number;
    average: number;
    min: number;
    max: number;
  }[];
  by_category: {
    id: number;
    name: string;
    color: string;
    icon: string;
    count: number;
    total: number;
  }[];
}

export interface ExpenseFilters {
  type?: ExpenseType;
  category_id?: number;
  start_date?: string;
  end_date?: string;
  limit?: number;
  offset?: number;
}
