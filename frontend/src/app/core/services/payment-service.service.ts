import { Injectable } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { ApiService } from './api.service';
import { DataRefreshService } from './data-refresh.service';
import { PaymentService, CreatePaymentServiceRequest, UpdatePaymentServiceRequest } from '../models';

@Injectable({
  providedIn: 'root'
})
export class PaymentServiceService {
  private readonly endpoint = '/services';

  constructor(
    private api: ApiService,
    private dataRefresh: DataRefreshService
  ) {}

  /**
   * Obtener lista de servicios de pago
   */
  getServices(active?: boolean): Observable<{ services: PaymentService[] }> {
    const params: any = {};
    if (active !== undefined) params.active = active.toString();
    return this.api.get<{ services: PaymentService[] }>(this.endpoint, params);
  }

  /**
   * Obtener un servicio por ID
   */
  getServiceById(id: number): Observable<{ service: PaymentService }> {
    return this.api.get<{ service: PaymentService }>(`${this.endpoint}/${id}`);
  }

  /**
   * Crear nuevo servicio de pago
   */
  createService(data: CreatePaymentServiceRequest): Observable<{ service: PaymentService }> {
    return this.api.post<{ service: PaymentService }>(this.endpoint, data).pipe(
      tap(() => this.dataRefresh.notifyDataChange('service'))
    );
  }

  /**
   * Actualizar servicio de pago
   */
  updateService(id: number, data: UpdatePaymentServiceRequest): Observable<{ service: PaymentService }> {
    return this.api.put<{ service: PaymentService }>(`${this.endpoint}/${id}`, data).pipe(
      tap(() => this.dataRefresh.notifyDataChange('service'))
    );
  }

  /**
   * Eliminar servicio de pago
   */
  deleteService(id: number): Observable<{ message: string }> {
    return this.api.delete<{ message: string }>(`${this.endpoint}/${id}`).pipe(
      tap(() => this.dataRefresh.notifyDataChange('service'))
    );
  }

  /**
   * Reordenar servicios de pago
   */
  reorderServices(orderedIds: number[]): Observable<{ success: boolean }> {
    return this.api.put<{ success: boolean }>(`${this.endpoint}/reorder`, { orderedIds }).pipe(
      tap(() => this.dataRefresh.notifyDataChange('service'))
    );
  }
}
