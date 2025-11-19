import { HttpInterceptorFn } from '@angular/common/http';

/**
 * Interceptor de autenticación
 * Las cookies HttpOnly se envían automáticamente con withCredentials: true
 * No se requiere lógica adicional
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // Las cookies HttpOnly se envían automáticamente
  // No necesitamos agregar headers manualmente
  return next(req);
};
