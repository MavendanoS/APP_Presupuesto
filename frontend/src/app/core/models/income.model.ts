export type IncomeFrequency = 'monthly' | 'weekly' | 'biweekly' | 'annual' | 'once';

export interface Income {
  id: number;
  user_id: number;
  source: string;
  amount: number;
  date: string;
  is_recurring: boolean;
  frequency: IncomeFrequency;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateIncomeRequest {
  source: string;
  amount: number;
  date: string;
  is_recurring: boolean;
  frequency: IncomeFrequency;
  notes?: string;
}

export interface IncomeSummary {
  total: number;
  count: number;
  average: number;
  recurring_total: number;
  recurring_count: number;
  by_frequency: {
    frequency: IncomeFrequency;
    count: number;
    total: number;
  }[];
}
