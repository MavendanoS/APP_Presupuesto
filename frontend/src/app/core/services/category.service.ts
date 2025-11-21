import { Injectable } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { ApiService } from './api.service';
import { DataRefreshService } from './data-refresh.service';
import {
  Category,
  CategoryWithStats,
  CreateCategoryRequest,
  UpdateCategoryRequest,
  CategoryFilters,
  CategoryStatsFilters
} from '../models/category.model';

@Injectable({
  providedIn: 'root'
})
export class CategoryService {
  private readonly endpoint = '/categories';

  constructor(
    private api: ApiService,
    private dataRefresh: DataRefreshService
  ) {}

  getCategories(filters?: CategoryFilters): Observable<{ categories: Category[] }> {
    const params: Record<string, string> = {};

    if (filters?.type) {
      params['type'] = filters.type;
    }

    return this.api.get<{ categories: Category[] }>(this.endpoint, params);
  }

  getCategoriesWithStats(filters?: CategoryStatsFilters): Observable<{ categories: CategoryWithStats[] }> {
    const params: Record<string, string> = {};

    console.log('📦 CategoryService - Input filters:', filters);

    if (filters?.type) {
      params['type'] = filters.type;
    }
    if (filters?.start_date) {
      params['start_date'] = filters.start_date;
    }
    if (filters?.end_date) {
      params['end_date'] = filters.end_date;
    }

    console.log('📤 CategoryService - Sending params:', params);

    return this.api.get<{ categories: CategoryWithStats[] }>(`${this.endpoint}/stats`, params);
  }

  getCategoryById(id: number): Observable<{ category: Category }> {
    return this.api.get<{ category: Category }>(`${this.endpoint}/${id}`);
  }

  createCategory(data: CreateCategoryRequest): Observable<{ category: Category }> {
    return this.api.post<{ category: Category }>(this.endpoint, data).pipe(
      tap(() => this.dataRefresh.notifyCategoryChange())
    );
  }

  updateCategory(id: number, data: UpdateCategoryRequest): Observable<{ category: Category }> {
    return this.api.put<{ category: Category }>(`${this.endpoint}/${id}`, data).pipe(
      tap(() => this.dataRefresh.notifyCategoryChange())
    );
  }

  deleteCategory(id: number): Observable<{ message: string }> {
    return this.api.delete<{ message: string }>(`${this.endpoint}/${id}`).pipe(
      tap(() => this.dataRefresh.notifyCategoryChange())
    );
  }
}
