import { ExpenseType } from './expense.model';

export interface Category {
  id: number;
  user_id: number;
  name: string;
  type: ExpenseType;
  color: string;
  icon: string;
  created_at: string;
}

export interface CreateCategoryRequest {
  name: string;
  type: ExpenseType;
  color: string;
  icon: string;
}

export interface CategoryWithStats extends Category {
  expense_count: number;
  total_amount: number;
}
