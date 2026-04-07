import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { IncomeService } from '../../core/services/income.service';

@Component({
  selector: 'app-income-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslocoPipe, NavbarComponent],
  templateUrl: './income-form.component.html',
  styleUrl: './income-form.component.scss'
})
export class IncomeFormComponent implements OnInit {
  incomeForm: FormGroup;
  loading = signal(false);
  error = signal<string | null>(null);
  isEditMode = signal(false);
  incomeId: number | null = null;

  // Valor formateado para mostrar en el input
  displayAmount = '';

  private translocoService = inject(TranslocoService);

  frequencies = [
    { value: 'once', label: this.translocoService.translate('income.once') },
    { value: 'weekly', label: this.translocoService.translate('income.weekly') },
    { value: 'biweekly', label: this.translocoService.translate('income.biweekly') },
    { value: 'monthly', label: this.translocoService.translate('income.monthly') },
    { value: 'annual', label: this.translocoService.translate('income.yearly') }
  ];

  constructor(
    private fb: FormBuilder,
    private incomeService: IncomeService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    const today = new Date().toISOString().split('T')[0];

    this.incomeForm = this.fb.group({
      source: ['', [Validators.required, Validators.minLength(3)]],
      amount: ['', [Validators.required, Validators.min(0.01)]],
      date: [today, Validators.required],
      is_recurring: [false],
      frequency: ['once'],
      notes: ['']
    });

    // Actualizar frecuencia cuando cambia is_recurring
    this.incomeForm.get('is_recurring')?.valueChanges.subscribe(isRecurring => {
      if (!isRecurring) {
        this.incomeForm.patchValue({ frequency: 'once' });
      }
    });
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.incomeId = parseInt(id);
      this.isEditMode.set(true);
      this.loadIncome(this.incomeId);
    }
  }

  loadIncome(id: number): void {
    this.loading.set(true);
    this.incomeService.getIncomeById(id).subscribe({
      next: (response) => {
        if (response.success) {
          this.incomeForm.patchValue(response.data.income);
          // Formatear el monto para mostrar
          if (response.data.income.amount) {
            this.formatAmount(response.data.income.amount);
          }
        }
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.message || 'Error al cargar ingreso');
        this.loading.set(false);
      }
    });
  }

  onSubmit(): void {
    if (this.incomeForm.valid) {
      this.loading.set(true);
      this.error.set(null);

      const request = this.isEditMode() && this.incomeId
        ? this.incomeService.updateIncome(this.incomeId, this.incomeForm.value)
        : this.incomeService.createIncome(this.incomeForm.value);

      request.subscribe({
        next: () => {
          this.loading.set(false);
          this.router.navigate(['/income']);
        },
        error: (err) => {
          this.loading.set(false);
          const action = this.isEditMode() ? 'actualizar' : 'crear';
          this.error.set(err.error?.message || `Error al ${action} el ingreso`);
        }
      });
    } else {
      Object.keys(this.incomeForm.controls).forEach(key => {
        this.incomeForm.get(key)?.markAsTouched();
      });
    }
  }

  onCancel(): void {
    this.router.navigate(['/income']);
  }

  onAmountInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    // Remover todo excepto números
    const numericValue = input.value.replace(/[^\d]/g, '');

    if (numericValue === '') {
      this.displayAmount = '';
      this.incomeForm.patchValue({ amount: '' });
      return;
    }

    const numValue = parseInt(numericValue, 10);
    // Formatear con separador de miles
    this.displayAmount = numValue.toLocaleString('es-CL');
    // Guardar valor numérico en el formulario
    this.incomeForm.patchValue({ amount: numValue }, { emitEvent: false });

    // Mantener el cursor en la posición correcta
    setTimeout(() => {
      input.value = this.displayAmount;
    });
  }

  private formatAmount(value: number): void {
    if (value) {
      this.displayAmount = value.toLocaleString('es-CL');
    }
  }
}
