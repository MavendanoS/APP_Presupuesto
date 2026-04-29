import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { MonthlyIncomeService } from '../../core/services/monthly-income.service';
import { MonthlyIncome, IncomeMonthlySummary } from '../../core/models';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { LoadingComponent } from '../../shared/components/loading/loading.component';
import { ErrorMessageComponent } from '../../shared/components/error-message/error-message.component';
import { ClpCurrencyPipe } from '../../shared/pipes/clp-currency.pipe';

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
    ErrorMessageComponent,
    ClpCurrencyPipe
  ],
  templateUrl: './income-list.component.html',
  styleUrls: ['./income-list.component.scss']
})
export class IncomeListComponent implements OnInit {
  loading = signal(true);
  errorMessage = signal<string | null>(null);
  summary = signal<IncomeMonthlySummary | null>(null);
  currentMonth = signal(this.getCurrentYearMonth());
  showAmounts = signal(false);

  incomes = computed<MonthlyIncome[]>(() => this.summary()?.incomes ?? []);
  total = computed<number>(() => this.summary()?.total ?? 0);
  count = computed<number>(() => this.summary()?.count ?? 0);

  displayMonth = computed(() => {
    const [year, month] = this.currentMonth().split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' });
  });

  constructor(
    private incomeService: MonthlyIncomeService,
    private router: Router
  ) {
    const saved = localStorage.getItem('showAmounts');
    this.showAmounts.set(saved === 'true');
  }

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.incomeService.getMonthlySummary(this.currentMonth()).subscribe({
      next: (data) => {
        this.summary.set(data);
        this.loading.set(false);
      },
      error: (error) => {
        this.errorMessage.set(error?.message || 'Error al cargar ingresos');
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

  newIncome(): void {
    this.router.navigate(['/incomes/new'], {
      queryParams: { month: this.currentMonth() }
    });
  }

  editIncome(income: MonthlyIncome): void {
    this.router.navigate(['/incomes/edit', income.id]);
  }

  deleteIncome(income: MonthlyIncome): void {
    const confirmed = confirm(`¿Eliminar el ingreso "${income.description}"?`);
    if (!confirmed) return;

    this.incomeService.delete(income.id).subscribe({
      next: () => this.loadData(),
      error: (error) => {
        this.errorMessage.set(error?.message || 'Error al eliminar ingreso');
      }
    });
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
    return this.formatYearMonth(new Date());
  }

  private formatYearMonth(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }
}
