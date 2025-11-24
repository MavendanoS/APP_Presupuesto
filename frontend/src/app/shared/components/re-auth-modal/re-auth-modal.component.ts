import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { DeviceDetectionService } from '../../../core/services/device-detection.service';

/**
 * Modal de re-autenticación por inactividad
 * Solicita password al usuario para continuar usando la app
 */
@Component({
  selector: 'app-re-auth-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './re-auth-modal.component.html',
  styleUrls: ['./re-auth-modal.component.scss']
})
export class ReAuthModalComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private deviceDetection = inject(DeviceDetectionService);

  show = signal(false);
  loading = signal(false);
  errorMessage = signal<string | null>(null);

  reAuthForm: FormGroup;

  constructor() {
    this.reAuthForm = this.fb.group({
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  /**
   * Obtener usuario actual
   */
  get currentUser() {
    return this.authService.currentUser;
  }

  /**
   * Obtener label del timeout según dispositivo
   */
  get timeoutLabel(): string {
    return this.deviceDetection.getInactivityTimeoutLabel();
  }

  /**
   * Mostrar el modal
   */
  open(): void {
    this.show.set(true);
    this.reAuthForm.reset();
    this.errorMessage.set(null);
  }

  /**
   * Ocultar el modal
   */
  close(): void {
    this.show.set(false);
    this.reAuthForm.reset();
    this.errorMessage.set(null);
  }

  /**
   * Intentar re-autenticar con el password proporcionado
   */
  async onSubmit(): Promise<void> {
    if (this.reAuthForm.invalid) {
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);

    const { password } = this.reAuthForm.value;

    try {
      const success = await this.authService.reAuthenticate(password);

      if (success) {
        console.log('✅ Re-autenticación exitosa');
        this.close();
      } else {
        this.errorMessage.set('Contraseña incorrecta');
      }
    } catch (error: any) {
      console.error('❌ Error en re-autenticación:', error);
      this.errorMessage.set(error.message || 'Error al validar contraseña');
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Cerrar sesión y redirigir a login
   */
  logout(): void {
    this.close();
    this.authService.logout();
  }
}
