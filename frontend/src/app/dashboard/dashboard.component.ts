import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslocoPipe } from '@jsverse/transloco';
import { Subject, catchError, of, switchMap } from 'rxjs';
import { AuthService } from '../core/services/auth.service';
import { MonthlyPaymentService } from '../core/services/monthly-payment.service';
import { LocaleService } from '../core/services/locale.service';
import { BudgetSummary, ChecklistItem } from '../core/models';
import { NavbarComponent } from '../shared/components/navbar/navbar.component';
import { LoadingComponent } from '../shared/components/loading/loading.component';
import { ErrorMessageComponent } from '../shared/components/error-message/error-message.component';
import { WaterfallChartComponent, WaterfallStep } from '../shared/components/waterfall-chart/waterfall-chart.component';
import {
  addMonths,
  currentYearMonth,
  lastDayOfMonthISO,
  parseYearMonth,
  todayLocalISO
} from '../shared/utils/date.utils';

type PaymentStatusFilter = 'all' | 'paid' | 'pending';
const STATUS_FILTER_KEY = 'dashboardStatusFilter';

function loadStatusFilter(): PaymentStatusFilter {
  try {
    const saved = localStorage.getItem(STATUS_FILTER_KEY);
    return saved === 'paid' || saved === 'pending' ? saved : 'all';
  } catch {
    return 'all';
  }
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    TranslocoPipe,
    NavbarComponent,
    LoadingComponent,
    ErrorMessageComponent,
    WaterfallChartComponent
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  private localeService = inject(LocaleService);

  loading = signal(true);
  errorMessage = signal<string | null>(null);
  budgetData = signal<BudgetSummary | null>(null);
  showAmounts = signal(false);
  currentMonth = signal(currentYearMonth());
  avgMonths = signal(3);

  /** Spinner de página completa solo en la carga inicial (sin datos previos) */
  initialLoading = computed(() => this.loading() && this.budgetData() === null);

  // Payment editing state
  editingServiceId = signal<number | null>(null);
  paymentAmount = signal<number>(0);
  paymentNotes = signal('');

  /** Disparador de recargas: switchMap cancela respuestas obsoletas */
  private reload$ = new Subject<void>();

  // Computed
  displayMonth = computed(() => {
    const date = parseYearMonth(this.currentMonth());
    return date.toLocaleDateString(this.localeService.locale(), { month: 'long', year: 'numeric' });
  });

  checklist = computed(() => this.budgetData()?.checklist || []);

  /** Filtro del checklist por estado de pago (se recuerda entre visitas) */
  statusFilter = signal<PaymentStatusFilter>(loadStatusFilter());
  paidItems = computed(() => this.checklist().filter(item => item.is_paid));
  pendingItems = computed(() => this.checklist().filter(item => !item.is_paid));
  filteredChecklist = computed(() => {
    switch (this.statusFilter()) {
      case 'paid': return this.paidItems();
      case 'pending': return this.pendingItems();
      default: return this.checklist();
    }
  });
  summary = computed(() => this.budgetData()?.summary || { total_expected: 0, total_paid: 0, remaining: 0, paid_count: 0, total_count: 0, total_incomes: 0, balance: 0, projected_balance: 0 });
  totalIncomes = computed(() => this.summary().total_incomes ?? 0);
  balance = computed(() => this.summary().balance ?? 0);
  projectedBalance = computed(() => this.summary().projected_balance ?? 0);

  // Pasos del waterfall: Ingresos -> Gastos pagados -> Gastos pendientes -> Saldo proyectado
  waterfallSteps = computed<WaterfallStep[]>(() => {
    const s = this.summary();
    const totalIncomes = s.total_incomes ?? 0;
    const totalPaid = s.total_paid ?? 0;
    const remaining = s.remaining ?? 0; // puede ser negativo (se pagó más de lo esperado)
    const projected = s.projected_balance ?? (totalIncomes - (s.total_expected ?? 0));

    return [
      {
        label: this.localeService.t('dashboard.waterfallIncomes'),
        value: totalIncomes,
        type: 'total',
        color: '#198754'
      },
      {
        label: this.localeService.t('dashboard.waterfallPaid'),
        value: totalPaid,
        type: 'negative',
        color: '#dc3545'
      },
      {
        label: this.localeService.t('dashboard.waterfallPending'),
        value: remaining,
        type: 'negative',
        color: '#fd7e14'
      },
      {
        label: this.localeService.t('dashboard.waterfallProjected'),
        value: projected,
        type: 'total',
        color: projected >= 0 ? '#0d6efd' : '#dc3545'
      }
    ];
  });

  hasWaterfallData = computed(() => {
    const s = this.summary();
    return (s.total_incomes ?? 0) > 0 || (s.total_paid ?? 0) > 0 || (s.total_expected ?? 0) > 0;
  });

  progressPercent = computed(() => {
    const s = this.summary();
    return s.total_count > 0 ? Math.round((s.paid_count / s.total_count) * 100) : 0;
  });
  allPaid = computed(() => {
    const s = this.summary();
    return s.total_count > 0 && s.paid_count === s.total_count;
  });

  setStatusFilter(filter: PaymentStatusFilter): void {
    this.statusFilter.set(filter);
    try {
      localStorage.setItem(STATUS_FILTER_KEY, filter);
    } catch {
      // Almacenamiento no disponible: el filtro solo dura esta visita
    }
  }

  constructor(
    private authService: AuthService,
    private paymentService: MonthlyPaymentService
  ) {
    const saved = localStorage.getItem('showAmounts');
    this.showAmounts.set(saved === 'true');

    this.reload$
      .pipe(
        switchMap(() => {
          this.loading.set(true);
          this.errorMessage.set(null);
          this.editingServiceId.set(null);
          return this.paymentService.getBudgetSummary(this.currentMonth(), this.avgMonths()).pipe(
            catchError((error) => {
              this.errorMessage.set(error?.message || this.localeService.t('messages.loadError'));
              return of(null);
            })
          );
        }),
        takeUntilDestroyed()
      )
      .subscribe((data) => {
        if (data) {
          this.budgetData.set(data);
        }
        this.loading.set(false);
      });
  }

  get user() {
    return this.authService.currentUser;
  }

  ngOnInit(): void {
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
    this.currentMonth.set(addMonths(this.currentMonth(), -1));
    this.loadData();
  }

  nextMonth(): void {
    this.currentMonth.set(addMonths(this.currentMonth(), 1));
    this.loadData();
  }

  goToCurrentMonth(): void {
    this.currentMonth.set(currentYearMonth());
    this.loadData();
  }

  isCurrentMonth(): boolean {
    return this.currentMonth() === currentYearMonth();
  }

  // Start editing a payment (mark as paid)
  startPayment(item: ChecklistItem): void {
    this.editingServiceId.set(item.service_id);
    this.paymentAmount.set(item.amount || Math.round(item.effective_expected) || 0);
    this.paymentNotes.set(item.notes || '');
  }

  cancelPayment(): void {
    this.editingServiceId.set(null);
    this.paymentAmount.set(0);
    this.paymentNotes.set('');
  }

  /**
   * Fecha de pago a registrar: hoy si se está viendo el mes actual (o uno futuro);
   * para meses pasados, el último día de ese mes.
   */
  private getPaidDateForViewedMonth(): string {
    const today = todayLocalISO();
    const lastDay = lastDayOfMonthISO(this.currentMonth());
    return lastDay < today ? lastDay : today;
  }

  confirmPayment(item: ChecklistItem): void {
    if (this.paymentAmount() <= 0) return;

    this.paymentService.upsertPayment({
      service_id: item.service_id,
      amount: this.paymentAmount(),
      year_month: this.currentMonth(),
      paid_date: this.getPaidDateForViewedMonth(),
      notes: this.paymentNotes() || undefined
    }).subscribe({
      next: () => {
        this.cancelPayment();
        this.loadData();
      },
      error: (error) => {
        this.errorMessage.set(error?.message || this.localeService.t('dashboard.paymentError'));
      }
    });
  }

  unmarkPayment(item: ChecklistItem): void {
    if (!item.payment_id) return;

    this.paymentService.deletePayment(item.payment_id).subscribe({
      next: () => this.loadData(),
      error: (error) => {
        this.errorMessage.set(error?.message || this.localeService.t('dashboard.unmarkError'));
      }
    });
  }

  editPayment(item: ChecklistItem): void {
    this.startPayment(item);
  }

  onAvgMonthsChange(value: number): void {
    this.avgMonths.set(Number(value));
    this.loadData();
  }
}
