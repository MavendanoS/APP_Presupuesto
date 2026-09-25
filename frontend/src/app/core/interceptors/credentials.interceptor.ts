import { HttpInterceptorFn } from '@angular/common/http';

/**
 * Interceptor de Credentials
 * Agrega withCredentials: true a TODAS las requests automáticamente
 * Esto permite que las cookies HttpOnly se envíen en todas las peticiones
 */
export const credentialsInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req.clone({ withCredentials: true }));
};
