import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { DashboardMetrics, ChartsData, TrendsData, PredictionsData } from '../models';

@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {
  constructor(private api: ApiService) {}

  /**
   * Obtener métricas del dashboard
   */
  getDashboardMetrics(filters?: {
    start_date?: string;
    end_date?: string;
  }): Observable<DashboardMetrics> {
    return this.api.get<DashboardMetrics>('/analytics/dashboard', filters);
  }

  /**
   * Obtener datos para gráficos
   */
  getChartsData(filters?: {
    start_date?: string;
    end_date?: string;
    group_by?: 'day' | 'week' | 'month';
  }): Observable<ChartsData> {
    return this.api.get<ChartsData>('/analytics/charts', filters);
  }

  /**
   * Obtener tendencias
   */
  getTrends(periods?: number): Observable<TrendsData> {
    const params = periods ? { periods: periods.toString() } : undefined;
    return this.api.get<TrendsData>('/analytics/trends', params);
  }

  /**
   * Obtener predicciones
   */
  getPredictions(monthsAhead?: number): Observable<PredictionsData> {
    const params = monthsAhead ? { months_ahead: monthsAhead.toString() } : undefined;
    return this.api.get<PredictionsData>('/analytics/predictions', params);
  }

  /**
   * Exportar a Excel
   */
  exportExcel(filters?: {
    start_date?: string;
    end_date?: string;
    type?: 'all' | 'expenses' | 'income';
  }): Observable<{ blob: Blob; filename: string }> {
    return this.api.download('/exports/excel', filters);
  }
}
