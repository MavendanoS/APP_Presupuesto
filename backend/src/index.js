/**
 * Cloudflare Worker - API Backend
 * PWA de Gestión de Gastos Personales
 */

import { Router } from 'itty-router';
import authRouter from './routes/auth.js';

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

// Ruta por defecto
router.all('*', () => {
  return new Response(JSON.stringify({
    error: 'Ruta no encontrada',
    availableRoutes: [
      'GET /api/health',
      'POST /api/auth/register',
      'POST /api/auth/login',
      'GET /api/auth/me'
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
