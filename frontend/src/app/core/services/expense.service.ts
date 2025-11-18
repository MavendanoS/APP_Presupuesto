import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import {
  Expense,
  CreateExpenseRequest,
  ExpenseSummary,
  ExpenseFilters
} from '../models';

interface ExpensesResponse {
  expenses: Expense[];
  total: number;
  limit: number;
  offset: number;
}

@Injectable({
  providedIn: 'root'
})
export class ExpenseService {
  private readonly endpoint = '/expenses';

  constructor(private api: ApiService) {}

  /**
   * Obtener lista de gastos con filtros
   */
  getExpenses(filters?: ExpenseFilters): Observable<ExpensesResponse> {
    return this.api.get<ExpensesResponse>(this.endpoint, filters);
  }

  /**
   * Obtener un gasto específico
   */
  getExpense(id: number): Observable<{ expense: Expense }> {
    return this.api.get<{ expense: Expense }>(`${this.endpoint}/${id}`);
  }

  /**
   * Crear nuevo gasto
   */
  createExpense(expense: CreateExpenseRequest): Observable<{ expense: Expense }> {
    return this.api.post<{ expense: Expense }>(this.endpoint, expense);
  }

  /**
   * Actualizar gasto
   */
  updateExpense(id: number, expense: Partial<CreateExpenseRequest>): Observable<{ expense: Expense }> {
    return this.api.put<{ expense: Expense }>(`${this.endpoint}/${id}`, expense);
  }

  /**
   * Eliminar gasto
   */
  deleteExpense(id: number): Observable<{ message: string }> {
    return this.api.delete<{ message: string }>(`${this.endpoint}/${id}`);
  }

  /**
   * Obtener resumen de gastos
   */
  getSummary(filters?: Pick<ExpenseFilters, 'type' | 'start_date' | 'end_date'>): Observable<ExpenseSummary> {
    return this.api.get<ExpenseSummary>(`${this.endpoint}/summary`, filters);
  }
}
