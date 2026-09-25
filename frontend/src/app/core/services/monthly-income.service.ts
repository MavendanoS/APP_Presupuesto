import { Injectable } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { ApiService } from './api.service';
import { DataRefreshService } from './data-refresh.service';
import {
  MonthlyIncome,
  CreateIncomeRequest,
  UpdateIncomeRequest,
  IncomeMonthlySummary,
  IncomeTotalByMonth,
  IncomeHistoryFilters
} from '../models';

@Injectable({
  providedIn: 'root'
})
export class MonthlyIncomeService {
  private readonly endpoint = '/incomes';

  constructor(
    private api: ApiService,
    private dataRefresh: DataRefreshService
  ) {}

  /**
   * Obtener resumen mensual de ingresos (lista + total)
   */
  getMonthlySummary(yearMonth: string): Observable<IncomeMonthlySummary> {
    return this.api.get<IncomeMonthlySummary>(`${this.endpoint}/monthly`, {
      month: yearMonth
    });
  }

  /**
   * Obtener historial de ingresos con filtros opcionales
   */
  getHistory(filters?: IncomeHistoryFilters): Observable<{ history: MonthlyIncome[] }> {
    return this.api.get<{ history: MonthlyIncome[] }>(
      `${this.endpoint}/history`,
      filters
    );
  }

  /**
   * Obtener totales por mes (para gráficos de evolución)
   */
  getTotalsByMonth(filters?: IncomeHistoryFilters): Observable<{ totals: IncomeTotalByMonth[] }> {
    return this.api.get<{ totals: IncomeTotalByMonth[] }>(
      `${this.endpoint}/totals-by-month`,
      filters
    );
  }

  /**
   * Obtener un ingreso por ID
   */
  getById(id: number): Observable<{ income: MonthlyIncome }> {
    return this.api.get<{ income: MonthlyIncome }>(`${this.endpoint}/${id}`);
  }

  /**
   * Crear un nuevo ingreso
   */
  create(data: CreateIncomeRequest): Observable<{ income: MonthlyIncome }> {
    return this.api.post<{ income: MonthlyIncome }>(this.endpoint, data).pipe(
      tap(() => this.dataRefresh.notifyDataChange('income'))
    );
  }

  /**
   * Actualizar un ingreso existente
   */
  update(id: number, data: UpdateIncomeRequest): Observable<{ income: MonthlyIncome }> {
    return this.api.put<{ income: MonthlyIncome }>(`${this.endpoint}/${id}`, data).pipe(
      tap(() => this.dataRefresh.notifyDataChange('income'))
    );
  }

  /**
   * Eliminar un ingreso
   */
  delete(id: number): Observable<{ message: string }> {
    return this.api.delete<{ message: string }>(`${this.endpoint}/${id}`).pipe(
      tap(() => this.dataRefresh.notifyDataChange('income'))
    );
  }
}
