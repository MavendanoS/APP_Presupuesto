import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { AuthService } from '../../core/services/auth.service';
import { APP_VERSION } from '../../core/version';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, TranslocoPipe],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  private route = inject(ActivatedRoute);
  private transloco = inject(TranslocoService);

  loginForm: FormGroup;
  loading = signal(false);
  errorMessage = signal<string | null>(null);
  appVersion = APP_VERSION;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  onSubmit(): void {
    if (this.loginForm.valid && !this.loading()) {
      this.loading.set(true);
      this.errorMessage.set(null);

      const credentials = this.loginForm.value;

      this.authService.login(credentials).subscribe({
        next: () => {
          this.loading.set(false);
          this.router.navigateByUrl(this.getSafeReturnUrl());
        },
        error: (error) => {
          this.errorMessage.set(error?.message || this.transloco.translate('errors.loginFailed'));
          this.loading.set(false);
        }
      });
    }
  }

  /**
   * Solo permite rutas internas relativas ('/algo'), nunca '//host' ni URLs absolutas.
   */
  private getSafeReturnUrl(): string {
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    if (
      returnUrl &&
      returnUrl.startsWith('/') &&
      !returnUrl.startsWith('//') &&
      !returnUrl.startsWith('/\\') &&
      !returnUrl.startsWith('/auth')
    ) {
      return returnUrl;
    }
    return '/dashboard';
  }

  get email() {
    return this.loginForm.get('email');
  }

  get password() {
    return this.loginForm.get('password');
  }
}
