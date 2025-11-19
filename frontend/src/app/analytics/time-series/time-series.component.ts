import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AnalyticsService } from '../../core/services/analytics.service';
import { ChartsData } from '../../core/models';
import { LineChartComponent, LineChartDataset } from '../../shared/components/line-chart/line-chart.component';
import { BarChartComponent, BarChartDataset } from '../../shared/components/bar-chart/bar-chart.component';
import { LoadingComponent } from '../../shared/components/loading/loading.component';
import { ErrorMessageComponent } from '../../shared/components/error-message/error-message.component';

@Component({
  selector: 'app-time-series',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LineChartComponent,
    BarChartComponent,
    LoadingComponent,
    ErrorMessageComponent
  ],
  templateUrl: './time-series.component.html',
  styleUrl: './time-series.component.scss'
})
export class TimeSeriesComponent implements OnInit {
  loading = signal(true);
  error = signal<string | null>(null);
  chartsData = signal<ChartsData | null>(null);

  groupBy = signal<'day' | 'week' | 'month'>('month');
  startDate = signal(this.getMonthStart());
  endDate = signal(this.getMonthEnd());

  // Chart data
  incomeChartLabels = signal<string[]>([]);
  incomeChartDatasets = signal<LineChartDataset[]>([]);

  expensesByTypeLabels = signal<string[]>([]);
  expensesByTypeDatasets = signal<LineChartDataset[]>([]);

  combinedLabels = signal<string[]>([]);
  combinedDatasets = signal<LineChartDataset[]>([]);

  categoryLabels = signal<string[]>([]);
  categoryDatasets = signal<BarChartDataset[]>([]);

  constructor(private analyticsService: AnalyticsService) {}

  ngOnInit(): void {
    this.loadCharts();
  }

  loadCharts(): void {
    this.loading.set(true);
    this.error.set(null);

    this.analyticsService.getChartsData({
      start_date: this.startDate(),
      end_date: this.endDate(),
      group_by: this.groupBy()
    }).subscribe({
      next: (data) => {
        this.chartsData.set(data);
        this.processChartData(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.message || 'Error al cargar los gráficos');
        this.loading.set(false);
      }
    });
  }

  changeGroupBy(value: 'day' | 'week' | 'month'): void {
    this.groupBy.set(value);
    this.loadCharts();
  }

  onStartDateChange(value: string): void {
    this.startDate.set(value);
    this.loadCharts();
  }

  onEndDateChange(value: string): void {
    this.endDate.set(value);
    this.loadCharts();
  }

  private processChartData(data: ChartsData): void {
    // Process income time series
    const incomeData = data.time_series.income;
    const incomeLabels = incomeData.map(i => this.formatPeriod(i.period));
    const incomeValues = incomeData.map(i => i.total);

    this.incomeChartLabels.set(incomeLabels);
    this.incomeChartDatasets.set([{
      label: 'Ingresos',
      data: incomeValues,
      borderColor: '#10B981',
      backgroundColor: 'rgba(16, 185, 129, 0.1)'
    }]);

    // Process expenses by type time series
    const expensesData = data.time_series.expenses;
    const expensesPeriods = [...new Set(expensesData.map(e => e.period))];
    const expenseTypes = [...new Set(expensesData.map(e => e.type))];

    this.expensesByTypeLabels.set(expensesPeriods.map(p => this.formatPeriod(p)));

    const typeColors: Record<string, { border: string; bg: string }> = {
      payment: { border: '#3B82F6', bg: 'rgba(59, 130, 246, 0.1)' },
      purchase: { border: '#F59E0B', bg: 'rgba(245, 158, 11, 0.1)' },
      small_expense: { border: '#EF4444', bg: 'rgba(239, 68, 68, 0.1)' }
    };

    const typeLabels: Record<string, string> = {
      payment: 'Pagos',
      purchase: 'Compras',
      small_expense: 'Gastos Hormiga'
    };

    this.expensesByTypeDatasets.set(
      expenseTypes.map(type => {
        const data = expensesPeriods.map(period => {
          const found = expensesData.find(e => e.period === period && e.type === type);
          return found ? found.total : 0;
        });

        return {
          label: typeLabels[type] || type,
          data: data,
          borderColor: typeColors[type]?.border || '#6B7280',
          backgroundColor: typeColors[type]?.bg || 'rgba(107, 114, 128, 0.1)'
        };
      })
    );

    // Process combined (income vs total expenses)
    const totalExpensesByPeriod = expensesPeriods.map(period => {
      return expensesData
        .filter(e => e.period === period)
        .reduce((sum, e) => sum + e.total, 0);
    });

    const combinedLabels = expensesPeriods.map(p => this.formatPeriod(p));

    // Align income data with expense periods
    const alignedIncomeData = expensesPeriods.map(period => {
      const found = incomeData.find(i => i.period === period);
      return found ? found.total : 0;
    });

    this.combinedLabels.set(combinedLabels);
    this.combinedDatasets.set([
      {
        label: 'Ingresos',
        data: alignedIncomeData,
        borderColor: '#10B981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)'
      },
      {
        label: 'Gastos Totales',
        data: totalExpensesByPeriod,
        borderColor: '#EF4444',
        backgroundColor: 'rgba(239, 68, 68, 0.1)'
      }
    ]);

    // Process category distribution
    const categories = data.distribution.by_category
      .sort((a, b) => b.total - a.total)
      .slice(0, 10); // Top 10 categories

    this.categoryLabels.set(categories.map(c => c.name));
    this.categoryDatasets.set([{
      label: 'Gastos por Categoría',
      data: categories.map(c => c.total),
      backgroundColor: categories.map(c => c.color)
    }]);
  }

  private formatPeriod(period: string): string {
    if (this.groupBy() === 'day') {
      // Para fechas diarias, parseamos directamente
      const [year, month, day] = period.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      return date.toLocaleDateString('es-CL', { day: '2-digit', month: 'short' });
    } else if (this.groupBy() === 'week') {
      return `Semana ${period}`;
    } else {
      // Para meses, parseamos el año y mes directamente sin crear fecha UTC
      const [year, month] = period.split('-').map(Number);
      const date = new Date(year, month - 1, 1);
      return date.toLocaleDateString('es-CL', { month: 'short', year: 'numeric' });
    }
  }

  private getMonthStart(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}-01`;
  }

  private getMonthEnd(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const day = String(lastDay).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
