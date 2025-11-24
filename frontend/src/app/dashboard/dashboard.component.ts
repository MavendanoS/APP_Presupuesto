import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../core/services/auth.service';
import { AnalyticsService } from '../core/services/analytics.service';
import { SavingsService } from '../core/services/savings.service';
import { DashboardMetrics, SavingsSummary } from '../core/models';
import { NavbarComponent } from '../shared/components/navbar/navbar.component';
import { LoadingComponent } from '../shared/components/loading/loading.component';
import { ErrorMessageComponent } from '../shared/components/error-message/error-message.component';
import { ExpenseChartComponent } from '../shared/components/expense-chart/expense-chart.component';
import { ClpCurrencyPipe } from '../shared/pipes/clp-currency.pipe';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    NavbarComponent,
    LoadingComponent,
    ErrorMessageComponent,
    ExpenseChartComponent,
    ClpCurrencyPipe
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  loading = signal(true);
  errorMessage = signal<string | null>(null);
  metrics = signal<DashboardMetrics | null>(null);
  savingsSummary = signal<SavingsSummary | null>(null);
  showAmounts = signal(false);

  // Filtros de fecha
  startDate = signal(this.getMonthStart());
  endDate = signal(this.getMonthEnd());

  // Computed signal para datos del gráfico - solo se recalcula cuando metrics cambia
  topCategoriesChartData = computed(() => {
    const categories = this.metrics()?.top_categories || [];
    return categories.map(cat => ({
      category_id: cat.id,
      category_name: cat.name,
      type: 'payment' as const,
      count: cat.expense_count,
      total: cat.total_amount
    }));
  });

  constructor(
    private authService: AuthService,
    private analyticsService: AnalyticsService,
    private savingsService: SavingsService,
    private router: Router
  ) {
    // Load preference from localStorage (default hidden)
    const saved = localStorage.getItem('showAmounts');
    this.showAmounts.set(saved === 'true');
  }

  get user() {
    return this.authService.currentUser;
  }

  ngOnInit(): void {
    this.loadMetrics();
    this.loadSavingsSummary();
  }

  toggleAmounts(): void {
    const newValue = !this.showAmounts();
    this.showAmounts.set(newValue);
    localStorage.setItem('showAmounts', newValue.toString());
  }

  formatAmount(amount: number): string {
    return this.showAmounts() ? this.formatCurrency(amount) : '****';
  }

  private formatCurrency(amount: number): string {
    const rounded = Math.round(amount);
    const formatted = rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return `$${formatted}`;
  }

  loadMetrics(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.analyticsService.getDashboardMetrics({
      start_date: this.startDate(),
      end_date: this.endDate()
    }).subscribe({
      next: (data) => {
        this.metrics.set(data);
        this.loading.set(false);
      },
      error: (error) => {
        this.errorMessage.set(error.message || 'Error al cargar métricas');
        this.loading.set(false);
      }
    });
  }

  loadSavingsSummary(): void {
    this.savingsService.getSavingsSummary().subscribe({
      next: (data) => {
        this.savingsSummary.set(data);
      },
      error: (error) => {
        console.error('Error al cargar resumen de ahorros:', error);
      }
    });
  }

  onStartDateChange(value: string): void {
    this.startDate.set(value);
    this.loadMetrics();
  }

  onEndDateChange(value: string): void {
    this.endDate.set(value);
    this.loadMetrics();
  }

  navigateToNewExpense(type: 'payment' | 'purchase' | 'small_expense'): void {
    this.router.navigate(['/expenses/new'], { queryParams: { type } });
  }

  getBalanceClass(): string {
    const balance = this.metrics()?.balance || 0;
    return balance >= 0 ? 'text-success' : 'text-danger';
  }

  getBalanceIcon(): string {
    const balance = this.metrics()?.balance || 0;
    return balance >= 0 ? 'bi-arrow-up-circle' : 'bi-arrow-down-circle';
  }

  getBalanceText(): string {
    const balance = this.metrics()?.balance || 0;
    return balance >= 0 ? 'Positivo' : 'Negativo';
  }

  getTotalCategories(): number {
    return this.metrics()?.top_categories.length || 0;
  }

  getExpensesByType(type: 'payment' | 'purchase' | 'small_expense'): number {
    const byType = this.metrics()?.expenses.by_type.find(t => t.type === type);
    return byType?.total || 0;
  }

  getTotalExpenseCount(): number {
    const byType = this.metrics()?.expenses.by_type || [];
    return byType.reduce((sum, t) => sum + t.count, 0);
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
