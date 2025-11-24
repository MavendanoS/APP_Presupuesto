import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { AuthService } from '../core/services/auth.service';
import { UserPreferencesService } from '../core/services/user-preferences.service';

@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, TranslocoModule],
  templateUrl: './user-profile.component.html',
  styleUrl: './user-profile.component.scss'
})
export class UserProfileComponent implements OnInit {
  profileForm: FormGroup;
  passwordForm: FormGroup;
  preferencesForm: FormGroup;
  loading = signal(false);
  error = signal<string | null>(null);
  success = signal<string | null>(null);
  activeTab = signal<'profile' | 'password' | 'preferences'>('profile');
  showCurrentPassword = signal(false);
  showNewPassword = signal(false);
  showConfirmPassword = signal(false);

  private userPreferencesService = inject(UserPreferencesService);
  private translocoService = inject(TranslocoService);

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    const currentUser = this.authService.currentUser();

    this.profileForm = this.fb.group({
      name: [currentUser?.name || '', [Validators.required, Validators.minLength(3)]],
      email: [currentUser?.email || '', [Validators.required, Validators.email]]
    });

    this.passwordForm = this.fb.group({
      currentPassword: ['', [Validators.required]],
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]]
    }, {
      validators: this.passwordMatchValidator
    });

    this.preferencesForm = this.fb.group({
      language: [currentUser?.language || 'es', [Validators.required]],
      currency: [currentUser?.currency || 'CLP', [Validators.required]]
    });
  }

  ngOnInit(): void {
    // Cargar datos del usuario actual
    const user = this.authService.currentUser();
    if (user) {
      this.profileForm.patchValue({
        name: user.name,
        email: user.email
      });
      this.preferencesForm.patchValue({
        language: user.language || 'es',
        currency: user.currency || 'CLP'
      });
    }
  }

  passwordMatchValidator(group: FormGroup): { [key: string]: boolean } | null {
    const newPassword = group.get('newPassword')?.value;
    const confirmPassword = group.get('confirmPassword')?.value;

    if (newPassword !== confirmPassword) {
      return { passwordMismatch: true };
    }
    return null;
  }

  changeTab(tab: 'profile' | 'password' | 'preferences'): void {
    this.activeTab.set(tab);
    this.error.set(null);
    this.success.set(null);
  }

  togglePasswordVisibility(field: 'current' | 'new' | 'confirm'): void {
    if (field === 'current') {
      this.showCurrentPassword.set(!this.showCurrentPassword());
    } else if (field === 'new') {
      this.showNewPassword.set(!this.showNewPassword());
    } else {
      this.showConfirmPassword.set(!this.showConfirmPassword());
    }
  }

  onSubmitProfile(): void {
    if (this.profileForm.invalid) {
      return;
    }

    this.loading.set(true);
    this.error.set(null);
    this.success.set(null);

    const { name, email } = this.profileForm.value;

    this.authService.updateProfile(name, email).subscribe({
      next: (response) => {
        this.loading.set(false);
        this.success.set('Perfil actualizado correctamente');
        // El servicio ya actualiza currentUser
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.error?.message || 'Error al actualizar perfil');
      }
    });
  }

  onSubmitPassword(): void {
    if (this.passwordForm.invalid) {
      return;
    }

    this.loading.set(true);
    this.error.set(null);
    this.success.set(null);

    const { currentPassword, newPassword } = this.passwordForm.value;

    this.authService.changePassword(currentPassword, newPassword).subscribe({
      next: () => {
        this.loading.set(false);
        this.success.set('Contraseña actualizada correctamente');
        this.passwordForm.reset();
        this.showCurrentPassword.set(false);
        this.showNewPassword.set(false);
        this.showConfirmPassword.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.error?.message || 'Error al cambiar contraseña');
      }
    });
  }

  get name() {
    return this.profileForm.get('name');
  }

  get email() {
    return this.profileForm.get('email');
  }

  get currentPassword() {
    return this.passwordForm.get('currentPassword');
  }

  get newPassword() {
    return this.passwordForm.get('newPassword');
  }

  get confirmPassword() {
    return this.passwordForm.get('confirmPassword');
  }

  get passwordsMatch() {
    return !this.passwordForm.errors?.['passwordMismatch'];
  }

  async onSubmitPreferences(): Promise<void> {
    if (this.preferencesForm.invalid) {
      return;
    }

    this.loading.set(true);
    this.error.set(null);
    this.success.set(null);

    const { language, currency } = this.preferencesForm.value;

    try {
      await this.userPreferencesService.updatePreferences({ language, currency });

      // Cambiar idioma de la interfaz inmediatamente
      this.translocoService.setActiveLang(language);

      this.loading.set(false);
      this.success.set('Preferencias actualizadas correctamente');
    } catch (err: any) {
      this.loading.set(false);
      this.error.set(err?.error?.message || 'Error al actualizar preferencias');
    }
  }

  get language() {
    return this.preferencesForm.get('language');
  }

  get currency() {
    return this.preferencesForm.get('currency');
  }
}
