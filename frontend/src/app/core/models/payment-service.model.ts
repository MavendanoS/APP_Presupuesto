export interface PaymentService {
  id: number;
  user_id: number;
  name: string;
  icon: string;
  color: string;
  is_active: number; // 0 or 1 (SQLite boolean)
  sort_order: number;
  expected_amount: number | null;
  created_at: string;
  updated_at: string;
}

export interface CreatePaymentServiceRequest {
  name: string;
  icon?: string;
  color?: string;
  expected_amount?: number | null;
}

export interface UpdatePaymentServiceRequest {
  name?: string;
  icon?: string;
  color?: string;
  is_active?: number;
  expected_amount?: number | null;
}
