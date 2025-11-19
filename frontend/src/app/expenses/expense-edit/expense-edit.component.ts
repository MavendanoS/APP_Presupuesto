import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { ExpenseService } from '../../core/services/expense.service';
import { CategoryService } from '../../core/services/category.service';
import { Category, ExpenseType } from '../../core/models';
import { ErrorMessageComponent } from '../../shared/components/error-message/error-message.component';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';

@Component({
  selector: 'app-expense-edit',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, ErrorMessageComponent, NavbarComponent],
  templateUrl: './expense-edit.component.html',
  styleUrls: ['./expense-edit.component.scss']
})
export class ExpenseEditComponent implements OnInit {
  expenseForm: FormGroup;
  categories = signal<Category[]>([]);
  loading = signal(false);
  errorMessage = signal<string | null>(null);
  expenseId: number | null = null;

  expenseTypes: { value: ExpenseType; label: string; icon: string }[] = [
    { value: 'payment', label: 'Pago', icon: 'bi-calendar-check' },
    { value: 'purchase', label: 'Compra', icon: 'bi-cart' },
    { value: 'small_expense', label: 'Gasto Hormiga', icon: 'bi-cup-hot' }
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
      date: ['', Validators.required],
      notes: ['']
    });
  }

  ngOnInit(): void {
    // Obtener ID del gasto
    this.route.params.subscribe(params => {
      this.expenseId = +params['id'];
      if (this.expenseId) {
        this.loadExpense();
      }
    });

    // Actualizar categorías cuando cambia el tipo
    this.expenseForm.get('type')?.valueChanges.subscribe(() => {
      this.loadCategories();
    });
  }

  loadExpense(): void {
    if (!this.expenseId) return;

    this.loading.set(true);
    this.expenseService.getExpense(this.expenseId).subscribe({
      next: (response) => {
        const expense = response.expense;
        this.expenseForm.patchValue({
          type: expense.type,
          category_id: expense.category_id,
          amount: expense.amount,
          description: expense.description,
          date: expense.date,
          notes: expense.notes || ''
        });
        this.loadCategories();
        this.loading.set(false);
      },
      error: (error) => {
        this.errorMessage.set(error.message || 'Error al cargar el gasto');
        this.loading.set(false);
      }
    });
  }

  loadCategories(): void {
    const type = this.expenseForm.get('type')?.value as ExpenseType;
    this.categoryService.getCategories({ type }).subscribe({
      next: (response) => {
        this.categories.set(response.categories);
        // Si no hay categoría seleccionada, seleccionar la primera
        const currentCategoryId = this.expenseForm.get('category_id')?.value;
        if (!currentCategoryId && response.categories.length > 0) {
          this.expenseForm.patchValue({ category_id: response.categories[0].id });
        }
      },
      error: (error) => {
        console.error('Error al cargar categorías:', error);
      }
    });
  }

  onSubmit(): void {
    if (this.expenseForm.valid && !this.loading() && this.expenseId) {
      this.loading.set(true);
      this.errorMessage.set(null);

      const expenseData = {
        ...this.expenseForm.value,
        amount: parseFloat(this.expenseForm.value.amount)
      };

      this.expenseService.updateExpense(this.expenseId, expenseData).subscribe({
        next: () => {
          this.router.navigate(['/expenses']);
        },
        error: (error) => {
          this.errorMessage.set(error.message || 'Error al actualizar el gasto');
          this.loading.set(false);
        }
      });
    }
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
