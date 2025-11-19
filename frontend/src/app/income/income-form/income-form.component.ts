import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { IncomeService } from '../../core/services/income.service';

@Component({
  selector: 'app-income-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NavbarComponent],
  templateUrl: './income-form.component.html',
  styleUrl: './income-form.component.scss'
})
export class IncomeFormComponent implements OnInit {
  incomeForm: FormGroup;
  loading = signal(false);
  error = signal<string | null>(null);
  isEditMode = signal(false);
  incomeId: number | null = null;

  frequencies = [
    { value: 'once', label: 'Una vez' },
    { value: 'weekly', label: 'Semanal' },
    { value: 'biweekly', label: 'Quincenal' },
    { value: 'monthly', label: 'Mensual' },
    { value: 'annual', label: 'Anual' }
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
}
