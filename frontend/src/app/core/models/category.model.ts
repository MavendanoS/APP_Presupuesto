export type CategoryType = 'payment' | 'purchase' | 'small_expense';

export interface Category {
  id: number;
  user_id: number;
  name: string;
  type: CategoryType;
  color: string;
  icon: string;
  created_at: string;
  updated_at: string;
}

export interface CategoryWithStats extends Category {
  total_amount: number;
  expense_count: number;
}

export interface CreateCategoryRequest {
  name: string;
  type: CategoryType;
  color?: string;
  icon?: string;
}

export interface UpdateCategoryRequest {
  name?: string;
  type?: CategoryType;
  color?: string;
  icon?: string;
}

export interface CategoryFilters {
  type?: CategoryType;
}

export interface CategoryStatsFilters extends CategoryFilters {
  start_date?: string;
  end_date?: string;
}
