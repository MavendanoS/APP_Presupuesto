/**
 * Cloudflare Worker - API Backend
 * PWA de Gestión de Gastos Personales
 */

import { Router } from 'itty-router';
import authRouter from './routes/auth.js';
import expensesRouter from './routes/expenses.js';
import incomeRouter from './routes/income.js';
import categoriesRouter from './routes/categories.js';
import analyticsRouter from './routes/analytics.js';

const router = Router();

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Middleware para agregar CORS a todas las respuestas
function addCorsHeaders(response) {
  const newResponse = new Response(response.body, response);
  Object.keys(corsHeaders).forEach(key => {
    newResponse.headers.set(key, corsHeaders[key]);
  });
  return newResponse;
}

// Manejador de OPTIONS para CORS
router.options('*', () => {
  return new Response(null, { headers: corsHeaders });
});

// Health check
router.get('/api/health', () => {
  return new Response(JSON.stringify({
    status: 'ok',
    message: 'API funcionando correctamente',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  }), {
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders
    }
  });
});

// Rutas de autenticación
router.all('/api/auth/*', authRouter.handle);

// Rutas de gastos
router.all('/api/expenses/*', expensesRouter.handle);

// Rutas de ingresos
router.all('/api/income/*', incomeRouter.handle);

// Rutas de categorías
router.all('/api/categories/*', categoriesRouter.handle);

// Rutas de analytics y exportación
router.all('/api/analytics/*', analyticsRouter.handle);
router.all('/api/exports/*', analyticsRouter.handle);

// Ruta por defecto
router.all('*', () => {
  return new Response(JSON.stringify({
    error: 'Ruta no encontrada',
    availableRoutes: [
      'GET /api/health',
      'POST /api/auth/register',
      'POST /api/auth/login',
      'GET /api/auth/me',
      'GET /api/expenses',
      'POST /api/expenses',
      'GET /api/expenses/summary',
      'GET /api/expenses/:id',
      'PUT /api/expenses/:id',
      'DELETE /api/expenses/:id',
      'GET /api/income',
      'POST /api/income',
      'GET /api/income/summary',
      'GET /api/income/recurring',
      'GET /api/income/:id',
      'PUT /api/income/:id',
      'DELETE /api/income/:id',
      'GET /api/categories',
      'POST /api/categories',
      'GET /api/categories/stats',
      'GET /api/categories/:id',
      'PUT /api/categories/:id',
      'DELETE /api/categories/:id',
      'GET /api/analytics/dashboard',
      'GET /api/analytics/charts',
      'GET /api/analytics/trends',
      'GET /api/analytics/predictions',
      'GET /api/analytics/compare',
      'GET /api/exports/csv',
      'GET /api/exports/excel'
    ]
  }), {
    status: 404,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders
    }
  });
});

// Export del Worker
export default {
  async fetch(request, env, ctx) {
    try {
      const response = await router.handle(request, env, ctx);
      return addCorsHeaders(response);
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
      return addCorsHeaders(errorResponse);
    }
  }
};
