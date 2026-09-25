/**
 * Rutas de Indicadores Económicos
 * /api/indicators/*
 */

import { Router } from 'itty-router';
import { jsonResponse } from '../utils/http.js';

const indicatorsRouter = Router({ base: '/api/indicators' });

const API_URL = 'https://mindicador.cl/api';
const FETCH_TIMEOUT_MS = 10000;
// Si el caché tiene menos de 30 minutos, se sirve sin consultar la API externa
const CACHE_FRESH_SECONDS = 30 * 60;

async function readCache(db) {
  const { results } = await db.prepare(`
    SELECT indicator_name, value, fecha, updated_at
    FROM indicators_cache
    WHERE indicator_name IN ('dolar', 'uf')
  `).all();

  const byName = Object.fromEntries((results || []).map(row => [row.indicator_name, row]));
  const toIndicator = row => row ? { valor: row.value, fecha: row.fecha } : null;
  const updatedAt = Math.min(...(results || []).map(row => row.updated_at || 0), Infinity);

  return {
    data: { dolar: toIndicator(byName.dolar), uf: toIndicator(byName.uf) },
    updatedAt: Number.isFinite(updatedAt) ? updatedAt : 0,
    hasData: !!(byName.dolar || byName.uf)
  };
}

async function writeCache(db, indicators) {
  const upsert = db.prepare(`
    INSERT INTO indicators_cache (indicator_name, value, fecha, updated_at)
    VALUES (?, ?, ?, unixepoch())
    ON CONFLICT(indicator_name) DO UPDATE SET
      value = excluded.value,
      fecha = excluded.fecha,
      updated_at = excluded.updated_at
  `);

  const statements = ['dolar', 'uf']
    .filter(name => indicators[name])
    .map(name => upsert.bind(name, indicators[name].valor, indicators[name].fecha));

  if (statements.length > 0) {
    await db.batch(statements);
  }
}

async function fetchIndicators() {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(API_URL, {
      headers: { 'User-Agent': 'APP-Presupuesto/4.0' },
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`API externa respondió con status ${response.status}`);
    }

    const data = await response.json();

    // Extraer solo dólar y UF con redondeo
    return {
      dolar: data.dolar ? { valor: Math.round(data.dolar.valor), fecha: data.dolar.fecha } : null,
      uf: data.uf ? { valor: Math.round(data.uf.valor), fecha: data.uf.fecha } : null
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * GET /api/indicators
 * Obtener indicadores económicos (Dólar y UF) desde mindicador.cl
 * Proxy para evitar problemas de CORS en el frontend.
 * Sirve desde caché D1 si está fresco; si la API externa falla por cualquier
 * motivo, devuelve el último valor cacheado.
 */
indicatorsRouter.get('/', async (request, env, ctx) => {
  let cache = null;

  try {
    cache = await readCache(env.DB);
    const ageSeconds = Math.floor(Date.now() / 1000) - cache.updatedAt;

    if (cache.hasData && ageSeconds < CACHE_FRESH_SECONDS) {
      return jsonResponse(
        { success: true, data: cache.data },
        200,
        { 'Cache-Control': `public, max-age=${CACHE_FRESH_SECONDS - ageSeconds}` }
      );
    }
  } catch (error) {
    console.error('Error al leer caché de indicadores:', error);
  }

  try {
    const indicators = await fetchIndicators();

    const writing = writeCache(env.DB, indicators).catch(error =>
      console.error('Error al guardar caché de indicadores:', error)
    );
    if (ctx?.waitUntil) ctx.waitUntil(writing); else await writing;

    return jsonResponse(
      { success: true, data: indicators },
      200,
      { 'Cache-Control': 'public, max-age=1800' } // Cache 30 minutos
    );
  } catch (error) {
    console.error('Error al obtener indicadores económicos:', error);

    // Cualquier fallo externo: usar valores cacheados si existen
    if (cache?.hasData) {
      return jsonResponse(
        { success: true, data: cache.data, cached: true },
        200,
        { 'Cache-Control': 'public, max-age=300' } // Cache solo 5 minutos
      );
    }

    return jsonResponse({
      error: 'Error al obtener indicadores económicos',
      message: 'Indicadores no disponibles en este momento'
    }, 503);
  }
});

export default indicatorsRouter;
