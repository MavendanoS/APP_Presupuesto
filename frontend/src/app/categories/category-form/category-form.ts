import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { CategoryService } from '../../core/services/category.service';
import { CategoryType } from '../../core/models/category.model';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { LoadingComponent } from '../../shared/components/loading/loading.component';

@Component({
  selector: 'app-category-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    NavbarComponent,
    LoadingComponent
  ],
  templateUrl: './category-form.html',
  styleUrl: './category-form.scss'
})
export class CategoryFormComponent implements OnInit {
  categoryForm!: FormGroup;
  isEditMode = signal(false);
  categoryId = signal<number | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);

  categoryTypes: { value: CategoryType; label: string }[] = [
    { value: 'payment', label: 'Pago' },
    { value: 'purchase', label: 'Compra' },
    { value: 'small_expense', label: 'Gasto Hormiga' }
  ];

  icons: string[] = [
    'bi-tag-fill', 'bi-credit-card-fill', 'bi-wallet2', 'bi-cart-fill', 'bi-bag-fill', 'bi-house-fill',
    'bi-car-front-fill', 'bi-phone-fill', 'bi-laptop-fill', 'bi-cup-hot-fill', 'bi-lightbulb-fill', 'bi-heart-fill',
    'bi-gift-fill', 'bi-music-note-beamed', 'bi-film', 'bi-book-fill', 'bi-bicycle', 'bi-briefcase-fill',
    'bi-cash-coin', 'bi-piggy-bank-fill', 'bi-receipt-cutoff', 'bi-calculator-fill', 'bi-graph-up-arrow', 'bi-currency-dollar'
  ];

  colors: string[] = [
    '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
    '#EC4899', '#14B8A6', '#F97316', '#6B7280', '#06B6D4'
  ];

  constructor(
    private fb: FormBuilder,
    private categoryService: CategoryService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.initForm();

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode.set(true);
      this.categoryId.set(parseInt(id));
      this.loadCategory(parseInt(id));
    }
  }

  private initForm(): void {
    this.categoryForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(50)]],
      type: ['payment', Validators.required],
      color: ['#3B82F6', Validators.required],
      icon: ['bi-tag-fill', Validators.required]
    });
  }

  private loadCategory(id: number): void {
    this.loading.set(true);
    this.error.set(null);

    this.categoryService.getCategoryById(id).subscribe({
      next: (response) => {
        const category = response.category;
        this.categoryForm.patchValue({
          name: category.name,
          type: category.type,
          color: category.color,
          icon: category.icon
        });
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.message || 'Error al cargar categoría');
        this.loading.set(false);
      }
    });
  }

  onSubmit(): void {
    if (this.categoryForm.invalid) {
      this.categoryForm.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    const formData = this.categoryForm.value;

    const request = this.isEditMode()
      ? this.categoryService.updateCategory(this.categoryId()!, formData)
      : this.categoryService.createCategory(formData);

    request.subscribe({
      next: () => {
        this.router.navigate(['/categories']);
      },
      error: (err) => {
        this.error.set(err.error?.message || 'Error al guardar categoría');
        this.loading.set(false);
      }
    });
  }

  cancel(): void {
    this.router.navigate(['/categories']);
  }

  getTypeLabel(type: CategoryType): string {
    return this.categoryTypes.find(t => t.value === type)?.label || type;
  }
}
