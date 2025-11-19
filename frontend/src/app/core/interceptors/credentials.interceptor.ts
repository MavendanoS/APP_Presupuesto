import { HttpInterceptorFn } from '@angular/common/http';

/**
 * Interceptor de Credentials
 * Agrega withCredentials: true a TODAS las requests automáticamente
 * Esto permite que las cookies HttpOnly se envíen en todas las peticiones
 */
export const credentialsInterceptor: HttpInterceptorFn = (req, next) => {
  // Clonar la request y agregar withCredentials: true
  const clonedReq = req.clone({
    withCredentials: true
  });

  // Debug: log para verificar que withCredentials está activado
  console.log(`[Credentials Interceptor] ${req.method} ${req.url}`, {
    withCredentials: clonedReq.withCredentials,
    headers: clonedReq.headers.keys()
  });

  return next(clonedReq);
};
