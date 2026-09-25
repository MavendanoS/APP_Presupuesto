/**
 * Cloudflare Worker - API Backend
 * PWA de seguimiento de pagos e ingresos mensuales
 */

import { Router } from 'itty-router';
import authRouter from './routes/auth.js';
import servicesRouter from './routes/services.js';
import paymentsRouter from './routes/payments.js';
import incomesRouter from './routes/incomes.js';
import indicatorsRouter from './routes/indicators.js';
import { jsonResponse } from './utils/http.js';
import { cleanupRateLimits } from './middleware/rateLimit.js';

const API_VERSION = '4.0.0';

const router = Router();

// CORS headers - Permitir credenciales (cookies)
// Orígenes permitidos para desarrollo y producción
const allowedOrigins = [
  'http://localhost:4200',
  'https://dev.app-presupuesto.pages.dev',
  'https://app-presupuesto.pages.dev'
];

// Verificar si un origen es válido (incluyendo preview deployments)
function isAllowedOrigin(origin) {
  if (!origin) return false;

  // Permitir orígenes exactos de la lista
  if (allowedOrigins.includes(origin)) return true;

  // Permitir preview deployments de Cloudflare Pages (*.app-presupuesto.pages.dev)
  return /^https:\/\/[a-zA-Z0-9-]+\.app-presupuesto\.pages\.dev$/.test(origin);
}

// Middleware para agregar CORS y cabeceras de seguridad a todas las respuestas
function addCorsHeaders(response, request) {
  const origin = request.headers.get('Origin');
  const newResponse = new Response(response.body, response);

  // Solo orígenes permitidos reciben Access-Control-Allow-Origin
  // (cookies cross-domain solo para orígenes específicos)
  if (isAllowedOrigin(origin)) {
    newResponse.headers.set('Access-Control-Allow-Origin', origin);
    newResponse.headers.set('Access-Control-Allow-Credentials', 'true');
  }

  newResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  newResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  newResponse.headers.set('Access-Control-Expose-Headers', 'Content-Disposition, Retry-After');
  newResponse.headers.set('Access-Control-Max-Age', '86400');
  newResponse.headers.append('Vary', 'Origin');
  newResponse.headers.set('X-Content-Type-Options', 'nosniff');

  return newResponse;
}

// Manejador de OPTIONS para CORS (las cabeceras se agregan en addCorsHeaders)
router.options('*', () => new Response(null, { status: 204 }));

// Health check
router.get('/api/health', (request, env) => jsonResponse({
  status: 'ok',
  message: 'API funcionando correctamente',
  environment: env.ENVIRONMENT || 'production',
  timestamp: new Date().toISOString(),
  version: API_VERSION
}));

// Rutas de autenticación
router.all('/api/auth/*', authRouter.handle);

// Rutas de servicios de pago
router.all('/api/services', servicesRouter.handle);
router.all('/api/services/*', servicesRouter.handle);

// Rutas de pagos mensuales
router.all('/api/payments', paymentsRouter.handle);
router.all('/api/payments/*', paymentsRouter.handle);

// Rutas de ingresos mensuales
router.all('/api/incomes/*', incomesRouter.handle);
router.all('/api/incomes', incomesRouter.handle);

// Rutas de indicadores económicos
router.all('/api/indicators*', indicatorsRouter.handle);

// Ruta por defecto
router.all('*', () => jsonResponse({
  error: 'Ruta no encontrada',
  message: 'El recurso solicitado no existe'
}, 404));

// Export del Worker
export default {
  async fetch(request, env, ctx) {
    // Limpieza ocasional de registros de rate limit expirados (~1% de requests)
    if (Math.random() < 0.01 && ctx?.waitUntil) {
      ctx.waitUntil(cleanupRateLimits(env.DB).catch(error =>
        console.error('Error al limpiar rate limits:', error)
      ));
    }

    try {
      const response = await router.handle(request, env, ctx);
      return addCorsHeaders(response, request);
    } catch (error) {
      console.error('Error no controlado:', error);
      const errorResponse = jsonResponse({
        error: 'Error interno del servidor',
        message: env.ENVIRONMENT === 'development' ? error.message : 'Ocurrió un error inesperado'
      }, 500);
      return addCorsHeaders(errorResponse, request);
    }
  }
};
