import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { CategoryService } from '../../core/services/category.service';
import { Category, CategoryType, CategoryWithStats } from '../../core/models/category.model';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { LoadingComponent } from '../../shared/components/loading/loading.component';
import { ErrorMessageComponent } from '../../shared/components/error-message/error-message.component';

@Component({
  selector: 'app-category-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    NavbarComponent,
    LoadingComponent,
    ErrorMessageComponent
  ],
  templateUrl: './category-list.html',
  styleUrl: './category-list.scss'
})
export class CategoryListComponent implements OnInit {
  categories = signal<CategoryWithStats[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  viewMode = signal<'simple' | 'stats'>('stats');
  filterType = signal<CategoryType | 'all'>('all');

  categoryTypes: { value: CategoryType | 'all'; label: string }[] = [
    { value: 'all', label: 'Todas' },
    { value: 'payment', label: 'Pagos' },
    { value: 'purchase', label: 'Compras' },
    { value: 'small_expense', label: 'Gastos Hormiga' }
  ];

  constructor(
    private categoryService: CategoryService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadCategories();
  }

  loadCategories(): void {
    this.loading.set(true);
    this.error.set(null);

    const filters = this.filterType() !== 'all' ? { type: this.filterType() as CategoryType } : undefined;

    const request = this.viewMode() === 'stats'
      ? this.categoryService.getCategoriesWithStats(filters)
      : this.categoryService.getCategories(filters);

    request.subscribe({
      next: (response) => {
        this.categories.set(response.categories as CategoryWithStats[]);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.message || 'Error al cargar categorías');
        this.loading.set(false);
      }
    });
  }

  changeFilter(type: CategoryType | 'all'): void {
    this.filterType.set(type);
    this.loadCategories();
  }

  toggleViewMode(): void {
    this.viewMode.set(this.viewMode() === 'simple' ? 'stats' : 'simple');
    this.loadCategories();
  }

  editCategory(id: number): void {
    this.router.navigate(['/categories/edit', id]);
  }

  deleteCategory(category: Category): void {
    if (!confirm(`¿Estás seguro de eliminar la categoría "${category.name}"?`)) {
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    this.categoryService.deleteCategory(category.id).subscribe({
      next: () => {
        this.categories.set(this.categories().filter(c => c.id !== category.id));
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.message || 'Error al eliminar categoría');
        this.loading.set(false);
      }
    });
  }

  getTypeLabel(type: CategoryType): string {
    return this.categoryTypes.find(t => t.value === type)?.label || type;
  }

  getTypeBadgeClass(type: CategoryType): string {
    const classes: Record<CategoryType, string> = {
      payment: 'primary',
      purchase: 'warning',
      small_expense: 'danger'
    };
    return classes[type] || 'secondary';
  }

  formatCurrency(amount: number): string {
    const rounded = Math.round(amount);
    const formatted = rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return `$${formatted}`;
  }

  getCategoriesByType(type: CategoryType): CategoryWithStats[] {
    if (this.filterType() !== 'all') {
      return this.categories();
    }
    return this.categories().filter(cat => cat.type === type);
  }

  getVisibleTypes(): CategoryType[] {
    if (this.filterType() !== 'all') {
      return [this.filterType() as CategoryType];
    }
    return ['payment', 'purchase', 'small_expense'];
  }

  getTotalAmountByType(type: CategoryType): number {
    return this.getCategoriesByType(type).reduce((sum, cat) => sum + (cat.total_amount || 0), 0);
  }

  getTotalCountByType(type: CategoryType): number {
    return this.getCategoriesByType(type).reduce((sum, cat) => sum + (cat.expense_count || 0), 0);
  }
}
