/**
 * Rutas de Indicadores Económicos
 * /api/indicators/*
 */

import { Router } from 'itty-router';

const indicatorsRouter = Router({ base: '/api/indicators' });

/**
 * GET /api/indicators
 * Obtener indicadores económicos (Dólar y UF) desde mindicador.cl
 * Proxy para evitar problemas de CORS en el frontend
 */
indicatorsRouter.get('/', async (request, env) => {
  try {
    const API_URL = 'https://mindicador.cl/api';

    // Hacer request a la API externa con timeout de 10 segundos
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(API_URL, {
      headers: {
        'User-Agent': 'APP-Presupuesto/1.0',
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`API externa respondió con status ${response.status}`);
    }

    const data = await response.json();

    // Extraer solo dólar y UF con redondeo
    const indicators = {
      dolar: data.dolar ? {
        valor: Math.round(data.dolar.valor),
        fecha: data.dolar.fecha
      } : null,
      uf: data.uf ? {
        valor: Math.round(data.uf.valor),
        fecha: data.uf.fecha
      } : null
    };

    return new Response(JSON.stringify({
      success: true,
      data: indicators
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=1800' // Cache 30 minutos
      }
    });

  } catch (error) {
    console.error('❌ Error al obtener indicadores económicos:', error);

    // Si es timeout o error de red, retornar valores por defecto
    if (error.name === 'AbortError' || error.message.includes('fetch')) {
      console.log('⚠️ Timeout o error de red - usando valores por defecto');

      return new Response(JSON.stringify({
        success: true,
        data: {
          dolar: { valor: 950, fecha: new Date().toISOString() }, // Valor aproximado
          uf: { valor: 39000, fecha: new Date().toISOString() }   // Valor aproximado
        },
        fallback: true // Indica que son valores de respaldo
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=300' // Cache solo 5 minutos
        }
      });
    }

    return new Response(JSON.stringify({
      error: 'Error al obtener indicadores económicos',
      message: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});

export default indicatorsRouter;
