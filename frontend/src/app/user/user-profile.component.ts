import { Component, OnInit, signal, inject, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
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

  /** true cuando el email del formulario difiere del actual (requiere contraseña actual) */
  emailChanged = signal(false);

  private userPreferencesService = inject(UserPreferencesService);
  private translocoService = inject(TranslocoService);
  private destroyRef = inject(DestroyRef);

  constructor(
    private fb: FormBuilder,
    private authService: AuthService
  ) {
    const currentUser = this.authService.currentUser();

    this.profileForm = this.fb.group({
      name: [currentUser?.name || '', [Validators.required, Validators.minLength(3)]],
      email: [currentUser?.email || '', [Validators.required, Validators.email]],
      currentPassword: ['']
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

    // Si el email cambia, el backend exige la contraseña actual
    this.profileForm.get('email')!.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.updateEmailChangedState());
  }

  private updateEmailChangedState(): void {
    const currentEmail = (this.authService.currentUser()?.email || '').trim().toLowerCase();
    const formEmail = String(this.profileForm.get('email')?.value || '').trim().toLowerCase();
    const changed = formEmail !== currentEmail;
    this.emailChanged.set(changed);

    const passwordControl = this.profileForm.get('currentPassword')!;
    if (changed) {
      passwordControl.setValidators([Validators.required]);
    } else {
      passwordControl.clearValidators();
      passwordControl.setValue('', { emitEvent: false });
    }
    passwordControl.updateValueAndValidity({ emitEvent: false });
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

    const { name, email, currentPassword } = this.profileForm.value;

    this.authService.updateProfile(name, email, this.emailChanged() ? currentPassword : undefined).subscribe({
      next: () => {
        this.loading.set(false);
        this.success.set(this.translocoService.translate('profile.profileUpdated'));
        // El servicio ya actualiza currentUser; el email guardado pasa a ser el actual
        this.updateEmailChangedState();
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.message || this.translocoService.translate('messages.updateError'));
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
        this.success.set(this.translocoService.translate('profile.passwordUpdated'));
        this.passwordForm.reset();
        this.showCurrentPassword.set(false);
        this.showNewPassword.set(false);
        this.showConfirmPassword.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.message || this.translocoService.translate('messages.updateError'));
      }
    });
  }

  get name() {
    return this.profileForm.get('name');
  }

  get email() {
    return this.profileForm.get('email');
  }

  get profileCurrentPassword() {
    return this.profileForm.get('currentPassword');
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
      this.success.set(this.translocoService.translate('profile.preferencesUpdated'));
    } catch (err: any) {
      this.loading.set(false);
      this.error.set(err?.message || this.translocoService.translate('messages.updateError'));
    }
  }

  get language() {
    return this.preferencesForm.get('language');
  }

  get currency() {
    return this.preferencesForm.get('currency');
  }
}
