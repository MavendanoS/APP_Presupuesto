import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslocoPipe } from '@jsverse/transloco';
import { Subject, catchError, forkJoin, map, of, switchMap } from 'rxjs';
import { MonthlyIncomeService } from '../../core/services/monthly-income.service';
import { LocaleService } from '../../core/services/locale.service';
import { MonthlyIncome, IncomeTotalByMonth } from '../../core/models';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { LoadingComponent } from '../../shared/components/loading/loading.component';
import { ErrorMessageComponent } from '../../shared/components/error-message/error-message.component';
import { ClpCurrencyPipe } from '../../shared/pipes/clp-currency.pipe';
import { BarChartComponent } from '../../shared/components/bar-chart/bar-chart.component';
import {
  currentYearMonth,
  monthsAgo,
  monthsBetweenInclusive,
  parseLocalDate,
  parseYearMonth
} from '../../shared/utils/date.utils';

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
  private localeService = inject(LocaleService);

  history = signal<MonthlyIncome[]>([]);
  totals = signal<IncomeTotalByMonth[]>([]);
  loading = signal(true);
  errorMessage = signal<string | null>(null);

  startMonth = signal(monthsAgo(currentYearMonth(), 6));
  endMonth = signal(currentYearMonth());
  viewMode = signal<'chart' | 'table'>('chart');

  /** Disparador de recargas: switchMap cancela respuestas obsoletas */
  private reload$ = new Subject<void>();

  // Chart data
  chartLabels = computed(() => this.totals().map(t => this.formatMonth(t.year_month)));
  chartDatasets = computed(() => {
    const totals = this.totals();
    if (totals.length === 0) return [];
    return [{
      label: this.localeService.t('incomes.title'),
      data: totals.map(t => t.total),
      backgroundColor: '#19875480',
      borderColor: '#198754'
    }];
  });

  // Resumen
  totalAccumulated = computed(() =>
    this.history().reduce((sum, h) => sum + h.amount, 0)
  );

  /** Promedio mensual sobre la cantidad de meses del rango seleccionado */
  averageMonthly = computed(() => {
    const total = this.totals().reduce((sum, x) => sum + x.total, 0);
    const months = monthsBetweenInclusive(this.startMonth(), this.endMonth()) || this.totals().length;
    return months > 0 ? total / months : 0;
  });

  constructor(private incomeService: MonthlyIncomeService) {
    this.reload$
      .pipe(
        switchMap(() => {
          this.loading.set(true);
          this.errorMessage.set(null);

          const filters = {
            start_month: this.startMonth(),
            end_month: this.endMonth()
          };

          return forkJoin({
            history: this.incomeService.getHistory(filters),
            totals: this.incomeService.getTotalsByMonth(filters).pipe(
              map(data => data.totals),
              catchError(() => of([] as IncomeTotalByMonth[]))
            )
          }).pipe(
            catchError((error) => {
              this.errorMessage.set(error?.message || this.localeService.t('messages.loadError'));
              return of(null);
            })
          );
        }),
        takeUntilDestroyed()
      )
      .subscribe((result) => {
        if (result) {
          this.history.set(result.history.history);
          this.totals.set(result.totals);
        }
        this.loading.set(false);
      });
  }

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.reload$.next();
  }

  onFilterChange(): void {
    this.loadData();
  }

  formatMonth(yearMonth: string): string {
    return parseYearMonth(yearMonth).toLocaleDateString(this.localeService.locale(), {
      month: 'short',
      year: 'numeric'
    });
  }

  formatDate(dateStr: string | null): string {
    const date = parseLocalDate(dateStr);
    if (!date) return '-';
    return date.toLocaleDateString(this.localeService.locale(), {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }
}
