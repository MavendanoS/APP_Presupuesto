import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private readonly BASE_URL = environment.apiUrl;

  constructor(private http: HttpClient) {}

  /**
   * GET request
   */
  get<T>(endpoint: string, params?: any): Observable<T> {
    let httpParams = new HttpParams();

    console.log('🌐 ApiService.get() - Received params:', params);

    if (params) {
      Object.keys(params).forEach(key => {
        // Exclude null, undefined, and empty strings from query parameters
        if (params[key] !== null && params[key] !== undefined && params[key] !== '') {
          console.log(`  ➡️ Adding param: ${key} = ${params[key]}`);
          httpParams = httpParams.set(key, params[key].toString());
        }
      });
    }

    console.log('🌐 ApiService.get() - Final HttpParams:', httpParams.toString());

    return this.http.get<ApiResponse<T>>(`${this.BASE_URL}${endpoint}`, {
      params: httpParams,
      withCredentials: true
    }).pipe(map(response => response.data));
  }

  /**
   * POST request
   */
  post<T>(endpoint: string, body: any): Observable<T> {
    return this.http.post<ApiResponse<T>>(`${this.BASE_URL}${endpoint}`, body, {
      withCredentials: true
    }).pipe(map(response => response.data));
  }

  /**
   * PUT request
   */
  put<T>(endpoint: string, body: any): Observable<T> {
    return this.http.put<ApiResponse<T>>(`${this.BASE_URL}${endpoint}`, body, {
      withCredentials: true
    }).pipe(map(response => response.data));
  }

  /**
   * DELETE request
   */
  delete<T>(endpoint: string): Observable<T> {
    return this.http.delete<ApiResponse<T>>(`${this.BASE_URL}${endpoint}`, {
      withCredentials: true
    }).pipe(map(response => response.data));
  }

  /**
   * Download file (CSV, Excel)
   */
  download(endpoint: string, params?: any): Observable<{ blob: Blob; filename: string }> {
    let httpParams = new HttpParams();

    if (params) {
      Object.keys(params).forEach(key => {
        // Exclude null, undefined, and empty strings from query parameters
        if (params[key] !== null && params[key] !== undefined && params[key] !== '') {
          httpParams = httpParams.set(key, params[key].toString());
        }
      });
    }

    return this.http.get(`${this.BASE_URL}${endpoint}`, {
      params: httpParams,
      responseType: 'blob',
      withCredentials: true,
      observe: 'response'
    }).pipe(
      map(response => {
        const blob = response.body!;

        // Extraer nombre del archivo del header Content-Disposition
        const contentDisposition = response.headers.get('Content-Disposition');
        let filename = 'export.xlsx';

        if (contentDisposition) {
          const matches = /filename="?([^"]+)"?/i.exec(contentDisposition);
          if (matches && matches[1]) {
            filename = matches[1];
          }
        }

        return { blob, filename };
      })
    );
  }
}
