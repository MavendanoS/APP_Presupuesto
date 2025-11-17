/**
 * Middleware de Autenticación
 * Verificar JWT en las requests
 */

import { verifyToken } from '../utils/jwt.js';

/**
 * Middleware para verificar JWT
 * Extrae el token del header Authorization y lo verifica
 * Si es válido, agrega el payload a request.user
 */
export async function authMiddleware(request, env) {
  const authHeader = request.headers.get('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      isAuthenticated: false,
      error: 'No se proporcionó token de autenticación'
    };
  }

  const token = authHeader.substring(7); // Remover "Bearer "

  try {
    const payload = await verifyToken(token, env.JWT_SECRET);

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
