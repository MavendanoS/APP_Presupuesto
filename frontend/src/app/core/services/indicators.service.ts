import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { interval, startWith } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface IndicatorValue {
  valor: number;
  fecha: string;
}

export interface IndicatorsData {
  dolar: IndicatorValue | null;
  uf: IndicatorValue | null;
}

export interface IndicatorsResponse {
  success: boolean;
  data: IndicatorsData;
}

@Injectable({
  providedIn: 'root'
})
export class IndicatorsService {
  private readonly API_URL = `${environment.apiUrl}/indicators`;

  dolar = signal<number | null>(null);
  uf = signal<number | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);

  constructor(private http: HttpClient) {
    // Cargar indicadores al iniciar el servicio
    this.loadIndicators();

    // Actualizar cada 30 minutos
    interval(30 * 60 * 1000)
      .pipe(startWith(0))
      .subscribe(() => this.loadIndicators());
  }

  private loadIndicators(): void {
    this.loading.set(true);
    this.error.set(null);

    this.http.get<IndicatorsResponse>(this.API_URL).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          if (response.data.dolar?.valor) {
            this.dolar.set(response.data.dolar.valor);
          }
          if (response.data.uf?.valor) {
            this.uf.set(response.data.uf.valor);
          }
        }
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error al cargar indicadores económicos:', err);
        this.error.set('Error al cargar indicadores');
        this.loading.set(false);
      }
    });
  }

  refresh(): void {
    this.loadIndicators();
  }
}
