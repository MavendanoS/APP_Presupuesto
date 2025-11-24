import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { TranslocoPipe } from '@jsverse/transloco';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { SavingsService } from '../../core/services/savings.service';
import { DataRefreshService } from '../../core/services/data-refresh.service';
import { SavingsGoal, SavingsGoalWithProgress } from '../../core/models/savings.model';

@Component({
  selector: 'app-savings-list',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslocoPipe, NavbarComponent],
  templateUrl: './savings-list.html',
  styleUrl: './savings-list.scss'
})
export class SavingsListComponent implements OnInit, OnDestroy {
  goals = signal<SavingsGoalWithProgress[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  filterStatus = signal<'all' | 'active' | 'completed'>('all');

  private refreshSubscription?: Subscription;

  constructor(
    private savingsService: SavingsService,
    private router: Router,
    private dataRefresh: DataRefreshService
  ) {}

  ngOnInit(): void {
    this.loadGoals();

    this.refreshSubscription = this.dataRefresh.savingsChanged$.subscribe(() => {
      this.loadGoals();
    });
  }

  ngOnDestroy(): void {
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
    }
  }

  loadGoals(): void {
    this.loading.set(true);
    this.error.set(null);

    const filterValue = this.filterStatus();
    const status = filterValue === 'all' ? undefined : (filterValue as 'active' | 'completed');

    this.savingsService.getSavingsGoals(status).subscribe({
      next: (response) => {
        const goalsWithProgress = response.goals.map(goal => ({
          ...goal,
          ...this.savingsService.calculateProgress(goal)
        }));
        this.goals.set(goalsWithProgress);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.message || 'Error al cargar metas de ahorro');
        this.loading.set(false);
      }
    });
  }

  changeFilter(status: 'all' | 'active' | 'completed'): void {
    this.filterStatus.set(status);
    this.loadGoals();
  }

  viewDetails(id: number): void {
    this.router.navigate(['/savings', id]);
  }

  editGoal(id: number): void {
    this.router.navigate(['/savings', 'edit', id]);
  }

  deleteGoal(goal: SavingsGoal): void {
    if (!confirm(`¿Estás seguro de eliminar la meta "${goal.name}"?`)) {
      return;
    }

    this.loading.set(true);
    this.savingsService.deleteSavingsGoal(goal.id).subscribe({
      next: () => {
        this.loadGoals();
      },
      error: (err) => {
        this.error.set(err.error?.message || 'Error al eliminar meta');
        this.loading.set(false);
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

  formatDate(date: string | null): string {
    if (!date) return 'Sin fecha límite';
    return new Date(date).toLocaleDateString('es-CL', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
}
