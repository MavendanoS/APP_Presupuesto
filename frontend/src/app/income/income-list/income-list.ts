import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { IncomeService } from '../../core/services/income.service';
import { Income } from '../../core/models/income.model';

@Component({
  selector: 'app-income-list',
  standalone: true,
  imports: [CommonModule, RouterLink, NavbarComponent],
  templateUrl: './income-list.html',
  styleUrl: './income-list.scss'
})
export class IncomeListComponent implements OnInit {
  incomes = signal<Income[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);

  filters = signal({
    is_recurring: undefined as boolean | undefined,
    start_date: this.getFirstDayOfMonth(),
    end_date: this.getLastDayOfMonth()
  });

  totalAmount = signal(0);

  constructor(
    private incomeService: IncomeService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadIncomes();
  }

  loadIncomes(): void {
    this.loading.set(true);
    this.error.set(null);

    this.incomeService.getIncomes(this.filters()).subscribe({
      next: (response) => {
        if (response.success) {
          this.incomes.set(response.data.incomes);
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
    this.loadIncomes();
  }

  onEndDateChange(value: string): void {
    this.filters.set({ ...this.filters(), end_date: value });
    this.loadIncomes();
  }

  onTypeChange(value: string): void {
    const isRecurring = value === '' ? undefined : value === 'true';
    this.filters.set({ ...this.filters(), is_recurring: isRecurring });
    this.loadIncomes();
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
}
