/**
 * Middleware de Rate Limiting
 * Protección contra ataques de fuerza bruta.
 *
 * Los contadores se guardan en D1 (tabla rate_limits) para que el límite se
 * comparta entre todas las instancias del Worker. Ventana fija por bucket + IP.
 */

import { jsonResponse } from '../utils/http.js';

// Configuración por defecto
const DEFAULT_MAX_ATTEMPTS = 5;
const DEFAULT_WINDOW_SECONDS = 15 * 60; // 15 minutos

/**
 * Obtener IP del cliente
 * Cloudflare pone la IP real en CF-Connecting-IP (no se confía en X-Forwarded-For)
 */
function getClientIP(request) {
  return request.headers.get('CF-Connecting-IP') || 'unknown';
}

function rateLimitKey(bucket, request) {
  return `${bucket}:${getClientIP(request)}`;
}

/**
 * Registrar un intento y verificar si se excedió el límite
 * @returns {Promise<{allowed: boolean, remaining: number, retryAfter: number}>}
 */
export async function checkRateLimit(db, key, maxAttempts, windowSeconds) {
  const now = Math.floor(Date.now() / 1000);

  // Upsert atómico: reinicia la ventana si expiró, si no incrementa el contador
  const row = await db.prepare(`
    INSERT INTO rate_limits (key, window_start, count)
    VALUES (?1, ?2, 1)
    ON CONFLICT(key) DO UPDATE SET
      count = CASE WHEN rate_limits.window_start <= ?2 - ?3 THEN 1 ELSE rate_limits.count + 1 END,
      window_start = CASE WHEN rate_limits.window_start <= ?2 - ?3 THEN ?2 ELSE rate_limits.window_start END
    RETURNING count, window_start
  `).bind(key, now, windowSeconds).first();

  const count = row?.count ?? 1;
  const windowStart = row?.window_start ?? now;
  const retryAfter = Math.max(1, windowStart + windowSeconds - now);

  return {
    allowed: count <= maxAttempts,
    remaining: Math.max(0, maxAttempts - count),
    retryAfter
  };
}

/**
 * Middleware wrapper para rutas con rate limiting
 * @param {string} bucket - Nombre del límite (ej: 'login'); cada bucket cuenta por separado
 * @param {Function} handler
 * @param {Object} options - { maxAttempts?, windowSeconds? }
 */
export function withRateLimit(bucket, handler, options = {}) {
  const maxAttempts = options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  const windowSeconds = options.windowSeconds ?? DEFAULT_WINDOW_SECONDS;

  return async (request, env, ctx) => {
    let rateLimit;
    try {
      rateLimit = await checkRateLimit(env.DB, rateLimitKey(bucket, request), maxAttempts, windowSeconds);
    } catch (error) {
      // Si falla el almacenamiento del límite, no bloquear el servicio
      console.error('Error en rate limiting:', error);
      return handler(request, env, ctx);
    }

    if (!rateLimit.allowed) {
      const minutes = Math.ceil(rateLimit.retryAfter / 60);
      return jsonResponse({
        error: 'Demasiados intentos',
        message: `Demasiados intentos. Intenta de nuevo en ${minutes} minuto${minutes === 1 ? '' : 's'}.`
      }, 429, { 'Retry-After': rateLimit.retryAfter.toString() });
    }

    // Ejecutar el handler original
    const response = await handler(request, env, ctx);

    // Agregar headers de rate limit info
    const newResponse = new Response(response.body, response);
    newResponse.headers.set('X-RateLimit-Limit', maxAttempts.toString());
    newResponse.headers.set('X-RateLimit-Remaining', rateLimit.remaining.toString());

    return newResponse;
  };
}

/**
 * Resetear intentos de un bucket para la IP actual (ej: después de login exitoso)
 */
export async function resetRateLimit(db, bucket, request) {
  try {
    await db.prepare('DELETE FROM rate_limits WHERE key = ?')
      .bind(rateLimitKey(bucket, request))
      .run();
  } catch (error) {
    console.error('Error al resetear rate limit:', error);
  }
}

/**
 * Eliminar registros expirados (llamado ocasionalmente, sin bloquear la respuesta)
 */
export async function cleanupRateLimits(db, maxAgeSeconds = 24 * 60 * 60) {
  const cutoff = Math.floor(Date.now() / 1000) - maxAgeSeconds;
  await db.prepare('DELETE FROM rate_limits WHERE window_start < ?').bind(cutoff).run();
}
