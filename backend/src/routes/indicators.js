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
 * Usa caché en D1 para mostrar valores del día anterior si la API falla
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

    // Guardar en caché para uso futuro
    if (indicators.dolar) {
      await env.DB.prepare(`
        INSERT INTO indicators_cache (indicator_name, value, fecha, updated_at)
        VALUES (?, ?, ?, unixepoch())
        ON CONFLICT(indicator_name) DO UPDATE SET
          value = excluded.value,
          fecha = excluded.fecha,
          updated_at = excluded.updated_at
      `).bind('dolar', indicators.dolar.valor, indicators.dolar.fecha).run();
    }

    if (indicators.uf) {
      await env.DB.prepare(`
        INSERT INTO indicators_cache (indicator_name, value, fecha, updated_at)
        VALUES (?, ?, ?, unixepoch())
        ON CONFLICT(indicator_name) DO UPDATE SET
          value = excluded.value,
          fecha = excluded.fecha,
          updated_at = excluded.updated_at
      `).bind('uf', indicators.uf.valor, indicators.uf.fecha).run();
    }

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

    // Si es timeout o error de red, usar valores cacheados del día anterior
    if (error.name === 'AbortError' || error.message.includes('fetch')) {
      console.log('⚠️ Timeout o error de red - usando valores cacheados');

      try {
        // Obtener valores del caché
        const cachedDolar = await env.DB.prepare(`
          SELECT value, fecha FROM indicators_cache WHERE indicator_name = ?
        `).bind('dolar').first();

        const cachedUF = await env.DB.prepare(`
          SELECT value, fecha FROM indicators_cache WHERE indicator_name = ?
        `).bind('uf').first();

        if (cachedDolar || cachedUF) {
          return new Response(JSON.stringify({
            success: true,
            data: {
              dolar: cachedDolar ? { valor: cachedDolar.value, fecha: cachedDolar.fecha } : null,
              uf: cachedUF ? { valor: cachedUF.value, fecha: cachedUF.fecha } : null
            },
            cached: true // Indica que son valores cacheados
          }), {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
              'Cache-Control': 'public, max-age=300' // Cache solo 5 minutos
            }
          });
        }
      } catch (cacheError) {
        console.error('❌ Error al obtener valores del caché:', cacheError);
      }
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
