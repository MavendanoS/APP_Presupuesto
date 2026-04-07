import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { AuthService } from '../core/services/auth.service';
import { MonthlyPaymentService } from '../core/services/monthly-payment.service';
import { BudgetSummary, ChecklistItem } from '../core/models';
import { NavbarComponent } from '../shared/components/navbar/navbar.component';
import { LoadingComponent } from '../shared/components/loading/loading.component';
import { ErrorMessageComponent } from '../shared/components/error-message/error-message.component';
import { ClpCurrencyPipe } from '../shared/pipes/clp-currency.pipe';

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
    ClpCurrencyPipe
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  loading = signal(true);
  errorMessage = signal<string | null>(null);
  budgetData = signal<BudgetSummary | null>(null);
  showAmounts = signal(false);
  currentMonth = signal(this.getCurrentYearMonth());
  avgMonths = signal(3);

  // Payment editing state
  editingServiceId = signal<number | null>(null);
  paymentAmount = signal<number>(0);
  paymentNotes = signal('');

  // Computed
  displayMonth = computed(() => {
    const [year, month] = this.currentMonth().split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' });
  });

  checklist = computed(() => this.budgetData()?.checklist || []);
  summary = computed(() => this.budgetData()?.summary || { total_expected: 0, total_paid: 0, remaining: 0, paid_count: 0, total_count: 0 });
  progressPercent = computed(() => {
    const s = this.summary();
    return s.total_count > 0 ? Math.round((s.paid_count / s.total_count) * 100) : 0;
  });
  allPaid = computed(() => {
    const s = this.summary();
    return s.total_count > 0 && s.paid_count === s.total_count;
  });

  constructor(
    private authService: AuthService,
    private paymentService: MonthlyPaymentService
  ) {
    const saved = localStorage.getItem('showAmounts');
    this.showAmounts.set(saved === 'true');
  }

  get user() {
    return this.authService.currentUser;
  }

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.editingServiceId.set(null);

    this.paymentService.getBudgetSummary(this.currentMonth(), this.avgMonths()).subscribe({
      next: (data) => {
        this.budgetData.set(data);
        this.loading.set(false);
      },
      error: (error) => {
        this.errorMessage.set(error.message || 'Error al cargar datos');
        this.loading.set(false);
      }
    });
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
    const formatted = rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return `$${formatted}`;
  }

  previousMonth(): void {
    const [year, month] = this.currentMonth().split('-').map(Number);
    const date = new Date(year, month - 2, 1);
    this.currentMonth.set(this.formatYearMonth(date));
    this.loadData();
  }

  nextMonth(): void {
    const [year, month] = this.currentMonth().split('-').map(Number);
    const date = new Date(year, month, 1);
    this.currentMonth.set(this.formatYearMonth(date));
    this.loadData();
  }

  goToCurrentMonth(): void {
    this.currentMonth.set(this.getCurrentYearMonth());
    this.loadData();
  }

  isCurrentMonth(): boolean {
    return this.currentMonth() === this.getCurrentYearMonth();
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

  confirmPayment(item: ChecklistItem): void {
    if (this.paymentAmount() <= 0) return;

    const today = new Date().toISOString().split('T')[0];
    this.paymentService.upsertPayment({
      service_id: item.service_id,
      amount: this.paymentAmount(),
      year_month: this.currentMonth(),
      paid_date: today,
      notes: this.paymentNotes() || undefined
    }).subscribe({
      next: () => {
        this.cancelPayment();
        this.loadData();
      },
      error: (error) => {
        this.errorMessage.set(error.message || 'Error al registrar pago');
      }
    });
  }

  unmarkPayment(item: ChecklistItem): void {
    if (!item.payment_id) return;

    this.paymentService.deletePayment(item.payment_id).subscribe({
      next: () => this.loadData(),
      error: (error) => {
        this.errorMessage.set(error.message || 'Error al desmarcar pago');
      }
    });
  }

  editPayment(item: ChecklistItem): void {
    this.startPayment(item);
  }

  onAvgMonthsChange(value: number): void {
    this.avgMonths.set(value);
    this.loadData();
  }

  private getCurrentYearMonth(): string {
    return this.formatYearMonth(new Date());
  }

  private formatYearMonth(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }
}
