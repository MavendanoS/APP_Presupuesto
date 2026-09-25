import { Injectable } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { ApiService } from './api.service';
import { DataRefreshService } from './data-refresh.service';
import {
  MonthlyPayment,
  UpsertPaymentRequest,
  ServiceAverage,
  BudgetSummary,
  PaymentHistoryEntry,
  PaymentHistoryFilters
} from '../models';

@Injectable({
  providedIn: 'root'
})
export class MonthlyPaymentService {
  private readonly endpoint = '/payments';

  constructor(
    private api: ApiService,
    private dataRefresh: DataRefreshService
  ) {}

  /**
   * Obtener resumen de presupuesto mensual
   */
  getBudgetSummary(yearMonth: string, avgMonths: number = 3): Observable<BudgetSummary> {
    return this.api.get<BudgetSummary>(`${this.endpoint}/budget`, { month: yearMonth, avg_months: avgMonths });
  }

  /**
   * Crear o actualizar un pago mensual
   */
  upsertPayment(data: UpsertPaymentRequest): Observable<{ payment: MonthlyPayment }> {
    return this.api.post<{ payment: MonthlyPayment }>(this.endpoint, data).pipe(
      tap(() => this.dataRefresh.notifyDataChange('payment'))
    );
  }

  /**
   * Eliminar un pago mensual
   */
  deletePayment(id: number): Observable<{ message: string }> {
    return this.api.delete<{ message: string }>(`${this.endpoint}/${id}`).pipe(
      tap(() => this.dataRefresh.notifyDataChange('payment'))
    );
  }

  /**
   * Obtener historial de pagos con filtros
   */
  getHistory(filters?: PaymentHistoryFilters): Observable<{ history: PaymentHistoryEntry[] }> {
    return this.api.get<{ history: PaymentHistoryEntry[] }>(`${this.endpoint}/history`, filters);
  }

  /**
   * Obtener promedios de pagos por servicio
   */
  getAverages(months: number = 3, serviceIds?: string): Observable<{ averages: ServiceAverage[] }> {
    const params: any = { months };
    if (serviceIds) params.service_ids = serviceIds;
    return this.api.get<{ averages: ServiceAverage[] }>(`${this.endpoint}/averages`, params);
  }
}
