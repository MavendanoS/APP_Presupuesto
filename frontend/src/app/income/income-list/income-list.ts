import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { IncomeService } from '../../core/services/income.service';
import { DataRefreshService } from '../../core/services/data-refresh.service';
import { Income } from '../../core/models/income.model';

@Component({
  selector: 'app-income-list',
  standalone: true,
  imports: [CommonModule, RouterLink, NavbarComponent],
  templateUrl: './income-list.html',
  styleUrl: './income-list.scss'
})
export class IncomeListComponent implements OnInit, OnDestroy {
  incomes = signal<Income[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);

  filters = signal({
    is_recurring: undefined as boolean | undefined,
    start_date: this.getFirstDayOfMonth(),
    end_date: this.getLastDayOfMonth()
  });

  totalAmount = signal(0);

  // Paginación
  currentPage = signal(1);
  itemsPerPage = signal(10);
  totalItems = signal(0);
  totalPages = signal(0);

  // Ordenamiento
  sortColumn = signal<string>('date');
  sortDirection = signal<'asc' | 'desc'>('desc');

  // Math para template
  Math = Math;

  // Subscription para limpieza
  private refreshSubscription?: Subscription;

  constructor(
    private incomeService: IncomeService,
    private router: Router,
    private dataRefresh: DataRefreshService
  ) {}

  ngOnInit(): void {
    this.loadIncomes();

    // Suscribirse a cambios de ingresos para actualización automática
    this.refreshSubscription = this.dataRefresh.incomeChanged$.subscribe(() => {
      this.loadIncomes();
    });
  }

  ngOnDestroy(): void {
    // Limpiar suscripción para evitar memory leaks
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
    }
  }

  loadIncomes(): void {
    this.loading.set(true);
    this.error.set(null);

    const filtersWithPagination = {
      ...this.filters(),
      limit: this.itemsPerPage(),
      offset: (this.currentPage() - 1) * this.itemsPerPage()
    };

    this.incomeService.getIncomes(filtersWithPagination).subscribe({
      next: (response) => {
        if (response.success) {
          this.incomes.set(response.data.incomes);
          this.totalItems.set(response.data.total || response.data.incomes.length);
          this.totalPages.set(Math.ceil(this.totalItems() / this.itemsPerPage()));
          this.sortIncomes();
          this.calculateTotal();
        }
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.message || 'Error al cargar ingresos');
        this.loading.set(false);
      }
    });
  }

  calculateTotal(): void {
    const total = this.incomes().reduce((sum, income) => sum + income.amount, 0);
    this.totalAmount.set(total);
  }

  onStartDateChange(value: string): void {
    this.filters.set({ ...this.filters(), start_date: value });
    this.currentPage.set(1);
    this.loadIncomes();
  }

  onEndDateChange(value: string): void {
    this.filters.set({ ...this.filters(), end_date: value });
    this.currentPage.set(1);
    this.loadIncomes();
  }

  onTypeChange(value: string): void {
    const isRecurring = value === '' ? undefined : value === 'true';
    this.filters.set({ ...this.filters(), is_recurring: isRecurring });
    this.currentPage.set(1);
    this.loadIncomes();
  }

  onItemsPerPageChange(value: number): void {
    this.itemsPerPage.set(value);
    this.currentPage.set(1);
    this.loadIncomes();
  }

  onPageChange(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
      this.loadIncomes();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  deleteIncome(income: Income): void {
    if (confirm(`¿Estás seguro de eliminar el ingreso "${income.source}"?`)) {
      this.incomeService.deleteIncome(income.id).subscribe({
        next: () => {
          this.loadIncomes();
        },
        error: (err) => {
          alert(err.error?.message || 'Error al eliminar ingreso');
        }
      });
    }
  }

  editIncome(id: number): void {
    this.router.navigate(['/income', 'edit', id]);
  }

  getFrequencyLabel(frequency: string): string {
    const labels: Record<string, string> = {
      'once': 'Una vez',
      'weekly': 'Semanal',
      'biweekly': 'Quincenal',
      'monthly': 'Mensual',
      'annual': 'Anual'
    };
    return labels[frequency] || frequency;
  }

  getPageNumbers(): number[] {
    const total = this.totalPages();
    const current = this.currentPage();
    const pages: number[] = [];

    if (total <= 7) {
      // Mostrar todas las páginas
      for (let i = 1; i <= total; i++) {
        pages.push(i);
      }
    } else {
      // Mostrar páginas con ellipsis
      if (current <= 4) {
        pages.push(1, 2, 3, 4, 5, -1, total);
      } else if (current >= total - 3) {
        pages.push(1, -1, total - 4, total - 3, total - 2, total - 1, total);
      } else {
        pages.push(1, -1, current - 1, current, current + 1, -1, total);
      }
    }

    return pages;
  }

  private getFirstDayOfMonth(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}-01`;
  }

  private getLastDayOfMonth(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const day = String(lastDay).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  sortBy(column: string): void {
    if (this.sortColumn() === column) {
      // Cambiar dirección si es la misma columna
      this.sortDirection.set(this.sortDirection() === 'asc' ? 'desc' : 'asc');
    } else {
      // Nueva columna, ordenar ascendente por defecto
      this.sortColumn.set(column);
      this.sortDirection.set('asc');
    }
    this.sortIncomes();
  }

  sortIncomes(): void {
    const sorted = [...this.incomes()].sort((a, b) => {
      const column = this.sortColumn();
      const direction = this.sortDirection();
      let aValue: any;
      let bValue: any;

      switch (column) {
        case 'date':
          aValue = new Date(a.date).getTime();
          bValue = new Date(b.date).getTime();
          break;
        case 'source':
          aValue = a.source.toLowerCase();
          bValue = b.source.toLowerCase();
          break;
        case 'amount':
          aValue = a.amount;
          bValue = b.amount;
          break;
        case 'frequency':
          aValue = this.getFrequencyLabel(a.frequency).toLowerCase();
          bValue = this.getFrequencyLabel(b.frequency).toLowerCase();
          break;
        default:
          return 0;
      }

      if (aValue < bValue) {
        return direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return direction === 'asc' ? 1 : -1;
      }
      return 0;
    });

    this.incomes.set(sorted);
  }

  getSortIcon(column: string): string {
    if (this.sortColumn() !== column) {
      return 'bi-arrow-down-up';
    }
    return this.sortDirection() === 'asc' ? 'bi-sort-up' : 'bi-sort-down';
  }
}
