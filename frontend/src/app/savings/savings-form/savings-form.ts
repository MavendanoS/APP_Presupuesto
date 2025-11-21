import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { SavingsService } from '../../core/services/savings.service';

@Component({
  selector: 'app-savings-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NavbarComponent],
  templateUrl: './savings-form.html',
  styleUrl: './savings-form.scss'
})
export class SavingsFormComponent implements OnInit {
  form: FormGroup;
  loading = signal(false);
  error = signal<string | null>(null);
  isEditMode = signal(false);
  goalId: number | null = null;

  colors = [
    { value: '#3B82F6', label: 'Azul' },
    { value: '#10B981', label: 'Verde' },
    { value: '#F59E0B', label: 'Naranja' },
    { value: '#EF4444', label: 'Rojo' },
    { value: '#8B5CF6', label: 'Morado' },
    { value: '#EC4899', label: 'Rosa' }
  ];

  icons = [
    { value: 'piggy-bank', label: 'Alcancía' },
    { value: 'house', label: 'Casa' },
    { value: 'car-front', label: 'Auto' },
    { value: 'airplane', label: 'Viaje' },
    { value: 'gift', label: 'Regalo' },
    { value: 'laptop', label: 'Tecnología' },
    { value: 'heart', label: 'Salud' },
    { value: 'mortarboard', label: 'Educación' }
  ];

  constructor(
    private fb: FormBuilder,
    private savingsService: SavingsService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(100)]],
      target_amount: [0, [Validators.required, Validators.min(1)]],
      deadline: [''],
      description: ['', Validators.maxLength(500)],
      color: ['#3B82F6'],
      icon: ['piggy-bank']
    });
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode.set(true);
      this.goalId = parseInt(id);
      this.loadGoal();
    }
  }

  loadGoal(): void {
    if (!this.goalId) return;

    this.loading.set(true);
    this.savingsService.getSavingsGoalById(this.goalId).subscribe({
      next: (response) => {
        const goal = response.goal;
        this.form.patchValue({
          name: goal.name,
          target_amount: goal.target_amount,
          deadline: goal.deadline || '',
          description: goal.description,
          color: goal.color,
          icon: goal.icon
        });
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.message || 'Error al cargar meta');
        this.loading.set(false);
      }
    });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    const data = {
      ...this.form.value,
      deadline: this.form.value.deadline || null
    };

    const request = this.isEditMode()
      ? this.savingsService.updateSavingsGoal(this.goalId!, data)
      : this.savingsService.createSavingsGoal(data);

    request.subscribe({
      next: () => {
        this.router.navigate(['/savings']);
      },
      error: (err) => {
        this.error.set(err.error?.message || 'Error al guardar meta');
        this.loading.set(false);
      }
    });
  }

  cancel(): void {
    this.router.navigate(['/savings']);
  }
}
