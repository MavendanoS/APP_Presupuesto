export interface Income {
  id: number;
  user_id: number;
  source: string;
  amount: number;
  date: string;
  is_recurring: boolean;
  frequency: 'monthly' | 'weekly' | 'biweekly' | 'annual' | 'once';
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface IncomeCreateRequest {
  source: string;
  amount: number;
  date: string;
  is_recurring?: boolean;
  frequency?: 'monthly' | 'weekly' | 'biweekly' | 'annual' | 'once';
  notes?: string;
}

export interface IncomeUpdateRequest extends Partial<IncomeCreateRequest> {}

export interface IncomeListResponse {
  success: boolean;
  data: {
    incomes: Income[];
    total: number;
    limit: number;
    offset: number;
  };
}

export interface IncomeResponse {
  success: boolean;
  data: {
    income: Income;
  };
}

export interface IncomeSummary {
  total_income: number;
  income_count: number;
  recurring_income: number;
  one_time_income: number;
  avg_income: number;
}
