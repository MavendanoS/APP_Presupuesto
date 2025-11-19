import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
  Income,
  IncomeCreateRequest,
  IncomeUpdateRequest,
  IncomeListResponse,
  IncomeResponse,
  IncomeSummary
} from '../models/income.model';

@Injectable({
  providedIn: 'root'
})
export class IncomeService {
  private readonly API_URL = `${environment.apiUrl}/income`;
  
  incomes = signal<Income[]>([]);
  totalIncomes = signal<number>(0);
  summary = signal<IncomeSummary | null>(null);

  constructor(private http: HttpClient) {}

  getIncomes(filters?: {
    is_recurring?: boolean;
    start_date?: string;
    end_date?: string;
    limit?: number;
    offset?: number;
  }): Observable<IncomeListResponse> {
    let params = new HttpParams();
    
    if (filters) {
      if (filters.is_recurring !== undefined) {
        params = params.set('is_recurring', filters.is_recurring.toString());
      }
      if (filters.start_date) {
        params = params.set('start_date', filters.start_date);
      }
      if (filters.end_date) {
        params = params.set('end_date', filters.end_date);
      }
      if (filters.limit) {
        params = params.set('limit', filters.limit.toString());
      }
      if (filters.offset) {
        params = params.set('offset', filters.offset.toString());
      }
    }

    return this.http.get<IncomeListResponse>(this.API_URL, { params }).pipe(
      tap(response => {
        if (response.success) {
          this.incomes.set(response.data.incomes);
          this.totalIncomes.set(response.data.total);
        }
      })
    );
  }

  getIncomeById(id: number): Observable<IncomeResponse> {
    return this.http.get<IncomeResponse>(`${this.API_URL}/${id}`);
  }

  createIncome(income: IncomeCreateRequest): Observable<IncomeResponse> {
    return this.http.post<IncomeResponse>(this.API_URL, income).pipe(
      tap(() => {
        // Recargar lista después de crear
        this.getIncomes().subscribe();
      })
    );
  }

  updateIncome(id: number, income: IncomeUpdateRequest): Observable<IncomeResponse> {
    return this.http.put<IncomeResponse>(`${this.API_URL}/${id}`, income).pipe(
      tap(() => {
        // Recargar lista después de actualizar
        this.getIncomes().subscribe();
      })
    );
  }

  deleteIncome(id: number): Observable<any> {
    return this.http.delete(`${this.API_URL}/${id}`).pipe(
      tap(() => {
        // Recargar lista después de eliminar
        this.getIncomes().subscribe();
      })
    );
  }

  getSummary(filters?: {
    start_date?: string;
    end_date?: string;
  }): Observable<any> {
    let params = new HttpParams();
    
    if (filters) {
      if (filters.start_date) {
        params = params.set('start_date', filters.start_date);
      }
      if (filters.end_date) {
        params = params.set('end_date', filters.end_date);
      }
    }

    return this.http.get<any>(`${this.API_URL}/summary`, { params }).pipe(
      tap(response => {
        if (response.success) {
          this.summary.set(response.data);
        }
      })
    );
  }

  getRecurringIncomes(): Observable<any> {
    return this.http.get<any>(`${this.API_URL}/recurring`);
  }
}
