import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { MonthlyIncomeService } from '../../core/services/monthly-income.service';
import { CreateIncomeRequest, UpdateIncomeRequest } from '../../core/models';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { LoadingComponent } from '../../shared/components/loading/loading.component';
import { ErrorMessageComponent } from '../../shared/components/error-message/error-message.component';

@Component({
  selector: 'app-income-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    TranslocoPipe,
    NavbarComponent,
    LoadingComponent,
    ErrorMessageComponent
  ],
  templateUrl: './income-form.component.html',
  styleUrls: ['./income-form.component.scss']
})
export class IncomeFormComponent implements OnInit {
  loading = signal(false);
  saving = signal(false);
  errorMessage = signal<string | null>(null);
  isEditMode = signal(false);
  incomeId = signal<number | null>(null);

  // Form fields
  description = signal('');
  amount = signal<number | null>(null);
  yearMonth = signal(this.getCurrentYearMonth());
  receivedDate = signal<string>('');
  notes = signal('');

  constructor(
    private incomeService: MonthlyIncomeService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      const id = parseInt(idParam);
      if (!isNaN(id)) {
        this.isEditMode.set(true);
        this.incomeId.set(id);
        this.loadIncome(id);
      }
    } else {
      // En modo creacion, intentar usar el query param ?month=YYYY-MM
      const monthParam = this.route.snapshot.queryParamMap.get('month');
      if (monthParam && /^\d{4}-(0[1-9]|1[0-2])$/.test(monthParam)) {
        this.yearMonth.set(monthParam);
      }
      // Por defecto, fecha de recepcion = hoy
      this.receivedDate.set(new Date().toISOString().split('T')[0]);
    }
  }

  loadIncome(id: number): void {
    this.loading.set(true);
    this.incomeService.getById(id).subscribe({
      next: (data) => {
        const income = data.income;
        this.description.set(income.description);
        this.amount.set(income.amount);
        this.yearMonth.set(income.year_month);
        this.receivedDate.set(income.received_date || '');
        this.notes.set(income.notes || '');
        this.loading.set(false);
      },
      error: (error) => {
        this.errorMessage.set(error?.message || 'Error al cargar ingreso');
        this.loading.set(false);
      }
    });
  }

  save(form: NgForm): void {
    if (form.invalid) {
      form.control.markAllAsTouched();
      return;
    }

    const desc = this.description().trim();
    const amt = this.amount();

    if (!desc || desc.length < 2) {
      this.errorMessage.set('La descripción debe tener al menos 2 caracteres');
      return;
    }

    if (!amt || amt <= 0) {
      this.errorMessage.set('El monto debe ser mayor a 0');
      return;
    }

    this.saving.set(true);
    this.errorMessage.set(null);

    if (this.isEditMode()) {
      const payload: UpdateIncomeRequest = {
        description: desc,
        amount: amt,
        year_month: this.yearMonth(),
        received_date: this.receivedDate() || null,
        notes: this.notes().trim() || null
      };

      this.incomeService.update(this.incomeId()!, payload).subscribe({
        next: () => {
          this.saving.set(false);
          this.router.navigate(['/incomes'], {
            queryParams: { month: this.yearMonth() }
          });
        },
        error: (error) => {
          this.errorMessage.set(error?.message || 'Error al actualizar ingreso');
          this.saving.set(false);
        }
      });
    } else {
      const payload: CreateIncomeRequest = {
        description: desc,
        amount: amt,
        year_month: this.yearMonth(),
        received_date: this.receivedDate() || undefined,
        notes: this.notes().trim() || undefined
      };

      this.incomeService.create(payload).subscribe({
        next: () => {
          this.saving.set(false);
          this.router.navigate(['/incomes'], {
            queryParams: { month: this.yearMonth() }
          });
        },
        error: (error) => {
          this.errorMessage.set(error?.message || 'Error al registrar ingreso');
          this.saving.set(false);
        }
      });
    }
  }

  cancel(): void {
    this.router.navigate(['/incomes']);
  }

  private getCurrentYearMonth(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }
}
