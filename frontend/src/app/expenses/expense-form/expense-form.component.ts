import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { ExpenseService } from '../../core/services/expense.service';
import { CategoryService } from '../../core/services/category.service';
import { Category, ExpenseType } from '../../core/models';
import { ErrorMessageComponent } from '../../shared/components/error-message/error-message.component';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';

@Component({
  selector: 'app-expense-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, TranslocoPipe, ErrorMessageComponent, NavbarComponent],
  templateUrl: './expense-form.component.html',
  styleUrls: ['./expense-form.component.scss']
})
export class ExpenseFormComponent implements OnInit {
  expenseForm: FormGroup;
  categories = signal<Category[]>([]);
  loading = signal(false);
  errorMessage = signal<string | null>(null);

  private translocoService = inject(TranslocoService);

  expenseTypes: { value: ExpenseType; label: string; icon: string }[] = [
    { value: 'payment', label: this.translocoService.translate('expenses.payment'), icon: 'bi-calendar-check' },
    { value: 'purchase', label: this.translocoService.translate('expenses.purchase'), icon: 'bi-cart' },
    { value: 'small_expense', label: this.translocoService.translate('expenses.smallExpense'), icon: 'bi-cup-hot' }
  ];

  constructor(
    private fb: FormBuilder,
    private expenseService: ExpenseService,
    private categoryService: CategoryService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.expenseForm = this.fb.group({
      type: ['payment', Validators.required],
      category_id: [null],
      amount: ['', [Validators.required, Validators.min(1)]],
      description: ['', [Validators.required, Validators.minLength(3)]],
      date: [this.getTodayDate(), Validators.required],
      notes: ['']
    });
  }

  ngOnInit(): void {
    // Verificar si hay un tipo pre-seleccionado en los query params
    this.route.queryParams.subscribe(params => {
      if (params['type'] && this.isValidExpenseType(params['type'])) {
        this.expenseForm.patchValue({ type: params['type'] });
      }
      this.loadCategories();
    });

    // Actualizar categorías cuando cambia el tipo
    this.expenseForm.get('type')?.valueChanges.subscribe(() => {
      this.loadCategories();
    });
  }

  isValidExpenseType(type: string): boolean {
    return ['payment', 'purchase', 'small_expense'].includes(type);
  }

  loadCategories(): void {
    const type = this.expenseForm.get('type')?.value as ExpenseType;
    this.categoryService.getCategories({ type }).subscribe({
      next: (response) => {
        this.categories.set(response.categories);
        // Seleccionar primera categoría por defecto
        if (response.categories.length > 0) {
          this.expenseForm.patchValue({ category_id: response.categories[0].id });
        }
      },
      error: (error) => {
        console.error('Error al cargar categorías:', error);
      }
    });
  }

  onSubmit(): void {
    if (this.expenseForm.valid && !this.loading()) {
      this.loading.set(true);
      this.errorMessage.set(null);

      const expenseData = {
        ...this.expenseForm.value,
        amount: parseFloat(this.expenseForm.value.amount)
      };

      this.expenseService.createExpense(expenseData).subscribe({
        next: () => {
          this.router.navigate(['/expenses']);
        },
        error: (error) => {
          this.errorMessage.set(error.message || 'Error al crear el gasto');
          this.loading.set(false);
        }
      });
    }
  }

  getTodayDate(): string {
    return new Date().toISOString().split('T')[0];
  }

  get type() {
    return this.expenseForm.get('type');
  }

  get amount() {
    return this.expenseForm.get('amount');
  }

  get description() {
    return this.expenseForm.get('description');
  }

  get date() {
    return this.expenseForm.get('date');
  }
}
