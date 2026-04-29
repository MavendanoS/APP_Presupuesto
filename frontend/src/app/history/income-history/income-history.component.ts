import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { MonthlyIncomeService } from '../../core/services/monthly-income.service';
import { MonthlyIncome, IncomeTotalByMonth } from '../../core/models';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { LoadingComponent } from '../../shared/components/loading/loading.component';
import { ErrorMessageComponent } from '../../shared/components/error-message/error-message.component';
import { ClpCurrencyPipe } from '../../shared/pipes/clp-currency.pipe';
import { BarChartComponent } from '../../shared/components/bar-chart/bar-chart.component';

@Component({
  selector: 'app-income-history',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    TranslocoPipe,
    NavbarComponent,
    LoadingComponent,
    ErrorMessageComponent,
    ClpCurrencyPipe,
    BarChartComponent
  ],
  templateUrl: './income-history.component.html',
  styleUrls: ['./income-history.component.scss']
})
export class IncomeHistoryComponent implements OnInit {
  history = signal<MonthlyIncome[]>([]);
  totals = signal<IncomeTotalByMonth[]>([]);
  loading = signal(true);
  errorMessage = signal<string | null>(null);

  startMonth = signal(this.getMonthsAgo(6));
  endMonth = signal(this.getCurrentYearMonth());
  viewMode = signal<'chart' | 'table'>('chart');

  // Chart data
  chartLabels = computed(() => this.totals().map(t => this.formatMonth(t.year_month)));
  chartDatasets = computed(() => {
    const totals = this.totals();
    if (totals.length === 0) return [];
    return [{
      label: 'Ingresos',
      data: totals.map(t => t.total),
      backgroundColor: '#19875480',
      borderColor: '#198754'
    }];
  });

  // Resumen
  totalAccumulated = computed(() =>
    this.history().reduce((sum, h) => sum + h.amount, 0)
  );
  averageMonthly = computed(() => {
    const t = this.totals();
    if (t.length === 0) return 0;
    return t.reduce((sum, x) => sum + x.total, 0) / t.length;
  });

  constructor(private incomeService: MonthlyIncomeService) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    const filters = {
      start_month: this.startMonth(),
      end_month: this.endMonth()
    };

    this.incomeService.getHistory(filters).subscribe({
      next: (data) => {
        this.history.set(data.history);
        this.loading.set(false);
      },
      error: (error) => {
        this.errorMessage.set(error?.message || 'Error al cargar historial');
        this.loading.set(false);
      }
    });

    this.incomeService.getTotalsByMonth(filters).subscribe({
      next: (data) => this.totals.set(data.totals),
      error: () => {}
    });
  }

  onFilterChange(): void {
    this.loadData();
  }

  formatMonth(yearMonth: string): string {
    const [year, month] = yearMonth.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('es-CL', { month: 'short', year: 'numeric' });
  }

  formatDate(dateStr: string | null): string {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-CL', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }

  private getCurrentYearMonth(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  private getMonthsAgo(n: number): string {
    const d = new Date();
    d.setMonth(d.getMonth() - n);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }
}
