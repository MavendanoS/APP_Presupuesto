export interface MonthlyPayment {
  id: number;
  user_id: number;
  service_id: number;
  amount: number;
  year_month: string; // YYYY-MM
  paid_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChecklistItem {
  service_id: number;
  name: string;
  icon: string;
  color: string;
  sort_order: number;
  payment_id: number | null;
  amount: number | null;
  paid_date: string | null;
  notes: string | null;
  year_month: string | null;
  is_paid: boolean;
  average_amount: number;
  min_amount: number;
  max_amount: number;
  months_with_data: number;
}

export interface UpsertPaymentRequest {
  service_id: number;
  amount: number;
  year_month: string;
  paid_date?: string;
  notes?: string;
}

export interface ServiceAverage {
  service_id: number;
  name: string;
  icon: string;
  color: string;
  average_amount: number;
  min_amount: number;
  max_amount: number;
  months_with_data: number;
}

export interface BudgetSummary {
  year_month: string;
  avg_months: number;
  checklist: ChecklistItem[];
  summary: {
    total_expected: number;
    total_paid: number;
    remaining: number;
    paid_count: number;
    total_count: number;
  };
}

export interface PaymentHistoryEntry {
  id: number;
  service_id: number;
  amount: number;
  year_month: string;
  paid_date: string;
  notes: string | null;
  service_name: string;
  service_icon: string;
  service_color: string;
}

export interface PaymentHistoryFilters {
  service_ids?: string; // comma-separated
  start_month?: string;
  end_month?: string;
}
