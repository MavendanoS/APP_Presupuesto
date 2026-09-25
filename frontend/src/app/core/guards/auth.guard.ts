import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from '../services/auth.service';

/**
 * Guard para proteger rutas que requieren autenticación.
 * Espera a que termine la verificación inicial de sesión antes de decidir.
 */
export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.whenReady().pipe(
    map(isAuthenticated =>
      isAuthenticated
        ? true
        : router.createUrlTree(['/auth/login'], { queryParams: { returnUrl: state.url } })
    )
  );
};

/**
 * Guard para rutas públicas (solo accesibles sin autenticación)
 * Ej: login, register
 */
export const publicGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.whenReady().pipe(
    map(isAuthenticated => (isAuthenticated ? router.createUrlTree(['/dashboard']) : true))
  );
};
