import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { Injector, inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { TranslocoService } from '@jsverse/transloco';
import { AuthService } from '../services/auth.service';

/**
 * Error HTTP normalizado.
 * - `message`: mensaje del servidor (body.message) o un mensaje genérico traducido.
 * - `status`: código HTTP (0 si fue error de red).
 * - `error`: body original de la respuesta (`{ error, message }`), por compatibilidad.
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly error: any,
    public readonly original: HttpErrorResponse
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Endpoints de autenticación en los que un 401 NO significa "sesión expirada"
 * (credenciales incorrectas, sin sesión inicial, etc.). Para ellos solo se propaga el error.
 */
const AUTH_ENDPOINTS_WITHOUT_LOGOUT = [
  '/auth/me',
  '/auth/login',
  '/auth/re-authenticate',
  '/auth/register',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/change-password',
  '/auth/logout'
];

function isAuthEndpointWithoutLogout(url: string): boolean {
  const path = url.split('?')[0];
  return AUTH_ENDPOINTS_WITHOUT_LOGOUT.some(endpoint => path.endsWith(endpoint));
}

function extractServerMessage(error: HttpErrorResponse): string | null {
  const body = error.error;
  if (body && typeof body === 'object' && !(body instanceof ErrorEvent)) {
    if (typeof body.message === 'string' && body.message.trim()) return body.message;
    if (typeof body.error === 'string' && body.error.trim()) return body.error;
  }
  return null;
}

/**
 * Interceptor para manejar errores HTTP
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  // Inyección diferida: AuthService hace requests en su constructor y TranslocoService
  // usa HttpClient para cargar traducciones; resolverlos aquí evita dependencias circulares.
  const injector = inject(Injector);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      const transloco = injector.get(TranslocoService);
      const serverMessage = extractServerMessage(error);
      let message: string;

      if (error.error instanceof ErrorEvent || error.status === 0) {
        // Error de red / lado del cliente
        message = transloco.translate('errors.network');
      } else if (error.status === 401) {
        if (isAuthEndpointWithoutLogout(req.url)) {
          message = serverMessage || transloco.translate('errors.invalidCredentials');
        } else {
          message = transloco.translate('errors.sessionExpired');
          injector.get(AuthService).logout();
        }
      } else if (error.status === 403) {
        message = serverMessage || transloco.translate('errors.forbidden');
      } else if (error.status === 404) {
        message = serverMessage || transloco.translate('errors.notFound');
      } else if (error.status === 429) {
        message = serverMessage || transloco.translate('errors.tooManyRequests');
      } else if (error.status >= 500) {
        message = serverMessage || transloco.translate('errors.server');
      } else {
        message = serverMessage || transloco.translate('errors.unknown');
      }

      // Un 401 en /auth/me es el estado normal "sin sesión": no ensuciar la consola
      if (!(error.status === 401 && isAuthEndpointWithoutLogout(req.url))) {
        console.error('Error HTTP:', error.status, req.url, message);
      }
      return throwError(() => new ApiError(message, error.status, error.error, error));
    })
  );
};
