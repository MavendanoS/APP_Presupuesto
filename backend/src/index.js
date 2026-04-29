/**
 * Cloudflare Worker - API Backend
 * PWA de Gestión de Gastos Personales
 */

import { Router } from 'itty-router';
import authRouter from './routes/auth.js';
import servicesRouter from './routes/services.js';
import paymentsRouter from './routes/payments.js';
import incomesRouter from './routes/incomes.js';
import indicatorsRouter from './routes/indicators.js';

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
  if (origin.match(/^https:\/\/[a-zA-Z0-9-]+\.app-presupuesto\.pages\.dev$/)) {
    return true;
  }

  return false;
}

// Middleware para agregar CORS a todas las respuestas
function addCorsHeaders(response, request) {
  const origin = request.headers.get('Origin');
  const newResponse = new Response(response.body, response);

  // Si el origin es válido, usarlo
  // Esto permite cookies cross-domain para orígenes específicos
  if (isAllowedOrigin(origin)) {
    newResponse.headers.set('Access-Control-Allow-Origin', origin);
  } else {
    // Fallback al primero de la lista
    newResponse.headers.set('Access-Control-Allow-Origin', allowedOrigins[0]);
  }

  newResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  newResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  newResponse.headers.set('Access-Control-Allow-Credentials', 'true');
  newResponse.headers.set('Access-Control-Expose-Headers', 'Content-Disposition');

  return newResponse;
}

// Manejador de OPTIONS para CORS
router.options('*', (request) => {
  const origin = request.headers.get('Origin');
  const headers = {
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Expose-Headers': 'Content-Disposition',
  };

  if (isAllowedOrigin(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  } else {
    headers['Access-Control-Allow-Origin'] = allowedOrigins[0];
  }

  return new Response(null, { headers });
});

// Health check
router.get('/api/health', (request) => {
  const origin = request.headers.get('Origin');
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
  };

  if (isAllowedOrigin(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  } else {
    headers['Access-Control-Allow-Origin'] = allowedOrigins[0];
  }

  return new Response(JSON.stringify({
    status: 'ok',
    message: 'API funcionando correctamente',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  }), { headers });
});

// Rutas de autenticación
router.all('/api/auth/*', authRouter.handle);

// Rutas de servicios de pago
router.all('/api/services/*', servicesRouter.handle);

// Rutas de pagos mensuales
router.all('/api/payments/*', paymentsRouter.handle);

// Rutas de ingresos mensuales
router.all('/api/incomes/*', incomesRouter.handle);
router.all('/api/incomes', incomesRouter.handle);

// Rutas de indicadores económicos
router.all('/api/indicators*', indicatorsRouter.handle);

// Ruta por defecto
router.all('*', (request) => {
  const origin = request.headers.get('Origin');
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
  };

  if (allowedOrigins.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  } else {
    headers['Access-Control-Allow-Origin'] = allowedOrigins[0];
  }

  return new Response(JSON.stringify({
    error: 'Ruta no encontrada',
    availableRoutes: [
      'GET /api/health',
      'POST /api/auth/register',
      'POST /api/auth/login',
      'GET /api/auth/me',
      'GET /api/services',
      'POST /api/services',
      'PUT /api/services/reorder',
      'GET /api/services/:id',
      'PUT /api/services/:id',
      'DELETE /api/services/:id',
      'GET /api/payments/checklist',
      'GET /api/payments/history',
      'GET /api/payments/averages',
      'GET /api/payments/budget',
      'POST /api/payments',
      'DELETE /api/payments/:id',
      'GET /api/incomes/monthly',
      'GET /api/incomes/history',
      'GET /api/incomes/totals-by-month',
      'GET /api/incomes/:id',
      'POST /api/incomes',
      'PUT /api/incomes/:id',
      'DELETE /api/incomes/:id',
      'GET /api/indicators'
    ]
  }), {
    status: 404,
    headers
  });
});

// Export del Worker
export default {
  async fetch(request, env, ctx) {
    try {
      const response = await router.handle(request, env, ctx);
      return addCorsHeaders(response, request);
    } catch (error) {
      const errorResponse = new Response(JSON.stringify({
        error: 'Error interno del servidor',
        message: error.message,
        stack: env.ENVIRONMENT === 'development' ? error.stack : undefined
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      });
      return addCorsHeaders(errorResponse, request);
    }
  }
};
