import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Category, CategoryWithStats, CreateCategoryRequest } from '../models';
import { ExpenseType } from '../models';

@Injectable({
  providedIn: 'root'
})
export class CategoryService {
  private readonly endpoint = '/categories';

  constructor(private api: ApiService) {}

  /**
   * Obtener todas las categorías
   */
  getCategories(type?: ExpenseType): Observable<{ categories: Category[] }> {
    const params = type ? { type } : undefined;
    return this.api.get<{ categories: Category[] }>(this.endpoint, params);
  }

  /**
   * Obtener categorías con estadísticas
   */
  getCategoriesWithStats(filters?: {
    type?: ExpenseType;
    start_date?: string;
    end_date?: string;
  }): Observable<{ categories: CategoryWithStats[] }> {
    return this.api.get<{ categories: CategoryWithStats[] }>(`${this.endpoint}/stats`, filters);
  }

  /**
   * Obtener categoría específica
   */
  getCategory(id: number): Observable<{ category: Category }> {
    return this.api.get<{ category: Category }>(`${this.endpoint}/${id}`);
  }

  /**
   * Crear nueva categoría
   */
  createCategory(category: CreateCategoryRequest): Observable<{ category: Category }> {
    return this.api.post<{ category: Category }>(this.endpoint, category);
  }

  /**
   * Actualizar categoría
   */
  updateCategory(id: number, category: Partial<CreateCategoryRequest>): Observable<{ category: Category }> {
    return this.api.put<{ category: Category }>(`${this.endpoint}/${id}`, category);
  }

  /**
   * Eliminar categoría
   */
  deleteCategory(id: number): Observable<{ message: string }> {
    return this.api.delete<{ message: string }>(`${this.endpoint}/${id}`);
  }
}
