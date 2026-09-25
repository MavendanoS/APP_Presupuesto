import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, map, filter, take, BehaviorSubject, firstValueFrom } from 'rxjs';
import { Router } from '@angular/router';
import { TranslocoService } from '@jsverse/transloco';
import { User, LoginRequest, RegisterRequest, AuthResponse } from '../models';
import { environment } from '../../../environments/environment';
import { InactivityService } from './inactivity.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly API_URL = `${environment.apiUrl}/auth`;
  private translocoService = inject(TranslocoService);
  private inactivityService = inject(InactivityService);

  // Signals para estado reactivo
  currentUser = signal<User | null>(null);
  isAuthenticated = signal<boolean>(false);

  /** true cuando terminó la verificación inicial de sesión (/auth/me) */
  authChecked = signal<boolean>(false);
  private authChecked$ = new BehaviorSubject<boolean>(false);
  private loggingOut = false;

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    // Verificar si hay sesión activa (cookie)
    this.checkAuthStatus();
  }

  /**
   * Emite (una sola vez) el estado de autenticación cuando la verificación inicial terminó.
   */
  whenReady(): Observable<boolean> {
    return this.authChecked$.pipe(
      filter(Boolean),
      take(1),
      map(() => this.isAuthenticated())
    );
  }

  private markAuthChecked(): void {
    if (!this.authChecked()) {
      this.authChecked.set(true);
      this.authChecked$.next(true);
    }
  }

  /**
   * Verificar si el usuario está autenticado (la cookie se envía automáticamente).
   * Un 401 aquí solo significa "sin sesión": no se navega a ningún lado.
   */
  private checkAuthStatus(): void {
    this.getCurrentUser().subscribe({
      next: () => this.markAuthChecked(),
      error: () => {
        // No hay sesión activa, esto es normal en la primera carga
        this.currentUser.set(null);
        this.isAuthenticated.set(false);
        this.markAuthChecked();
      }
    });
  }

  /**
   * Aplicar la preferencia de idioma del usuario a Transloco
   */
  private applyUserLanguagePreference(user: User): void {
    if (user.language) {
      this.translocoService.setActiveLang(user.language);
    }
  }

  /**
   * Establecer sesión tras login/registro exitoso
   */
  private setSession(user: User): void {
    // Sesión nueva: reiniciar el contador de inactividad para no pedir re-auth inmediatamente
    this.inactivityService.resetTimer();
    this.currentUser.set(user);
    this.isAuthenticated.set(true);
    this.markAuthChecked();
    this.applyUserLanguagePreference(user);
  }

  /**
   * Registrar nuevo usuario
   */
  register(data: RegisterRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.API_URL}/register`, data, {
      withCredentials: true // Importante: enviar y recibir cookies
    }).pipe(
      tap(response => {
        if (response.success) {
          this.setSession(response.data.user);
        }
      })
    );
  }

  /**
   * Login de usuario
   */
  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.API_URL}/login`, credentials, {
      withCredentials: true // Importante: enviar y recibir cookies
    }).pipe(
      tap(response => {
        if (response.success) {
          this.setSession(response.data.user);
        }
      })
    );
  }

  /**
   * Obtener usuario actual
   */
  getCurrentUser(): Observable<User> {
    return this.http.get<{ success: boolean; data: { user: User } }>(`${this.API_URL}/me`, {
      withCredentials: true // Enviar cookie con la petición
    }).pipe(
      tap(response => {
        if (response.success) {
          this.currentUser.set(response.data.user);
          this.isAuthenticated.set(true);
          // Aplicar preferencia de idioma del usuario
          this.applyUserLanguagePreference(response.data.user);
        }
      }),
      // Extraer solo el usuario
      map(response => response.data.user)
    );
  }

  /**
   * Logout - llama al backend para limpiar la cookie
   */
  logout(): void {
    // Evitar logouts duplicados (ej: varias requests paralelas que reciben 401)
    if (this.loggingOut) return;
    this.loggingOut = true;

    this.http.post(`${this.API_URL}/logout`, {}, {
      withCredentials: true // Enviar cookie para que el backend la pueda limpiar
    }).subscribe({
      next: () => {
        this.clearUserData();
      },
      error: () => {
        // Incluso si falla, limpiar el estado local
        this.clearUserData();
      }
    });
  }

  /**
   * Limpiar datos del usuario
   * (el service worker no cachea respuestas de la API, así que no hay datos que purgar)
   */
  private clearUserData(): void {
    this.loggingOut = false;
    this.currentUser.set(null);
    this.isAuthenticated.set(false);

    this.router.navigate(['/auth/login']);
  }

  /**
   * Solicitar recuperación de contraseña
   */
  forgotPassword(email: string): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(
      `${this.API_URL}/forgot-password`,
      { email }
    );
  }

  /**
   * Restablecer contraseña con token
   */
  resetPassword(token: string, newPassword: string): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(
      `${this.API_URL}/reset-password`,
      { token, newPassword }
    );
  }

  /**
   * Actualizar perfil de usuario.
   * Si el email cambia, el backend exige la contraseña actual.
   */
  updateProfile(
    name: string,
    email: string,
    currentPassword?: string
  ): Observable<{ success: boolean; data: { user: User } }> {
    const body: { name: string; email: string; currentPassword?: string } = { name, email };
    if (currentPassword) {
      body.currentPassword = currentPassword;
    }
    return this.http.put<{ success: boolean; data: { user: User } }>(
      `${this.API_URL}/profile`,
      body,
      { withCredentials: true }
    ).pipe(
      tap(response => {
        if (response.success) {
          this.currentUser.set(response.data.user);
        }
      })
    );
  }

  /**
   * Cambiar contraseña
   */
  changePassword(currentPassword: string, newPassword: string): Observable<{ success: boolean; message: string }> {
    return this.http.put<{ success: boolean; message: string }>(
      `${this.API_URL}/change-password`,
      { currentPassword, newPassword },
      { withCredentials: true }
    );
  }

  /**
   * Re-autenticar usuario después de inactividad
   * Valida la contraseña sin cerrar la sesión actual.
   * - Retorna true si la contraseña es correcta.
   * - Retorna false si la contraseña es incorrecta (401).
   * - Lanza el error en otros casos (red, rate limit, servidor) para que la UI lo muestre.
   */
  async reAuthenticate(password: string): Promise<boolean> {
    try {
      const response = await firstValueFrom(
        this.http.post<{ success: boolean; message?: string }>(
          `${this.API_URL}/re-authenticate`,
          { password },
          { withCredentials: true }
        )
      );
      return response?.success ?? false;
    } catch (error: any) {
      if (error?.status === 401) {
        return false;
      }
      throw error;
    }
  }
}
