/**
 * Modelos de Ahorros
 */

export type SavingsGoalStatus = 'active' | 'completed' | 'cancelled';
export type TransactionType = 'deposit' | 'withdrawal';

export interface SavingsGoal {
  id: number;
  user_id: number;
  name: string;
  target_amount: number;
  current_amount: number;
  deadline: string | null;
  description: string;
  color: string;
  icon: string;
  status: SavingsGoalStatus;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface SavingsTransaction {
  id: number;
  savings_goal_id: number;
  user_id: number;
  amount: number;
  type: TransactionType;
  date: string;
  notes: string;
  created_at: string;
}

export interface CreateSavingsGoalRequest {
  name: string;
  target_amount: number;
  deadline?: string;
  description?: string;
  color?: string;
  icon?: string;
}

export interface UpdateSavingsGoalRequest {
  name?: string;
  target_amount?: number;
  deadline?: string;
  description?: string;
  color?: string;
  icon?: string;
  status?: SavingsGoalStatus;
}

export interface CreateTransactionRequest {
  amount: number;
  type: TransactionType;
  date: string;
  notes?: string;
}

export interface SavingsGoalWithProgress extends SavingsGoal {
  progress_percentage: number;
  remaining_amount: number;
  days_until_deadline: number | null;
  is_on_track: boolean;
}

export interface SavingsSummary {
  active_goals: number;
  completed_goals: number;
  total_saved: number;
  total_target: number;
  nearest_goal: {
    id: number;
    name: string;
    current_amount: number;
    target_amount: number;
    progress_percentage: number;
  } | null;
}

export interface SavingsGoalsResponse {
  success: boolean;
  data: {
    goals: SavingsGoal[];
  };
}

export interface SavingsGoalResponse {
  success: boolean;
  data: {
    goal: SavingsGoal;
  };
}

export interface TransactionsResponse {
  success: boolean;
  data: {
    transactions: SavingsTransaction[];
    total: number;
  };
}

export interface TransactionResponse {
  success: boolean;
  data: {
    transaction: SavingsTransaction;
  };
}

export interface SavingsSummaryResponse {
  success: boolean;
  data: SavingsSummary;
}

export interface DeleteResponse {
  success: boolean;
  message: string;
}
