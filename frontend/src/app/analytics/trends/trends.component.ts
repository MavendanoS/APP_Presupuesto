import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AnalyticsService } from '../../core/services/analytics.service';
import { TrendsData } from '../../core/models';
import { BarChartComponent, BarChartDataset } from '../../shared/components/bar-chart/bar-chart.component';
import { LoadingComponent } from '../../shared/components/loading/loading.component';
import { ErrorMessageComponent } from '../../shared/components/error-message/error-message.component';

@Component({
  selector: 'app-trends',
  standalone: true,
  imports: [
    CommonModule,
    BarChartComponent,
    LoadingComponent,
    ErrorMessageComponent
  ],
  templateUrl: './trends.component.html',
  styleUrl: './trends.component.scss'
})
export class TrendsComponent implements OnInit {
  loading = signal(true);
  error = signal<string | null>(null);
  trendsData = signal<TrendsData | null>(null);
  periods = signal(6);

  // Chart data
  chartLabels = signal<string[]>([]);
  chartDatasets = signal<BarChartDataset[]>([]);

  constructor(private analyticsService: AnalyticsService) {}

  ngOnInit(): void {
    this.loadTrends();
  }

  loadTrends(): void {
    this.loading.set(true);
    this.error.set(null);

    this.analyticsService.getTrends(this.periods()).subscribe({
      next: (data) => {
        this.trendsData.set(data);
        this.processChartData(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.message || 'Error al cargar tendencias');
        this.loading.set(false);
      }
    });
  }

  changePeriods(value: number): void {
    this.periods.set(value);
    this.loadTrends();
  }

  private processChartData(data: TrendsData): void {
    const months = [...new Set(data.monthly_trends.map(t => t.month))];
    const types = [...new Set(data.monthly_trends.map(t => t.type))];

    this.chartLabels.set(months.map(m => this.formatMonth(m)));

    const typeColors: Record<string, string> = {
      payment: '#3B82F6',
      purchase: '#F59E0B',
      small_expense: '#EF4444'
    };

    const typeLabels: Record<string, string> = {
      payment: 'Pagos',
      purchase: 'Compras',
      small_expense: 'Gastos Hormiga'
    };

    this.chartDatasets.set(
      types.map(type => {
        const monthlyData = months.map(month => {
          const found = data.monthly_trends.find(t => t.month === month && t.type === type);
          return found ? found.total : 0;
        });

        return {
          label: typeLabels[type] || type,
          data: monthlyData,
          backgroundColor: typeColors[type] || '#6B7280'
        };
      })
    );
  }

  private formatMonth(month: string): string {
    // Evitar problema de timezone parseando manualmente
    const [year, monthNum] = month.split('-');
    const date = new Date(parseInt(year), parseInt(monthNum) - 1, 1);
    return date.toLocaleDateString('es-CL', { month: 'short', year: 'numeric' });
  }

  getTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      payment: 'Pago',
      purchase: 'Compra',
      small_expense: 'Gasto Hormiga'
    };
    return labels[type] || type;
  }

  getTypeBadgeClass(type: string): string {
    const classes: Record<string, string> = {
      payment: 'primary',
      purchase: 'warning',
      small_expense: 'danger'
    };
    return classes[type] || 'secondary';
  }
}
