/**
 * Middleware de Rate Limiting
 * Protección contra ataques de fuerza bruta
 */

// Configuración
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutos
const CLEANUP_INTERVAL_MS = 60 * 1000; // Limpiar cada minuto

// Map para almacenar intentos por IP
const attemptsByIP = new Map();
let lastCleanup = Date.now();

/**
 * Limpiar entradas antiguas del Map
 */
function cleanupOldEntries() {
  const now = Date.now();

  // Solo limpiar cada minuto para no sobrecargar
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) {
    return;
  }

  lastCleanup = now;
  const cutoff = now - WINDOW_MS;

  for (const [ip, data] of attemptsByIP.entries()) {
    // Filtrar intentos antiguos
    data.attempts = data.attempts.filter(timestamp => timestamp > cutoff);

    // Si no quedan intentos, eliminar la entrada
    if (data.attempts.length === 0) {
      attemptsByIP.delete(ip);
    }
  }
}

/**
 * Obtener IP del cliente
 * Cloudflare pone la IP real en CF-Connecting-IP
 */
function getClientIP(request) {
  return request.headers.get('CF-Connecting-IP') ||
         request.headers.get('X-Forwarded-For')?.split(',')[0] ||
         'unknown';
}

/**
 * Verificar si la IP ha excedido el límite de intentos
 */
export function checkRateLimit(request) {
  const ip = getClientIP(request);
  const now = Date.now();
  const cutoff = now - WINDOW_MS;

  // Limpiar entradas antiguas periódicamente
  cleanupOldEntries();

  // Obtener o crear registro para esta IP
  let ipData = attemptsByIP.get(ip);
  if (!ipData) {
    ipData = { attempts: [] };
    attemptsByIP.set(ip, ipData);
  }

  // Filtrar intentos dentro de la ventana de tiempo
  ipData.attempts = ipData.attempts.filter(timestamp => timestamp > cutoff);

  // Verificar si se excedió el límite
  if (ipData.attempts.length >= MAX_ATTEMPTS) {
    const oldestAttempt = Math.min(...ipData.attempts);
    const retryAfter = Math.ceil((oldestAttempt + WINDOW_MS - now) / 1000);

    return {
      allowed: false,
      retryAfter,
      message: `Demasiados intentos. Intenta de nuevo en ${Math.ceil(retryAfter / 60)} minutos.`
    };
  }

  // Registrar este intento
  ipData.attempts.push(now);

  return {
    allowed: true,
    remaining: MAX_ATTEMPTS - ipData.attempts.length
  };
}

/**
 * Middleware wrapper para rutas con rate limiting
 */
export function withRateLimit(handler) {
  return async (request, env, ctx) => {
    const rateLimit = checkRateLimit(request);

    if (!rateLimit.allowed) {
      return new Response(JSON.stringify({
        error: 'Demasiados intentos',
        message: rateLimit.message,
        retryAfter: rateLimit.retryAfter
      }), {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': rateLimit.retryAfter.toString()
        }
      });
    }

    // Ejecutar el handler original
    const response = await handler(request, env, ctx);

    // Agregar headers de rate limit info
    const newResponse = new Response(response.body, response);
    newResponse.headers.set('X-RateLimit-Limit', MAX_ATTEMPTS.toString());
    newResponse.headers.set('X-RateLimit-Remaining', rateLimit.remaining.toString());

    return newResponse;
  };
}

/**
 * Resetear intentos para una IP (útil para testing o después de login exitoso)
 */
export function resetRateLimit(request) {
  const ip = getClientIP(request);
  attemptsByIP.delete(ip);
}
