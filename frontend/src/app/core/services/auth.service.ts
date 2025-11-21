import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, map, BehaviorSubject } from 'rxjs';
import { Router } from '@angular/router';
import { User, LoginRequest, RegisterRequest, AuthResponse } from '../models';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly API_URL = `${environment.apiUrl}/auth`;

  // Signals para estado reactivo
  currentUser = signal<User | null>(null);
  isAuthenticated = signal<boolean>(false);

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    // Verificar si hay sesión activa (cookie)
    this.checkAuthStatus();
  }

  /**
   * Verificar si el usuario está autenticado (la cookie se envía automáticamente)
   */
  private checkAuthStatus(): void {
    // Intentar obtener el usuario actual
    // Si hay una cookie válida, el backend la validará
    this.getCurrentUser().subscribe({
      next: (user) => {
        this.currentUser.set(user);
        this.isAuthenticated.set(true);
      },
      error: () => {
        // No hay sesión activa, esto es normal en la primera carga
        this.currentUser.set(null);
        this.isAuthenticated.set(false);
      }
    });
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
          // La cookie se configura automáticamente desde el backend
          this.currentUser.set(response.data.user);
          this.isAuthenticated.set(true);
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
          // Limpiar caché del service worker antes de establecer el nuevo usuario
          if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({
              action: 'clearCache'
            });
          }

          // La cookie se configura automáticamente desde el backend
          this.currentUser.set(response.data.user);
          this.isAuthenticated.set(true);
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
   * Limpiar datos del usuario y caché del service worker
   */
  private clearUserData(): void {
    this.currentUser.set(null);
    this.isAuthenticated.set(false);

    // Limpiar caché del service worker si está disponible
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        action: 'clearCache'
      });
    }

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
   * Actualizar perfil de usuario
   */
  updateProfile(name: string, email: string): Observable<{ success: boolean; data: { user: User } }> {
    return this.http.put<{ success: boolean; data: { user: User } }>(
      `${this.API_URL}/profile`,
      { name, email },
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
}
