import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../core/services/auth.service';
import { AnalyticsService } from '../core/services/analytics.service';
import { DashboardMetrics } from '../core/models';
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
  showAmounts = signal(false);

  constructor(
    private authService: AuthService,
    private analyticsService: AnalyticsService,
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

    // Obtener métricas del mes actual
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .split('T')[0];
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      .toISOString()
      .split('T')[0];

    this.analyticsService.getDashboardMetrics({ start_date: startDate, end_date: endDate }).subscribe({
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

  getTopCategoriesAsChartData() {
    const categories = this.metrics()?.top_categories || [];
    return categories.map(cat => ({
      category_id: cat.id,
      category_name: cat.name,
      type: 'payment' as const, // Tipo por defecto, ya que top_categories no tiene type
      count: cat.expense_count,
      total: cat.total_amount
    }));
  }
}
