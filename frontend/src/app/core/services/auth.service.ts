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
        this.currentUser.set(null);
        this.isAuthenticated.set(false);
        this.router.navigate(['/auth/login']);
      },
      error: () => {
        // Incluso si falla, limpiar el estado local
        this.currentUser.set(null);
        this.isAuthenticated.set(false);
        this.router.navigate(['/auth/login']);
      }
    });
  }
}
