import { Injectable } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { ApiService } from './api.service';
import { DataRefreshService } from './data-refresh.service';
import {
  SavingsGoal,
  CreateSavingsGoalRequest,
  UpdateSavingsGoalRequest,
  CreateTransactionRequest,
  SavingsTransaction,
  SavingsSummary,
  SavingsGoalStatus
} from '../models/savings.model';

@Injectable({
  providedIn: 'root'
})
export class SavingsService {
  private readonly endpoint = '/savings';

  constructor(
    private api: ApiService,
    private dataRefresh: DataRefreshService
  ) {}

  /**
   * Obtener todas las metas de ahorro
   */
  getSavingsGoals(status?: SavingsGoalStatus): Observable<{ goals: SavingsGoal[] }> {
    const params: Record<string, string> = {};

    if (status) {
      params['status'] = status;
    }

    return this.api.get<{ goals: SavingsGoal[] }>(this.endpoint, params);
  }

  /**
   * Obtener una meta por ID
   */
  getSavingsGoalById(id: number): Observable<{ goal: SavingsGoal }> {
    return this.api.get<{ goal: SavingsGoal }>(`${this.endpoint}/${id}`);
  }

  /**
   * Crear nueva meta de ahorro
   */
  createSavingsGoal(data: CreateSavingsGoalRequest): Observable<{ goal: SavingsGoal }> {
    return this.api.post<{ goal: SavingsGoal }>(this.endpoint, data).pipe(
      tap(() => this.dataRefresh.notifyDataChange('savings'))
    );
  }

  /**
   * Actualizar meta de ahorro
   */
  updateSavingsGoal(id: number, data: UpdateSavingsGoalRequest): Observable<{ goal: SavingsGoal }> {
    return this.api.put<{ goal: SavingsGoal }>(`${this.endpoint}/${id}`, data).pipe(
      tap(() => this.dataRefresh.notifyDataChange('savings'))
    );
  }

  /**
   * Eliminar meta de ahorro
   */
  deleteSavingsGoal(id: number): Observable<{ message: string }> {
    return this.api.delete<{ message: string }>(`${this.endpoint}/${id}`).pipe(
      tap(() => this.dataRefresh.notifyDataChange('savings'))
    );
  }

  /**
   * Obtener transacciones de una meta
   */
  getTransactions(
    goalId: number,
    filters?: {
      type?: 'deposit' | 'withdrawal';
      start_date?: string;
      end_date?: string;
      limit?: number;
      offset?: number;
    }
  ): Observable<{ transactions: SavingsTransaction[]; total: number }> {
    const params: Record<string, string> = {};

    if (filters) {
      if (filters.type) params['type'] = filters.type;
      if (filters.start_date) params['start_date'] = filters.start_date;
      if (filters.end_date) params['end_date'] = filters.end_date;
      if (filters.limit) params['limit'] = filters.limit.toString();
      if (filters.offset) params['offset'] = filters.offset.toString();
    }

    return this.api.get<{ transactions: SavingsTransaction[]; total: number }>(
      `${this.endpoint}/${goalId}/transactions`,
      params
    );
  }

  /**
   * Crear transacción (aporte o retiro)
   */
  createTransaction(
    goalId: number,
    data: CreateTransactionRequest
  ): Observable<{ transaction: SavingsTransaction }> {
    return this.api.post<{ transaction: SavingsTransaction }>(
      `${this.endpoint}/${goalId}/transactions`,
      data
    ).pipe(
      tap(() => this.dataRefresh.notifyDataChange('savings'))
    );
  }

  /**
   * Eliminar transacción
   */
  deleteTransaction(goalId: number, transactionId: number): Observable<{ message: string }> {
    return this.api.delete<{ message: string }>(
      `${this.endpoint}/${goalId}/transactions/${transactionId}`
    ).pipe(
      tap(() => this.dataRefresh.notifyDataChange('savings'))
    );
  }

  /**
   * Obtener resumen de ahorros
   */
  getSavingsSummary(): Observable<SavingsSummary> {
    return this.api.get<SavingsSummary>(`${this.endpoint}/summary`);
  }

  /**
   * Calcular progreso de una meta
   */
  calculateProgress(goal: SavingsGoal): {
    progress_percentage: number;
    remaining_amount: number;
    days_until_deadline: number | null;
    is_on_track: boolean;
  } {
    const progress_percentage = goal.target_amount > 0
      ? Math.round((goal.current_amount / goal.target_amount) * 100)
      : 0;

    const remaining_amount = goal.target_amount - goal.current_amount;

    let days_until_deadline: number | null = null;
    let is_on_track = true;

    if (goal.deadline) {
      const today = new Date();
      const deadlineDate = new Date(goal.deadline);
      const diffTime = deadlineDate.getTime() - today.getTime();
      days_until_deadline = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      // Si hay deadline, verificar si está en camino
      if (days_until_deadline > 0) {
        const daysElapsed = Math.max(
          0,
          Math.ceil((today.getTime() - new Date(goal.created_at).getTime()) / (1000 * 60 * 60 * 24))
        );
        const totalDays = daysElapsed + days_until_deadline;
        const expectedProgress = totalDays > 0 ? (daysElapsed / totalDays) * 100 : 0;

        // Está en camino si el progreso actual es >= al esperado
        is_on_track = progress_percentage >= expectedProgress;
      } else {
        // Si ya pasó el deadline y no está completo, no está en camino
        is_on_track = progress_percentage >= 100;
      }
    }

    return {
      progress_percentage,
      remaining_amount,
      days_until_deadline,
      is_on_track
    };
  }
}
