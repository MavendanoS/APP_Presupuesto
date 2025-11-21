import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { SavingsService } from '../../core/services/savings.service';
import { DataRefreshService } from '../../core/services/data-refresh.service';
import { SavingsGoal, SavingsTransaction, SavingsGoalWithProgress } from '../../core/models/savings.model';

@Component({
  selector: 'app-savings-detail',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, NavbarComponent],
  templateUrl: './savings-detail.html',
  styleUrl: './savings-detail.scss'
})
export class SavingsDetailComponent implements OnInit, OnDestroy {
  goal = signal<SavingsGoalWithProgress | null>(null);
  transactions = signal<SavingsTransaction[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  showTransactionForm = signal(false);
  transactionForm: FormGroup;
  processingTransaction = signal(false);

  private goalId!: number;
  private refreshSubscription?: Subscription;

  constructor(
    private fb: FormBuilder,
    private savingsService: SavingsService,
    private dataRefresh: DataRefreshService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.transactionForm = this.fb.group({
      type: ['deposit', Validators.required],
      amount: [0, [Validators.required, Validators.min(1)]],
      date: [new Date().toISOString().split('T')[0], Validators.required],
      notes: ['']
    });
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.goalId = parseInt(id);
      this.loadGoalDetails();
      this.loadTransactions();

      this.refreshSubscription = this.dataRefresh.savingsChanged$.subscribe(() => {
        this.loadGoalDetails();
        this.loadTransactions();
      });
    }
  }

  ngOnDestroy(): void {
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
    }
  }

  loadGoalDetails(): void {
    this.loading.set(true);
    this.savingsService.getSavingsGoalById(this.goalId).subscribe({
      next: (response) => {
        const goalWithProgress = {
          ...response.goal,
          ...this.savingsService.calculateProgress(response.goal)
        };
        this.goal.set(goalWithProgress);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.message || 'Error al cargar meta');
        this.loading.set(false);
      }
    });
  }

  loadTransactions(): void {
    this.savingsService.getTransactions(this.goalId, { limit: 50 }).subscribe({
      next: (response) => {
        this.transactions.set(response.transactions);
      },
      error: (err) => {
        console.error('Error al cargar transacciones:', err);
      }
    });
  }

  toggleTransactionForm(): void {
    this.showTransactionForm.set(!this.showTransactionForm());
    if (this.showTransactionForm()) {
      this.transactionForm.reset({
        type: 'deposit',
        amount: 0,
        date: new Date().toISOString().split('T')[0],
        notes: ''
      });
    }
  }

  onSubmitTransaction(): void {
    if (this.transactionForm.invalid) {
      this.transactionForm.markAllAsTouched();
      return;
    }

    this.processingTransaction.set(true);
    const data = this.transactionForm.value;

    this.savingsService.createTransaction(this.goalId, data).subscribe({
      next: () => {
        this.loadGoalDetails();
        this.loadTransactions();
        this.toggleTransactionForm();
        this.processingTransaction.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.message || 'Error al crear transacción');
        this.processingTransaction.set(false);
      }
    });
  }

  deleteTransaction(transaction: SavingsTransaction): void {
    if (!confirm('¿Eliminar esta transacción?')) return;

    this.savingsService.deleteTransaction(this.goalId, transaction.id).subscribe({
      next: () => {
        this.loadGoalDetails();
        this.loadTransactions();
      },
      error: (err) => {
        this.error.set(err.error?.message || 'Error al eliminar transacción');
      }
    });
  }

  getProgressClass(percentage: number): string {
    if (percentage >= 100) return 'bg-success';
    if (percentage >= 75) return 'bg-info';
    if (percentage >= 50) return 'bg-warning';
    return 'bg-danger';
  }

  formatCurrency(amount: number): string {
    return `$${Math.round(amount).toLocaleString('es-CL')}`;
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('es-CL', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  getTransactionIcon(type: string): string {
    return type === 'deposit' ? 'arrow-down-circle' : 'arrow-up-circle';
  }

  getTransactionClass(type: string): string {
    return type === 'deposit' ? 'text-success' : 'text-danger';
  }
}
