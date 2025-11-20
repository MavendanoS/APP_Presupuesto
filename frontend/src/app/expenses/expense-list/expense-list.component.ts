import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ExpenseService } from '../../core/services/expense.service';
import { CategoryService } from '../../core/services/category.service';
import { Expense, Category, ExpenseType, ExpenseFilters } from '../../core/models';
import { LoadingComponent } from '../../shared/components/loading/loading.component';
import { ErrorMessageComponent } from '../../shared/components/error-message/error-message.component';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { ClpCurrencyPipe } from '../../shared/pipes/clp-currency.pipe';
import { ExpenseTypePipe } from '../../shared/pipes/expense-type.pipe';

@Component({
  selector: 'app-expense-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    LoadingComponent,
    ErrorMessageComponent,
    NavbarComponent,
    ClpCurrencyPipe,
    ExpenseTypePipe
  ],
  templateUrl: './expense-list.component.html',
  styleUrls: ['./expense-list.component.scss']
})
export class ExpenseListComponent implements OnInit {
  expenses = signal<Expense[]>([]);
  categories = signal<Category[]>([]);
  loading = signal(false);
  errorMessage = signal<string | null>(null);

  // Paginación
  currentPage = signal(1);
  itemsPerPage = 10;
  totalItems = signal(0);
  totalPages = signal(0);

  // Math para template
  Math = Math;

  // Formulario de filtros
  filterForm: FormGroup;

  // Tipos de gasto
  expenseTypes: { value: ExpenseType | 'all'; label: string }[] = [
    { value: 'all', label: 'Todos' },
    { value: 'payment', label: 'Pagos' },
    { value: 'purchase', label: 'Compras' },
    { value: 'small_expense', label: 'Gastos Hormiga' }
  ];

  constructor(
    private fb: FormBuilder,
    private expenseService: ExpenseService,
    private categoryService: CategoryService
  ) {
    this.filterForm = this.fb.group({
      type: ['all'],
      category_id: [null],
      start_date: [''],
      end_date: [''],
      search: ['']
    });
  }

  ngOnInit(): void {
    this.loadCategories();
    this.loadExpenses();

    // Recargar cuando cambian los filtros
    this.filterForm.valueChanges.subscribe(() => {
      this.currentPage.set(1);
      this.loadExpenses();
    });
  }

  loadCategories(): void {
    this.categoryService.getCategories().subscribe({
      next: (response) => {
        this.categories.set(response.categories);
      },
      error: (error) => {
        console.error('Error al cargar categorías:', error);
      }
    });
  }

  loadExpenses(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    const filters = this.buildFilters();

    this.expenseService.getExpenses(filters).subscribe({
      next: (response) => {
        this.expenses.set(response.expenses);
        this.totalItems.set(response.total);
        this.totalPages.set(Math.ceil(response.total / this.itemsPerPage));
        this.loading.set(false);
      },
      error: (error) => {
        this.errorMessage.set(error.message || 'Error al cargar gastos');
        this.loading.set(false);
      }
    });
  }

  buildFilters(): ExpenseFilters {
    const formValue = this.filterForm.value;
    const filters: ExpenseFilters = {
      limit: this.itemsPerPage,
      offset: (this.currentPage() - 1) * this.itemsPerPage
    };

    if (formValue.type && formValue.type !== 'all') {
      filters.type = formValue.type;
    }

    if (formValue.category_id) {
      filters.category_id = formValue.category_id;
    }

    if (formValue.start_date) {
      filters.start_date = formValue.start_date;
    }

    if (formValue.end_date) {
      filters.end_date = formValue.end_date;
    }

    if (formValue.search) {
      filters.search = formValue.search;
    }

    return filters;
  }

  onPageChange(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
      this.loadExpenses();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  resetFilters(): void {
    this.filterForm.reset({
      type: 'all',
      category_id: null,
      start_date: '',
      end_date: '',
      search: ''
    });
  }

  deleteExpense(id: number): void {
    if (confirm('¿Estás seguro de eliminar este gasto?')) {
      this.expenseService.deleteExpense(id).subscribe({
        next: () => {
          this.loadExpenses();
        },
        error: (error) => {
          this.errorMessage.set(error.message || 'Error al eliminar el gasto');
        }
      });
    }
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
}
