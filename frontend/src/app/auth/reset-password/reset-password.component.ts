import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './reset-password.component.html',
  styleUrl: './reset-password.component.scss'
})
export class ResetPasswordComponent implements OnInit {
  resetPasswordForm: FormGroup;
  loading = signal(false);
  error = signal<string | null>(null);
  success = signal(false);
  token = signal<string | null>(null);
  showPassword = signal(false);
  showConfirmPassword = signal(false);

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.resetPasswordForm = this.fb.group({
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]]
    }, {
      validators: this.passwordMatchValidator
    });
  }

  ngOnInit(): void {
    // Obtener token de la URL
    this.route.queryParams.subscribe(params => {
      const token = params['token'];
      if (token) {
        this.token.set(token);
      } else {
        this.error.set('Token de recuperación no encontrado');
      }
    });
  }

  passwordMatchValidator(group: FormGroup): { [key: string]: boolean } | null {
    const password = group.get('newPassword')?.value;
    const confirmPassword = group.get('confirmPassword')?.value;

    if (password !== confirmPassword) {
      return { passwordMismatch: true };
    }
    return null;
  }

  togglePasswordVisibility(field: 'password' | 'confirm'): void {
    if (field === 'password') {
      this.showPassword.set(!this.showPassword());
    } else {
      this.showConfirmPassword.set(!this.showConfirmPassword());
    }
  }

  onSubmit(): void {
    if (this.resetPasswordForm.invalid || !this.token()) {
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    const newPassword = this.resetPasswordForm.value.newPassword;

    this.authService.resetPassword(this.token()!, newPassword).subscribe({
      next: () => {
        this.loading.set(false);
        this.success.set(true);
        // Redirigir al login después de 3 segundos
        setTimeout(() => {
          this.router.navigate(['/auth/login']);
        }, 3000);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.error?.message || 'Error al restablecer contraseña');
      }
    });
  }

  get newPassword() {
    return this.resetPasswordForm.get('newPassword');
  }

  get confirmPassword() {
    return this.resetPasswordForm.get('confirmPassword');
  }

  get passwordsMatch() {
    return !this.resetPasswordForm.errors?.['passwordMismatch'];
  }
}
