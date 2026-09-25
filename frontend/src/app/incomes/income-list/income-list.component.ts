import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslocoPipe } from '@jsverse/transloco';
import { Subject, catchError, of, switchMap } from 'rxjs';
import { MonthlyIncomeService } from '../../core/services/monthly-income.service';
import { LocaleService } from '../../core/services/locale.service';
import { MonthlyIncome, IncomeMonthlySummary } from '../../core/models';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { LoadingComponent } from '../../shared/components/loading/loading.component';
import { ErrorMessageComponent } from '../../shared/components/error-message/error-message.component';
import {
  addMonths,
  currentYearMonth,
  isValidYearMonth,
  parseLocalDate,
  parseYearMonth
} from '../../shared/utils/date.utils';

@Component({
  selector: 'app-income-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    TranslocoPipe,
    NavbarComponent,
    LoadingComponent,
    ErrorMessageComponent
  ],
  templateUrl: './income-list.component.html',
  styleUrls: ['./income-list.component.scss']
})
export class IncomeListComponent implements OnInit {
  private localeService = inject(LocaleService);
  private route = inject(ActivatedRoute);

  loading = signal(true);
  errorMessage = signal<string | null>(null);
  summary = signal<IncomeMonthlySummary | null>(null);
  currentMonth = signal(currentYearMonth());
  showAmounts = signal(false);

  /** Spinner de página completa solo en la carga inicial (sin datos previos) */
  initialLoading = computed(() => this.loading() && this.summary() === null);

  incomes = computed<MonthlyIncome[]>(() => this.summary()?.incomes ?? []);
  total = computed<number>(() => this.summary()?.total ?? 0);
  count = computed<number>(() => this.summary()?.count ?? 0);

  displayMonth = computed(() => {
    const date = parseYearMonth(this.currentMonth());
    return date.toLocaleDateString(this.localeService.locale(), { month: 'long', year: 'numeric' });
  });

  /** Disparador de recargas: switchMap cancela respuestas obsoletas */
  private reload$ = new Subject<void>();

  constructor(
    private incomeService: MonthlyIncomeService,
    private router: Router
  ) {
    const saved = localStorage.getItem('showAmounts');
    this.showAmounts.set(saved === 'true');

    this.reload$
      .pipe(
        switchMap(() => {
          this.loading.set(true);
          this.errorMessage.set(null);
          return this.incomeService.getMonthlySummary(this.currentMonth()).pipe(
            catchError((error) => {
              this.errorMessage.set(error?.message || this.localeService.t('incomes.loadError'));
              return of(null);
            })
          );
        }),
        takeUntilDestroyed()
      )
      .subscribe((data) => {
        if (data) {
          this.summary.set(data);
        }
        this.loading.set(false);
      });
  }

  ngOnInit(): void {
    const monthParam = this.route.snapshot.queryParamMap.get('month');
    if (isValidYearMonth(monthParam)) {
      this.currentMonth.set(monthParam);
    }
    this.loadData();
  }

  loadData(): void {
    this.reload$.next();
  }

  toggleAmounts(): void {
    const newValue = !this.showAmounts();
    this.showAmounts.set(newValue);
    localStorage.setItem('showAmounts', newValue.toString());
  }

  formatAmount(amount: number | null | undefined): string {
    if (amount === null || amount === undefined) return '-';
    if (!this.showAmounts()) return '****';
    const rounded = Math.round(amount);
    const formatted = Math.abs(rounded).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return `${rounded < 0 ? '-' : ''}$${formatted}`;
  }

  previousMonth(): void {
    this.changeMonth(addMonths(this.currentMonth(), -1));
  }

  nextMonth(): void {
    this.changeMonth(addMonths(this.currentMonth(), 1));
  }

  goToCurrentMonth(): void {
    this.changeMonth(currentYearMonth());
  }

  isCurrentMonth(): boolean {
    return this.currentMonth() === currentYearMonth();
  }

  /**
   * Cambia de mes, recarga y mantiene el mes en la URL (?month=YYYY-MM)
   */
  private changeMonth(yearMonth: string): void {
    this.currentMonth.set(yearMonth);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { month: yearMonth },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
    this.loadData();
  }

  newIncome(): void {
    this.router.navigate(['/incomes/new'], {
      queryParams: { month: this.currentMonth() }
    });
  }

  editIncome(income: MonthlyIncome): void {
    this.router.navigate(['/incomes/edit', income.id]);
  }

  deleteIncome(income: MonthlyIncome): void {
    const confirmed = confirm(
      this.localeService.t('incomes.confirmDelete', { description: income.description })
    );
    if (!confirmed) return;

    this.incomeService.delete(income.id).subscribe({
      next: () => this.loadData(),
      error: (error) => {
        this.errorMessage.set(error?.message || this.localeService.t('messages.deleteError'));
      }
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
