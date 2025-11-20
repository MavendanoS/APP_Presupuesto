/**
 * Rutas de Analytics y Exportación
 * /api/analytics/*
 * /api/exports/*
 */

import { Router } from 'itty-router';
import { requireAuth } from '../middleware/auth.js';
import {
  getDashboardService,
  getChartsService,
  getTrendsService,
  getPredictionsService,
  comparePeriodsService,
  exportToCSVService,
  exportToExcelService
} from '../services/analyticsService.js';

const analyticsRouter = Router({ base: '/api' });

/**
 * GET /api/analytics/dashboard
 * Obtener métricas del dashboard
 * Query params: start_date, end_date
 */
analyticsRouter.get('/analytics/dashboard', requireAuth(async (request, env) => {
  try {
    const userId = request.user.userId;
    const url = new URL(request.url);
    const filters = {
      start_date: url.searchParams.get('start_date'),
      end_date: url.searchParams.get('end_date')
    };

    const metrics = await getDashboardService(env.DB, userId, filters);

    return new Response(JSON.stringify({
      success: true,
      data: metrics
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Error al obtener métricas del dashboard',
      message: error.message
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}));

/**
 * GET /api/analytics/charts
 * Obtener datos para gráficos
 * Query params: start_date, end_date, group_by (day|week|month)
 */
analyticsRouter.get('/analytics/charts', requireAuth(async (request, env) => {
  try {
    const userId = request.user.userId;
    const url = new URL(request.url);
    const filters = {
      start_date: url.searchParams.get('start_date'),
      end_date: url.searchParams.get('end_date'),
      group_by: url.searchParams.get('group_by')
    };

    const charts = await getChartsService(env.DB, userId, filters);

    return new Response(JSON.stringify({
      success: true,
      data: charts
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Error al obtener datos de gráficos',
      message: error.message
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}));

/**
 * GET /api/analytics/trends
 * Obtener tendencias y patrones
 * Query params: periods (1-12, default 6)
 */
analyticsRouter.get('/analytics/trends', requireAuth(async (request, env) => {
  try {
    const userId = request.user.userId;
    const url = new URL(request.url);
    const filters = {
      periods: url.searchParams.get('periods')
    };

    const trends = await getTrendsService(env.DB, userId, filters);

    return new Response(JSON.stringify({
      success: true,
      data: trends
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Error al obtener tendencias',
      message: error.message
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}));

/**
 * GET /api/analytics/predictions
 * Obtener predicciones de gastos futuros
 * Query params: months_ahead (1-6, default 3)
 */
analyticsRouter.get('/analytics/predictions', requireAuth(async (request, env) => {
  try {
    const userId = request.user.userId;
    const url = new URL(request.url);
    const filters = {
      months_ahead: url.searchParams.get('months_ahead')
    };

    const predictions = await getPredictionsService(env.DB, userId, filters);

    return new Response(JSON.stringify({
      success: true,
      data: predictions
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Error al obtener predicciones',
      message: error.message
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}));

/**
 * GET /api/analytics/compare
 * Comparar dos períodos
 * Query params: period1_start, period1_end, period2_start, period2_end
 */
analyticsRouter.get('/analytics/compare', requireAuth(async (request, env) => {
  try {
    const userId = request.user.userId;
    const url = new URL(request.url);
    const filters = {
      period1_start: url.searchParams.get('period1_start'),
      period1_end: url.searchParams.get('period1_end'),
      period2_start: url.searchParams.get('period2_start'),
      period2_end: url.searchParams.get('period2_end')
    };

    const comparison = await comparePeriodsService(env.DB, userId, filters);

    return new Response(JSON.stringify({
      success: true,
      data: comparison
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Error al comparar períodos',
      message: error.message
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}));

/**
 * GET /api/exports/csv
 * Exportar datos a CSV
 * Query params: start_date, end_date, type (all|expenses|income)
 */
analyticsRouter.get('/exports/csv', requireAuth(async (request, env) => {
  try {
    const userId = request.user.userId;
    const url = new URL(request.url);
    const filters = {
      start_date: url.searchParams.get('start_date'),
      end_date: url.searchParams.get('end_date'),
      type: url.searchParams.get('type')
    };

    const result = await exportToCSVService(env.DB, userId, filters);

    return new Response(result.csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${result.filename}"`
      }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Error al exportar a CSV',
      message: error.message
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}));

/**
 * GET /api/exports/excel
 * Exportar datos a Excel
 * Query params: start_date, end_date, type (all|expenses|income)
 */
analyticsRouter.get('/exports/excel', requireAuth(async (request, env) => {
  try {
    const userId = request.user.userId;
    const url = new URL(request.url);
    const filters = {
      start_date: url.searchParams.get('start_date'),
      end_date: url.searchParams.get('end_date'),
      type: url.searchParams.get('type')
    };

    const result = await exportToExcelService(env.DB, userId, filters);

    return new Response(result.buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${result.filename}"`
      }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Error al exportar a Excel',
      message: error.message
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}));

export default analyticsRouter;
