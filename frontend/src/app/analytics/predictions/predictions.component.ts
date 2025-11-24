import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AnalyticsService } from '../../core/services/analytics.service';
import { PredictionsData } from '../../core/models';
import { LineChartComponent, LineChartDataset } from '../../shared/components/line-chart/line-chart.component';
import { LoadingComponent } from '../../shared/components/loading/loading.component';
import { ErrorMessageComponent } from '../../shared/components/error-message/error-message.component';

@Component({
  selector: 'app-predictions',
  standalone: true,
  imports: [
    CommonModule,
    LineChartComponent,
    LoadingComponent,
    ErrorMessageComponent
  ],
  templateUrl: './predictions.component.html',
  styleUrl: './predictions.component.scss'
})
export class PredictionsComponent implements OnInit {
  loading = signal(true);
  error = signal<string | null>(null);
  predictionsData = signal<PredictionsData | null>(null);
  monthsAhead = signal(3);

  // Chart data
  chartLabels = signal<string[]>([]);
  chartDatasets = signal<LineChartDataset[]>([]);

  constructor(private analyticsService: AnalyticsService) {}

  ngOnInit(): void {
    this.loadPredictions();
  }

  loadPredictions(): void {
    this.loading.set(true);
    this.error.set(null);

    this.analyticsService.getPredictions(this.monthsAhead()).subscribe({
      next: (data) => {
        this.predictionsData.set(data);
        this.processChartData(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.message || 'Error al cargar predicciones');
        this.loading.set(false);
      }
    });
  }

  changeMonthsAhead(value: number): void {
    this.monthsAhead.set(value);
    this.loadPredictions();
  }

  private processChartData(data: PredictionsData): void {
    const labels = data.predictions.map(p => this.formatMonth(p.month));

    const incomeData = data.predictions.map(p => p.predicted_income);
    const totalExpensesData = data.predictions.map(p => {
      const expenses = p.predicted_expenses;
      return (expenses.payment || 0) + (expenses.purchase || 0) + (expenses.small_expense || 0);
    });
    const balanceData = data.predictions.map(p => p.predicted_balance);

    this.chartLabels.set(labels);
    this.chartDatasets.set([
      {
        label: 'Ingresos Predichos',
        data: incomeData,
        borderColor: '#10B981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)'
      },
      {
        label: 'Gastos Predichos',
        data: totalExpensesData,
        borderColor: '#EF4444',
        backgroundColor: 'rgba(239, 68, 68, 0.1)'
      },
      {
        label: 'Balance Predicho',
        data: balanceData,
        borderColor: '#3B82F6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)'
      }
    ]);
  }

  formatMonth(month: string): string {
    // Evitar problema de timezone parseando manualmente
    const [year, monthNum] = month.split('-');
    const date = new Date(parseInt(year), parseInt(monthNum) - 1, 1);
    return date.toLocaleDateString('es-CL', { month: 'short', year: 'numeric' });
  }

  getConfidenceBadgeClass(confidence: string): string {
    const classes: Record<string, string> = {
      low: 'bg-danger',
      medium: 'bg-warning',
      high: 'bg-success'
    };
    return classes[confidence] || 'bg-secondary';
  }

  getConfidenceLabel(confidence: string): string {
    const labels: Record<string, string> = {
      low: 'Baja',
      medium: 'Media',
      high: 'Alta'
    };
    return labels[confidence] || confidence;
  }

  hasNegativeBalance(data: PredictionsData): boolean {
    return data.predictions.some(p => p.predicted_balance < 0);
  }

  getNegativeBalanceMonths(data: PredictionsData): string[] {
    return data.predictions
      .filter(p => p.predicted_balance < 0)
      .map(p => this.formatMonth(p.month));
  }
}
