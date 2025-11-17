/**
 * Cloudflare Worker - API Backend
 * PWA de Gestión de Gastos Personales
 */

import { Router } from 'itty-router';

const router = Router();

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Manejador de OPTIONS para CORS
router.options('*', () => {
  return new Response(null, { headers: corsHeaders });
});

// Health check
router.get('/api/health', () => {
  return new Response(JSON.stringify({
    status: 'ok',
    message: 'API funcionando correctamente',
    timestamp: new Date().toISOString()
  }), {
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders
    }
  });
});

// Ruta por defecto
router.all('*', () => {
  return new Response(JSON.stringify({
    error: 'Ruta no encontrada'
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
      return await router.handle(request, env, ctx);
    } catch (error) {
      return new Response(JSON.stringify({
        error: 'Error interno del servidor',
        message: error.message
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
  }
};
