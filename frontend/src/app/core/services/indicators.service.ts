import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { interval, startWith } from 'rxjs';

export interface Indicator {
  codigo: string;
  nombre: string;
  unidad_medida: string;
  fecha: string;
  valor: number;
}

export interface IndicatorsResponse {
  dolar?: { codigo: string; nombre: string; unidad_medida: string; fecha: string; valor: number; };
  uf?: { codigo: string; nombre: string; unidad_medida: string; fecha: string; valor: number; };
}

@Injectable({
  providedIn: 'root'
})
export class IndicatorsService {
  private readonly API_URL = 'https://mindicador.cl/api';

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
      next: (data) => {
        if (data.dolar?.valor) {
          this.dolar.set(Math.round(data.dolar.valor));
        }
        if (data.uf?.valor) {
          this.uf.set(Math.round(data.uf.valor));
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
