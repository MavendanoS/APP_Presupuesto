/**
 * Middleware de Autenticación
 * Verificar JWT en las requests
 */

import { verifyToken } from '../utils/jwt.js';
import { getUserSessionInfo } from '../db/users.js';

/**
 * Extraer token de cookies
 */
function getTokenFromCookies(request) {
  const cookieHeader = request.headers.get('Cookie');
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(';').map(c => c.trim());
  const authCookie = cookies.find(c => c.startsWith('auth_token='));

  if (!authCookie) return null;

  return authCookie.substring('auth_token='.length);
}

/**
 * Middleware para verificar JWT
 * Extrae el token de cookies o del header Authorization
 * Si es válido, agrega el payload a request.user
 */
export async function authMiddleware(request, env) {
  // Primero intentar obtener token de cookie (más seguro)
  let token = getTokenFromCookies(request);

  // Si no hay cookie, intentar con Authorization header (backwards compatibility)
  if (!token) {
    const authHeader = request.headers.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7); // Remover "Bearer "
    }
  }

  if (!token) {
    return {
      isAuthenticated: false,
      error: 'No se proporcionó token de autenticación'
    };
  }

  try {
    const payload = await verifyToken(token, env.JWT_SECRET);

    // Verificar que el usuario siga existiendo y que el token no haya sido
    // revocado por un cambio/reset de contraseña posterior a su emisión
    const session = await getUserSessionInfo(env.DB, payload.userId);
    if (!session.exists) {
      return { isAuthenticated: false, error: 'Usuario no encontrado' };
    }
    if (session.passwordChangedAt && (!payload.iat || payload.iat < session.passwordChangedAt)) {
      return { isAuthenticated: false, error: 'Sesión expirada. Inicia sesión nuevamente' };
    }

    return {
      isAuthenticated: true,
      user: payload
    };
  } catch (error) {
    return {
      isAuthenticated: false,
      error: error.message
    };
  }
}

/**
 * Wrapper para rutas protegidas
 * Verifica autenticación antes de ejecutar el handler
 */
export function requireAuth(handler) {
  return async (request, env, ctx) => {
    const auth = await authMiddleware(request, env);

    if (!auth.isAuthenticated) {
      return new Response(JSON.stringify({
        error: 'No autorizado',
        message: auth.error
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Agregar usuario al request para que el handler lo use
    request.user = auth.user;

    return handler(request, env, ctx);
  };
}
